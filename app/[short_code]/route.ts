import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ short_code: string }> }
) {
  const { short_code } = await params;

  // ponytail: build the redirect URL from the forwarded host so the
  // client lands back on the public domain (request.url inside the
  // standalone runtime resolves to 0.0.0.0, which would loop).
  const publicHost =
    _request.headers.get('x-forwarded-host') ?? _request.headers.get('host') ?? '';
  const publicProto =
    _request.headers.get('x-forwarded-proto') ??
    (publicHost.startsWith('localhost') || publicHost.startsWith('127.') ? 'http' : 'https');
  const publicOrigin = publicHost ? `${publicProto}://${publicHost}` : new URL(_request.url).origin;

  if (!short_code || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/not-found', publicOrigin));
  }

  const { data, error } = await supabase
    .from('urls')
    .select('id, original_url, expires_at')
    .eq('short_code', short_code)
    .maybeSingle();

  if (error || !data || !data.original_url) {
    return NextResponse.redirect(new URL('/not-found', publicOrigin));
  }

  // Check TTL Expiration
  if (data.expires_at) {
    const expiresTime = new Date(data.expires_at).getTime();
    if (expiresTime < Date.now()) {
      return NextResponse.redirect(new URL(`/expired?code=${short_code}`, publicOrigin));
    }
  }

  // ponytail: fire-and-forget click increment via the atomic RPC.
  // The SQL function does `clicks = clicks + 1` server-side, so there's
  // no read-modify-write race. Failure is logged, not fatal — clicks
  // are best-effort telemetry.
  void supabase.rpc('increment_url_clicks', { row_id: data.id }).then(
    ({ error: rpcError }: { error: unknown }) => {
      if (rpcError) console.error('increment_url_clicks failed:', rpcError);
    }
  );

  return NextResponse.redirect(data.original_url, { status: 302 });
}
