import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(_request: NextRequest) {
  const res = NextResponse.next();

  // ponytail: minimal security headers. Pendekin is a plain content
  // site (HTML/JS, no third-party embeds), so a tight baseline is
  // safe. Upgrade to a per-route CSP if you start embedding widgets.
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return res;
}

export default proxy;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
