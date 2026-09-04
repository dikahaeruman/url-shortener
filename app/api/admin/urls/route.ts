import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { maybeCleanupExpired } from '@/lib/cleanup';

function getClientIp(request: Request): string {
  // ponytail: trust x-real-ip (set by NPM/nginx from $remote_addr) over
  // x-forwarded-for — the client can forge the first XFF entry and
  // rotate it to bypass per-IP rate limits.
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

function getAdminKey(): string | null {
  const key = process.env.ADMIN_SECRET_KEY;
  if (!key || key === 'pendekin-admin-2026') {
    // ponytail: refuse the documented dev fallback in production. In dev
    // (NODE_ENV !== production) we still allow the local default so
    // `bun dev` works without a `.env` file.
    if (process.env.NODE_ENV === 'production') return null;
    return key || 'pendekin-admin-2026';
  }
  return key;
}

function verifyAdmin(request: Request): boolean {
  const expectedKey = getAdminKey();
  if (!expectedKey) return false;

  const adminKey = request.headers.get('x-admin-key');
  if (!adminKey || typeof adminKey !== 'string') return false;

  const a = Buffer.from(adminKey);
  const b = Buffer.from(expectedKey);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  try {
    // ponytail: rate limit on admin reads too — same bucket as writes
    // would let an attacker DoS the bucket cheaply with admin calls.
    // Use a separate per-IP cap here. Key gate is the first line of
    // defense; this is the second.
    if (!rateLimit(getClientIp(request), 'admin', 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
    }

    // ponytail: lazy cleanup — runs at most once per 30 days across
    // the process, in the background so it doesn't add latency.
    maybeCleanupExpired().catch(() => {});

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase credentials missing.' }, { status: 500 });
    }

    // ponytail: page-based pagination. range() is Supabase's stdlib
    // way to do LIMIT/OFFSET (no extra dep). Total is a separate
    // count-only query so the page shape stays stable when filters
    // change. Capped at 100 — anything bigger is a UX bug, not a
    // pagination need.
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const rawSize = parseInt(searchParams.get('pageSize') ?? '25', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize = Math.min(100, Math.max(1, Number.isFinite(rawSize) ? rawSize : 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { count: total, error: countError } = await supabase
      .from('urls')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Supabase error counting admin URLs:', countError);
      return NextResponse.json({ error: 'Failed to fetch admin URLs.' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('urls')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase error fetching admin URLs:', error);
      return NextResponse.json({ error: 'Failed to fetch admin URLs.' }, { status: 500 });
    }

    // ponytail: stats are computed via a Postgres count(*) grouped by
    // active/expired, in a single round-trip. Avoids fetching every
    // row just to count clicks and expiry.
    const { data: statsRows, error: statsError } = await supabase.rpc('admin_url_stats');

    let totalClicks = 0;
    let expiredUrls = 0;
    const totalUrls = total ?? 0;

    if (statsError) {
      // ponytail: if the RPC is missing, fall back to scanning the
      // current page. Stats will be wrong for the full table but the
      // admin still loads.
      console.error('admin_url_stats RPC missing, falling back to page scan:', statsError);
      const urls = (data as UrlRecord[]) || [];
      const now = Date.now();
      totalClicks = urls.reduce((sum, u) => sum + (u.clicks || 0), 0);
      expiredUrls = urls.filter((u) => u.expires_at && new Date(u.expires_at).getTime() < now).length;
    } else if (statsRows && statsRows[0]) {
      const s = statsRows[0] as { total: number; clicks: number; expired: number };
      totalClicks = Number(s.clicks) || 0;
      expiredUrls = Number(s.expired) || 0;
    }

    return NextResponse.json({
      urls: (data as UrlRecord[]) || [],
      page,
      pageSize,
      total: totalUrls,
      stats: {
        totalUrls,
        totalClicks,
        activeUrls: totalUrls - expiredUrls,
        expiredUrls,
      },
    });
  } catch (err) {
    console.error('Unexpected error in admin GET API:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!rateLimit(getClientIp(request), 'admin', 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase credentials missing.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Link ID parameter is required.' }, { status: 400 });
    }

    // ponytail: use the SECURITY DEFINER admin_delete_url RPC because
    // the urls table has no DELETE RLS policy (publishable key is
    // safe-by-default). The RPC bypasses RLS so the admin endpoint
    // can actually delete; the admin gate (verifyAdmin above) is the
    // real authorization. Without this, DELETE silently matched 0
    // rows because of RLS, but the supabase-js chain raises on the
    // server error and bubbles up as a 500.
    const { data, error } = await supabase.rpc('admin_delete_url', { p_id: id });

    if (error) {
      console.error('Supabase error deleting link in admin API:', error);
      return NextResponse.json({ error: 'Failed to delete URL from database.' }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    const deleted = Number(row?.deleted ?? 0);
    if (deleted === 0) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Unexpected error in admin DELETE API:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
