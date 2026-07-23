import dns from 'node:dns';
import { isBlockedHostname, normalizeUrl, type SafetyResult } from './utils';

/**
 * Server-only URL safety check. Performs string-based checks then
 * resolves DNS to defeat hostname-to-private-IP rebinding attacks.
 *
 * Lives in its own file so the `node:dns` import never enters the
 * client bundle when other helpers (generateShortCode, etc.) are used
 * from a client component.
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
    return {
      safe: false,
      error: 'Internal, loopback, or link-local addresses cannot be shortened.',
    };
  }

  try {
    const { address } = await dns.promises.lookup(hostname, { all: false });
    if (isBlockedHostname(address)) {
      return { safe: false, error: 'Hostname resolves to a blocked address.' };
    }
  } catch {
    return { safe: false, error: 'Hostname could not be resolved.' };
  }

  return { safe: true, normalizedUrl: normalized };
}
