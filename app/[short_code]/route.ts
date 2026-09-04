import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { validateUrlSafety } from '@/lib/url-safety-server';
import { isBlockedHostname, getSafePublicOrigin, getClientIp, logSecurityEvent } from '@/lib/utils';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ short_code: string }> }
) {
  const { short_code } = await params;
  const publicOrigin = getSafePublicOrigin(_request);
  const clientIp = getClientIp(_request);

  // Rate limit on redirects: 120 req/min per IP to prevent DB connection exhaustion
  if (!rateLimit(clientIp, 'redirect_get', 120, 60_000)) {
    logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: clientIp,
      status: 'blocked',
      detail: 'Redirect rate limit exceeded',
    });
    return new NextResponse('Too many requests. Please try again later.', { status: 429 });
  }

  // Validate short code format before DB query
  if (
    !short_code ||
    typeof short_code !== 'string' ||
    short_code.length > 64 ||
    !/^[a-zA-Z0-9_.-]+$/.test(short_code) ||
    !isSupabaseConfigured()
  ) {
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
      return NextResponse.redirect(
        new URL(`/expired?code=${encodeURIComponent(short_code)}`, publicOrigin)
      );
    }
  }

  // Synchronous protocol & loopback guard
  try {
    const parsed = new URL(data.original_url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.redirect(new URL('/not-found', publicOrigin));
    }
    if (isBlockedHostname(parsed.hostname.toLowerCase())) {
      logSecurityEvent({
        action: 'SSRF_BLOCKED',
        ip: clientIp,
        status: 'blocked',
        detail: `Redirect blocked for private hostname: ${parsed.hostname}`,
      });
      return NextResponse.redirect(new URL('/not-found', publicOrigin));
    }
  } catch {
    return NextResponse.redirect(new URL('/not-found', publicOrigin));
  }

  // ponytail: resolve through the same safety gate as /api/shorten so a
  // link that was valid at creation can't be pointed at a private/blocked
  // address after the fact (DNS rebinding on redirect). Non-blocking —
  // clicks are best-effort telemetry.
  void validateUrlSafety(data.original_url)
    .then((check) => {
      if (!check.safe || !check.normalizedUrl) {
        console.error('redirect blocked unsafe target:', data.original_url);
        return;
      }
      return supabase.rpc('increment_url_clicks', { row_id: data.id }).then(
        ({ error: rpcError }: { error: unknown }) => {
          if (rpcError) console.error('increment_url_clicks failed:', rpcError);
        }
      );
    })
    .catch((err: unknown) => console.error('redirect safety check failed:', err));

  const response = NextResponse.redirect(data.original_url, { status: 302 });
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
