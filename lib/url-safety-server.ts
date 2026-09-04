import dns from 'node:dns';
import { isBlockedHostname, normalizeUrl, logSecurityEvent, type SafetyResult } from './utils';

const MAX_TITLE_BYTES = 64 * 1024; // ponytail: cap the title HTML fetch

/**
 * Server-only URL safety check. Performs string-based checks then
 * resolves DNS to defeat hostname-to-private-IP rebinding attacks.
 *
 * Lives in its own file so the `node:dns` import never enters the
 * client bundle when other helpers (generateShortCode, etc.) are used
 * from a client component.
 */

/** Resolve all IP records for a hostname, ensuring ALL are public, or null. */
export async function resolvePublicIp(hostname: string): Promise<string | null> {
  try {
    if (isBlockedHostname(hostname)) return null;

    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) return null;

    // Reject if ANY returned address is internal or blocked (SSRF & DNS rebinding protection)
    for (const entry of addresses) {
      if (isBlockedHostname(entry.address)) {
        return null;
      }
    }

    // Prefer IPv4 if available, otherwise IPv6
    const ipv4 = addresses.find((a) => a.family === 4);
    return ipv4 ? ipv4.address : addresses[0].address;
  } catch {
    return null;
  }
}

/** GET the first N bytes of a URL's body, with a total response-size cap. */
export async function fetchWithBodyLimit(urlString: string, maxBytes: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(urlString, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PendekinBot/1.0; +https://pendekin.andhikadev.my.id)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Fetch and parse the <title> / og:title of a target URL.
 *
 * Security: validates the URL (public host, safe IP), then fetches
 * with a `Host` header so the connection goes to the *validated*
 * address and a rebinding attacker cannot swap in a private IP after
 * the check. Response size is capped.
 */
export async function fetchTargetTitleSafe(urlString: string): Promise<string | null> {
  const normalized = normalizeUrl(urlString);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostname(hostname)) return null;

  const ip = await resolvePublicIp(hostname);
  if (!ip) return null;

  // ponytail: connect to the validated IP, keep the real host for TLS
  // SNI + Host header so virtual-host routing still works. Redirects
  // are re-validated recursively (5 max) before being followed.
  let target: URL = new URL(normalized);
  let hops = 0;
  for (;;) {
    const ipForHost = await resolvePublicIp(target.hostname);
    if (!ipForHost) return null;
    const targetIp = new URL(target.toString());
    targetIp.hostname = ipForHost;

    const res = await fetch(targetIp.toString(), {
      signal: AbortSignal.timeout(3000),
      redirect: 'manual',
      headers: {
        Host: target.host,
        'User-Agent': 'Mozilla/5.0 (compatible; PendekinBot/1.0; +https://pendekin.andhikadev.my.id)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc || hops++ >= 5) return null;
      try {
        target = new URL(loc, target);
      } catch {
        return null;
      }
      if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
      if (isBlockedHostname(target.hostname.toLowerCase())) return null;
      continue;
    }

    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_TITLE_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString('utf8');

    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1] : null;

    if (!title) {
      const ogMatch = text.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      title = ogMatch ? ogMatch[1] : null;
    }

    if (!title) return null;

    const decoded = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF\u202A-\u202E]/g, '')
      .trim();

    return decoded.length > 100 ? `${decoded.substring(0, 97)}...` : decoded;
  }
}

/**
 * Validate a URL for storage. Resolves the hostname to a public IP to
 * defeat hostname-to-private-IP rebinding, then re-validates the
 * resolved address.
 */
export async function validateUrlSafety(
  urlString: string,
  currentHost?: string
): Promise<SafetyResult> {
  if (!urlString || typeof urlString !== 'string') {
    return { safe: false, error: 'URL parameter is required.' };
  }

  const normalized = normalizeUrl(urlString);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { safe: false, error: 'Please enter a valid HTTP or HTTPS URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safe: false,
      error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS URLs are allowed.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (currentHost) {
    const cleanCurrentHost = currentHost.split(':')[0].toLowerCase();
    if (hostname === cleanCurrentHost || hostname.endsWith(`.${cleanCurrentHost}`)) {
      return {
        safe: false,
        error: 'Cannot shorten URLs originating from this domain to prevent infinite redirection loops.',
      };
    }
  }

  if (isBlockedHostname(hostname)) {
    logSecurityEvent({
      action: 'SSRF_BLOCKED',
      status: 'blocked',
      detail: `Blocked internal or private hostname: ${hostname}`,
    });
    return {
      safe: false,
      error: 'Internal, loopback, or link-local addresses cannot be shortened.',
    };
  }

  const ip = await resolvePublicIp(hostname);
  if (!ip) {
    logSecurityEvent({
      action: 'DNS_RESOLVE_FAILED_OR_BLOCKED',
      status: 'blocked',
      detail: `Hostname could not be resolved to safe public IP: ${hostname}`,
    });
    return { safe: false, error: 'Hostname could not be resolved.' };
  }

  return { safe: true, normalizedUrl: normalized };
}

/**
 * Google Safe Browsing v4 threatMatches lookup (phishing/malware gate).
 *
 * Fail-open by design: without GOOGLE_SAFE_BROWSING_API_KEY, or on any
 * network/API error, the URL is allowed through and the error is logged
 * — the service must never hard-fail because Google is unreachable.
 * Flagged URLs are rejected at creation time so abuse like phishing
 * short links is stopped before it goes live.
 */
export async function checkSafeBrowsing(url: string): Promise<SafetyResult> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return { safe: true };

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'pendekin', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      }
    );

    if (!res.ok) {
      console.error('Safe Browsing API error:', res.status);
      return { safe: true };
    }

    const data = (await res.json()) as { matches?: unknown[] };
    if (Array.isArray(data.matches) && data.matches.length > 0) {
      logSecurityEvent({
        action: 'SAFE_BROWSING_BLOCKED',
        status: 'blocked',
        detail: `URL flagged by Google Safe Browsing: ${url}`,
      });
      return {
        safe: false,
        error: 'URL is flagged by Google Safe Browsing and cannot be shortened.',
      };
    }
    return { safe: true };
  } catch (err) {
    console.error('Safe Browsing check failed (fail-open):', err);
    return { safe: true };
  }
}

