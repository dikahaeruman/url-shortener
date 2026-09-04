import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { maybeCleanupExpired } from '@/lib/cleanup';
import { getClientIp, isValidRecordId, logSecurityEvent } from '@/lib/utils';

function getAdminKey(): string | null {
  const key = process.env.ADMIN_SECRET_KEY;
  if (!key || key === 'pendekin-admin-2026') {
    // ponytail: refuse the documented dev fallback in production. In dev
    // (NODE_ENV !== production) we still allow the local default so
    // `bun dev` works without a `.env` file.
    if (process.env.NODE_ENV === 'production') return null;
    return key || 'pendekin-admin-2026';
  }
  if (process.env.NODE_ENV === 'production' && key.length < 16) {
    console.error('CRITICAL: ADMIN_SECRET_KEY must be at least 16 characters in production.');
    return null;
  }
  return key;
}

function verifyAdmin(request: Request): boolean {
  const expectedKey = getAdminKey();
  if (!expectedKey) return false;

  const adminKey = request.headers.get('x-admin-key');
  if (!adminKey || typeof adminKey !== 'string') return false;

  // OWASP A02: SHA-256 fixed-length buffers eliminate timing side-channels and length leaks
  const hashA = crypto.createHash('sha256').update(adminKey).digest();
  const hashB = crypto.createHash('sha256').update(expectedKey).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

function checkAdminAuth(request: Request, clientIp: string): { ok: true } | { ok: false; response: NextResponse } {
  // 1. General admin rate limit per IP
  if (!rateLimit(clientIp, 'admin', 30, 60_000)) {
    logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: clientIp,
      status: 'blocked',
      detail: 'Admin general rate limit exceeded',
    });
    return { ok: false, response: NextResponse.json({ error: 'Too many requests.' }, { status: 429 }) };
  }

  // 2. Verify key
  if (!verifyAdmin(request)) {
    // Only consume failure tokens when authentication actually fails
    const notLocked = rateLimit(clientIp, 'admin_auth_failures', 10, 300_000);
    logSecurityEvent({
      action: 'ADMIN_AUTH_FAILED',
      ip: clientIp,
      status: 'blocked',
      detail: notLocked ? 'Unauthorized admin access attempt' : 'Admin brute-force threshold exceeded (locked)',
    });

    if (!notLocked) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Too many failed login attempts. Please try again in 5 minutes.' },
          { status: 429 }
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 }),
    };
  }

  return { ok: true };
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const auth = checkAdminAuth(request, clientIp);
    if (!auth.ok) return auth.response;

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
    const clientIp = getClientIp(request);
    const auth = checkAdminAuth(request, clientIp);
    if (!auth.ok) return auth.response;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase credentials missing.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || !isValidRecordId(id)) {
      return NextResponse.json({ error: 'Valid link ID parameter is required.' }, { status: 400 });
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

    logSecurityEvent({
      action: 'ADMIN_DELETE_URL',
      ip: clientIp,
      status: 'allowed',
      detail: `Admin deleted URL record id ${id}`,
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Unexpected error in admin DELETE API:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
