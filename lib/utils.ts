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
 * @param urlString The input URL string
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
 * @param urlString The input URL string
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
 * Comprehensive URL Safety & Self-Loop Validation.
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

  // 1. Strict Scheme Check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safe: false,
      error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS URLs are allowed.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Self-Loop Protection
  if (currentHost) {
    const cleanCurrentHost = currentHost.split(':')[0].toLowerCase();
    if (hostname === cleanCurrentHost || hostname.endsWith(`.${cleanCurrentHost}`)) {
      return {
        safe: false,
        error: 'Cannot shorten URLs originating from this domain to prevent infinite redirection loops.',
      };
    }
  }

  // Common production domain checks
  if (hostname.includes('andhikadev.my.id') || hostname.includes('pendekin')) {
    return {
      safe: false,
      error: 'Cannot shorten URLs originating from this domain to prevent infinite redirection loops.',
    };
  }

  // 3. Localhost & Private IP SSRF Protection
  const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);
  if (BLOCKED_HOSTS.has(hostname)) {
    return {
      safe: false,
      error: 'Loopback and localhost addresses cannot be shortened.',
    };
  }

  // Private IPv4 Range Checks (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
  const isPrivateIp =
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

  if (isPrivateIp) {
    return {
      safe: false,
      error: 'Internal private IP addresses cannot be shortened.',
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

    // Match <title>...</title>
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1] : null;

    // Fallback to og:title
    if (!title) {
      const ogMatch = text.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      title = ogMatch ? ogMatch[1] : null;
    }

    if (!title) return null;

    // Decode HTML entities
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
