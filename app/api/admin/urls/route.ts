import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase credentials missing.' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('urls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching admin URLs:', error);
      return NextResponse.json({ error: 'Failed to fetch admin URLs.' }, { status: 500 });
    }

    const urls = (data as UrlRecord[]) || [];
    const now = Date.now();

    const totalUrls = urls.length;
    const totalClicks = urls.reduce((sum, u) => sum + (u.clicks || 0), 0);
    const expiredUrls = urls.filter((u) => u.expires_at && new Date(u.expires_at).getTime() < now).length;
    const activeUrls = totalUrls - expiredUrls;

    return NextResponse.json({
      urls,
      stats: {
        totalUrls,
        totalClicks,
        activeUrls,
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

    const { error } = await supabase.from('urls').delete().eq('id', id);

    if (error) {
      console.error('Supabase error deleting link in admin API:', error);
      return NextResponse.json({ error: 'Failed to delete URL from database.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Unexpected error in admin DELETE API:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
