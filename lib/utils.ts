export interface SafetyResult {
  safe: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Generates a random alphanumeric short code.
 * @param length Length of the generated code (default: 6)
 */
export function generateShortCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Validates whether a given string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes input URL by adding https:// if protocol is omitted.
 */
export function normalizeUrl(urlString: string): string {
  let trimmed = urlString.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Returns Google Favicon service URL for a given webpage URL.
 */
export function getFaviconUrl(urlString: string): string {
  try {
    const parsed = new URL(normalizeUrl(urlString));
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=google.com&sz=64';
  }
}

/**
 * Pure host/IP classification — safe in client bundles.
 * Server-side `validateUrlSafety` in url-safety-server.ts layers DNS
 * resolution on top to catch hostname-to-private-IP rebinding.
 */
export function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().split('%')[0];

  if (h === 'localhost' || h === '0.0.0.0' || h === '::' || h === '[::]') return true;
  if (h === '::1' || h === '[::1]') return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0) return true;
    if (a >= 224) return true;
  }

  if (h.includes(':')) {
    const expanded = expandIpv6(h);
    if (expanded === '00000000000000000000000000000001') return true;
    if (/^fc[0-9a-f]{2}/i.test(expanded.slice(0, 4))) return true;
    if (/^fe[89ab][0-9a-f]/i.test(expanded.slice(0, 4))) return true;   // fe80::/10 link-local
    if (/^ff/i.test(expanded.slice(0, 2))) return true;
    if (expanded.startsWith('00000000000000000000ffff')) {
      const last = expanded.slice(32);
      const v4 = `${parseInt(last.slice(0, 2), 16)}.${parseInt(last.slice(2, 4), 16)}.${parseInt(last.slice(4, 6), 16)}.${parseInt(last.slice(6, 8), 16)}`;
      return isBlockedHostname(v4);
    }
  }

  return false;
}

function expandIpv6(h: string): string {
  const stripped = h.replace(/^\[|\]$/g, '');
  const parts = stripped.split('::');
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts[1] ? parts[1].split(':') : [];
  const fill = 8 - head.length - tail.length;
  if (parts.length === 1) {
    return head.map((p) => p.padStart(4, '0')).join('').padEnd(32, '0');
  }
  const middle = fill > 0 ? Array(fill).fill('0000') : [];
  return [...head, ...middle, ...tail].map((p) => p.padStart(4, '0')).join('').padEnd(32, '0');
}

/**
 * Comprehensive URL Safety & Self-Loop Validation (client-safe, sync).
 *
 * Server-side callers should use `validateUrlSafety` from
 * `./url-safety-server` which adds DNS resolution to defeat rebinding.
 */
export function validateUrlSafety(
  urlString: string,
  currentHost?: string
): { safe: boolean; error?: string; normalizedUrl?: string } {
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

  // 3. Localhost & Private IP SSRF Protection (string check only)
  // Server-side resolver adds DNS check; see lib/url-safety-server.ts
  if (isBlockedHostname(hostname)) {
    return {
      safe: false,
      error: 'Internal, loopback, or link-local addresses cannot be shortened.',
    };
  }

  return { safe: true, normalizedUrl: normalized };
}

/**
 * Fetches the HTML title (<title> or og:title) of a target URL with a fast 3-second timeout.
 */
export async function fetchTargetTitle(urlString: string): Promise<string | null> {
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

    if (!res.ok) return null;

    const text = await res.text();

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
      .trim();

    return decoded.length > 100 ? `${decoded.substring(0, 97)}...` : decoded;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

const RESERVED_WORDS = new Set([
  'api',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'admin',
  'dashboard',
  'login',
  'settings',
]);

/**
 * Validates custom short code format and reserved keywords.
 */
export function isValidCustomCode(code: string): { valid: boolean; error?: string } {
  const trimmed = code.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Custom short code must be at least 3 characters long.' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Custom short code must not exceed 30 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Custom short code can only contain letters, numbers, hyphens (-), and underscores (_).',
    };
  }
  if (RESERVED_WORDS.has(trimmed.toLowerCase())) {
    return { valid: false, error: `"${trimmed}" is a reserved code and cannot be used.` };
  }
  return { valid: true };
}

const CLIENT_ID_KEY = 'minify_client_id';

/**
 * Retrieves or creates a unique persistent client ID for the browser.
 */
export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}
