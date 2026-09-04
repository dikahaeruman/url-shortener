export interface SafetyResult {
  safe: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Generates a cryptographically secure random alphanumeric short code using CSPRNG.
 * @param length Length of the generated code (default: 6)
 */
export function generateShortCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const validLength = Math.max(1, Math.min(64, length));

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    let result = '';
    const buffer = new Uint8Array(validLength * 2);
    let bufIndex = buffer.length;

    while (result.length < validLength) {
      if (bufIndex >= buffer.length) {
        crypto.getRandomValues(buffer);
        bufIndex = 0;
      }
      const byte = buffer[bufIndex++];
      // 248 is largest multiple of 62 (chars.length) below 256, eliminating modulo bias
      if (byte < 248) {
        result += chars[byte % 62];
      }
    }
    return result;
  }

  let result = '';
  for (let i = 0; i < validLength; i++) {
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

function stripHost(host: string): string {
  const h = host.toLowerCase().trim().split('%')[0];
  if (h.startsWith('[')) {
    const m = /^\[([^\]]+)\](?::\d+)?$/.exec(h);
    return m ? m[1] : h.replace(/^\[|\]$/g, '');
  }
  if ((h.match(/:/g) || []).length > 1) {
    return h;
  }
  return h.split(':')[0];
}

function parseIpv4Parts(str: string): [number, number, number, number] | null {
  if (/^0x[0-9a-f]+$/i.test(str)) {
    const num = parseInt(str, 16);
    if (num >= 0 && num <= 0xffffffff) {
      return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff];
    }
  }
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    if (num >= 0 && num <= 0xffffffff) {
      return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff];
    }
  }
  const parts = str.split('.');
  if (parts.length < 1 || parts.length > 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^(0x[0-9a-f]+|0[0-7]*|\d+)$/i.test(p)) return null;
    const n =
      p.startsWith('0x') || p.startsWith('0X')
        ? parseInt(p, 16)
        : p.length > 1 && p.startsWith('0')
        ? parseInt(p, 8)
        : parseInt(p, 10);
    if (isNaN(n) || n < 0) return null;
    nums.push(n);
  }
  if (nums.length === 4) {
    if (nums.some((n) => n > 255)) return null;
    return [nums[0], nums[1], nums[2], nums[3]];
  }
  if (nums.length === 1) {
    if (nums[0] > 0xffffffff) return null;
    const n = nums[0];
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  }
  if (nums.length === 2) {
    if (nums[0] > 255 || nums[1] > 0xffffff) return null;
    return [nums[0], (nums[1] >>> 16) & 0xff, (nums[1] >>> 8) & 0xff, nums[1] & 0xff];
  }
  if (nums.length === 3) {
    if (nums[0] > 255 || nums[1] > 255 || nums[2] > 0xffff) return null;
    return [nums[0], nums[1], (nums[2] >>> 8) & 0xff, nums[2] & 0xff];
  }
  return null;
}

function isBlockedIpv4(o1: number, o2: number, o3: number, _o4: number): boolean {
  if (o1 === 0) return true; // 0.0.0.0/8 (Current network)
  if (o1 === 10) return true; // 10.0.0.0/8 (Private-Use)
  if (o1 === 127) return true; // 127.0.0.0/8 (Loopback)
  if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16 (Link-Local / Cloud Metadata)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12 (Private-Use)
  if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16 (Private-Use)
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true; // 100.64.0.0/10 (Carrier-Grade NAT)
  if (o1 === 192 && o2 === 0 && o3 === 0) return true; // 192.0.0.0/24 (IETF Protocol Assignments)
  if (o1 === 192 && o2 === 0 && o3 === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (o1 === 192 && o2 === 88 && o3 === 99) return true; // 192.88.99.0/24 (6to4 Relay Anycast)
  if (o1 === 198 && (o2 === 18 || o2 === 19)) return true; // 198.18.0.0/15 (Network Benchmark)
  if (o1 === 198 && o2 === 51 && o3 === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (o1 === 203 && o2 === 0 && o3 === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (o1 >= 224) return true; // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved/Broadcast
  return false;
}

function parseIpv6Words(ip: string): number[] | null {
  const str = ip.replace(/^\[|\]$/g, '').toLowerCase().split('%')[0];
  const parts = str.split('::');
  if (parts.length > 2) return null;

  function parseSegment(seg: string): number[] | null {
    if (!seg) return [];
    const tokens = seg.split(':');
    const words: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok.includes('.')) {
        const v4 = parseIpv4Parts(tok);
        if (!v4) return null;
        words.push((v4[0] << 8) | v4[1]);
        words.push((v4[2] << 8) | v4[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(tok)) return null;
        words.push(parseInt(tok, 16));
      }
    }
    return words;
  }

  const left = parseSegment(parts[0]);
  if (!left) return null;
  if (parts.length === 1) {
    return left.length === 8 ? left : null;
  }
  const right = parseSegment(parts[1]);
  if (!right) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  return [...left, ...Array(missing).fill(0), ...right];
}

function checkIpv6Words(words: number[]): boolean {
  const [w0, w1, w2, w3, w4, w5, w6, w7] = words;
  if (words.every((w) => w === 0)) return true; // :: (Unspecified)
  if (w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0 && w4 === 0 && w5 === 0 && w6 === 0 && w7 === 1) {
    return true; // ::1 (Loopback)
  }
  if ((w0 & 0xfe00) === 0xfc00) return true; // fc00::/7 (Unique Local Address, covers both fc00.. and fd00..)
  if ((w0 & 0xffc0) === 0xfe80) return true; // fe80::/10 (Link-Local Unicast)
  if ((w0 & 0xff00) === 0xff00) return true; // ff00::/8 (Multicast)
  if (w0 === 0x0100 && w1 === 0 && w2 === 0 && w3 === 0) return true; // 100::/64 (Discard Prefix)
  if (w0 === 0x2001 && w1 === 0x0db8) return true; // 2001:db8::/32 (Documentation)
  if (w0 === 0x2001 && (w1 & 0xfff0) === 0x0020) return true; // 2001:20::/28 (ORCHIDv2)

  // IPv4-mapped (::ffff:x.x.x.x)
  if (w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0 && w4 === 0 && w5 === 0xffff) {
    return isBlockedIpv4((w6 >> 8) & 0xff, w6 & 0xff, (w7 >> 8) & 0xff, w7 & 0xff);
  }
  // IPv4-translated (::ffff:0:x.x.x.x)
  if (w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0 && w4 === 0xffff && w5 === 0) {
    return isBlockedIpv4((w6 >> 8) & 0xff, w6 & 0xff, (w7 >> 8) & 0xff, w7 & 0xff);
  }
  // 64:ff9b::/96 (Well-known NAT64)
  if (w0 === 0x0064 && w1 === 0xff9b && w2 === 0 && w3 === 0 && w4 === 0 && w5 === 0) {
    return isBlockedIpv4((w6 >> 8) & 0xff, w6 & 0xff, (w7 >> 8) & 0xff, w7 & 0xff);
  }
  // 2002::/16 (6to4, embeds IPv4 in w1 and w2)
  if (w0 === 0x2002) {
    return isBlockedIpv4((w1 >> 8) & 0xff, w1 & 0xff, (w2 >> 8) & 0xff, w2 & 0xff);
  }
  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '::',
  '[::]',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  '169.254.169.254',
  '100.100.100.200',
]);

const BLOCKED_DOMAIN_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.home',
  '.home.arpa',
  '.corp',
  '.test',
];

/**
 * Pure host/IP classification — safe in client bundles.
 * Server-side `validateUrlSafety` in url-safety-server.ts layers DNS
 * resolution on top to catch hostname-to-private-IP rebinding.
 */
export function isBlockedHostname(host: string): boolean {
  const h = stripHost(host);

  if (!h || BLOCKED_HOSTNAMES.has(h)) return true;
  for (const suffix of BLOCKED_DOMAIN_SUFFIXES) {
    if (h.endsWith(suffix)) return true;
  }

  // Check IPv4
  const v4Parts = parseIpv4Parts(h);
  if (v4Parts) {
    return isBlockedIpv4(v4Parts[0], v4Parts[1], v4Parts[2], v4Parts[3]);
  }

  // Check IPv6
  if (h.includes(':')) {
    const words = parseIpv6Words(h);
    if (words) {
      return checkIpv6Words(words);
    }
    return true;
  }

  return false;
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validates whether an ID is a safe database record ID (standard UUID or alphanumeric ID).
 */
export function isValidRecordId(id: unknown): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed) || SAFE_ID_REGEX.test(trimmed);
}

const CLIENT_ID_REGEX = /^[a-zA-Z0-9_.-]{3,64}$/;

/**
 * Validates client ID format to prevent header/query pollution and injection.
 */
export function isValidClientId(clientId: unknown): boolean {
  if (!clientId || typeof clientId !== 'string') return false;
  return CLIENT_ID_REGEX.test(clientId.trim());
}

function isValidIpFormat(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  return /^[0-9a-fA-F:.]+$/.test(ip.trim());
}

/**
 * Extracts and sanitizes the client IP address from proxy headers.
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && isValidIpFormat(cfIp)) return cfIp.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIpFormat(realIp)) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (isValidIpFormat(firstIp)) return firstIp;
  }

  return '127.0.0.1';
}

/**
 * Determines the safe public origin for redirects and short URLs,
 * preventing Host Header Injection and open redirects.
 */
export function getSafePublicOrigin(request: Request): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (configuredUrl) {
    try {
      const u = new URL(configuredUrl);
      return u.origin;
    } catch {}
  }

  const fHost = request.headers.get('x-forwarded-host');
  const hHost = request.headers.get('host');
  const rawHost = (fHost || hHost || '').split(',')[0].trim();

  if (rawHost && /^[a-zA-Z0-9.:-]+$/.test(rawHost) && !rawHost.includes('/') && !rawHost.includes('@')) {
    const hostname = rawHost.split(':')[0].toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const protoHeader = request.headers.get('x-forwarded-proto');
    const proto = protoHeader === 'http' || isLocal ? 'http' : 'https';
    return `${proto}://${rawHost}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export interface SecurityEvent {
  action: string;
  ip?: string;
  status: 'allowed' | 'blocked' | 'warning';
  detail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured security audit logger for security events.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const payload = {
    level: 'SECURITY_AUDIT',
    timestamp: new Date().toISOString(),
    ...event,
  };
  console.warn(JSON.stringify(payload));
}

