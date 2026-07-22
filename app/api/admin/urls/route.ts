import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';

function verifyAdmin(request: Request): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'pendekin-admin-2026';
  return Boolean(adminKey && adminKey === expectedKey);
}

export async function GET(request: Request) {
  try {
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
