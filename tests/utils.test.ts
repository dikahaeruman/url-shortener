import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import {
  generateShortCode,
  isValidUrl,
  normalizeUrl,
  getFaviconUrl,
  validateUrlSafety,
  fetchTargetTitle,
  isValidCustomCode,
  getOrCreateClientId,
} from '../lib/utils';

describe('lib/utils - generateShortCode', () => {
  test('generates short code of default length 6', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
  });

  test('generates short code of custom specified length', () => {
    const code = generateShortCode(10);
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
  });
});

describe('lib/utils - isValidUrl', () => {
  test('returns true for valid http and https URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
  });

  test('returns false for non-http protocols and malformed strings', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
  });
});

describe('lib/utils - normalizeUrl', () => {
  test('prepends https:// when protocol is missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('  github.com/repo  ')).toBe('https://github.com/repo');
  });

  test('preserves existing http:// or https:// protocols', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('ftp://files.example.com')).toBe('ftp://files.example.com');
  });
});

describe('lib/utils - getFaviconUrl', () => {
  test('returns Google Favicon API URL for valid domain', () => {
    const favicon = getFaviconUrl('https://github.com');
    expect(favicon).toContain('https://www.google.com/s2/favicons?domain=github.com');
  });

  test('handles domain normalization and returns valid favicon URL', () => {
    const favicon = getFaviconUrl('example.com/page');
    expect(favicon).toContain('domain=example.com');
  });

  test('returns fallback favicon URL on error', () => {
    const favicon = getFaviconUrl(':::invalid');
    expect(favicon).toContain('domain=google.com');
  });
});

describe('lib/utils - validateUrlSafety (client-safe, sync)', () => {
  test('returns error for empty or non-string input', () => {
    // @ts-expect-error testing runtime validation
    expect(validateUrlSafety(null)).toEqual({ safe: false, error: 'URL parameter is required.' });
    expect(validateUrlSafety('')).toEqual({ safe: false, error: 'URL parameter is required.' });
  });

  test('returns error for non-HTTP protocols', () => {
    const result = validateUrlSafety('ftp://files.example.com');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Only HTTP and HTTPS URLs are allowed');
  });

  test('prevents self-loop redirection to current host', () => {
    const res1 = validateUrlSafety('https://my-app.com/path', 'my-app.com');
    expect(res1.safe).toBe(false);
    expect(res1.error).toContain('infinite redirection loops');

    const res2 = validateUrlSafety('https://sub.my-app.com/x', 'my-app.com');
    expect(res2.safe).toBe(false);
  });

  test('blocks loopback and localhost addresses (SSRF Protection)', () => {
    for (const host of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']) {
      const res = validateUrlSafety(`http://${host}/admin`);
      expect(res.safe).toBe(false);
      expect(res.error).toMatch(/loopback|Internal, loopback/);
    }
  });

  test('blocks internal private IP ranges (SSRF Protection)', () => {
    for (const ip of ['10.0.0.1', '192.168.1.1', '172.16.0.1', '172.31.255.255']) {
      const res = validateUrlSafety(`http://${ip}`);
      expect(res.safe).toBe(false);
    }
    const res = validateUrlSafety('http://169.254.169.254/');
    expect(res.safe).toBe(false);
  });

  test('blocks IPv6 unique-local and link-local', () => {
    const fc = validateUrlSafety('http://[fc00::1]/');
    expect(fc.safe).toBe(false);
    const fe = validateUrlSafety('http://[fe80::1]/');
    expect(fe.safe).toBe(false);
  });

  test('allows safe public URLs', () => {
    const res = validateUrlSafety('https://google.com/search?q=test');
    expect(res.safe).toBe(true);
    expect(res.normalizedUrl).toBe('https://google.com/search?q=test');
  });
});

import { validateUrlSafety as validateUrlSafetyServer } from '../lib/url-safety-server';

describe('lib/url-safety-server - validateUrlSafety (async, DNS)', () => {
  test('still rejects obvious bad hostnames synchronously', async () => {
    const res = await validateUrlSafetyServer('http://10.0.0.1/');
    expect(res.safe).toBe(false);
  });

  test('resolves a public domain via DNS and allows it', async () => {
    const res = await validateUrlSafetyServer('https://example.com/');
    expect(res.safe).toBe(true);
    expect(res.normalizedUrl).toBe('https://example.com/');
  });
});

describe('lib/utils - isValidCustomCode', () => {
  test('rejects short codes less than 3 characters', () => {
    const res = isValidCustomCode('ab');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('at least 3 characters');
  });

  test('rejects short codes greater than 30 characters', () => {
    const res = isValidCustomCode('a'.repeat(31));
    expect(res.valid).toBe(false);
    expect(res.error).toContain('not exceed 30 characters');
  });

  test('rejects special invalid characters', () => {
    const res = isValidCustomCode('code!@#$');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('letters, numbers, hyphens');
  });

  test('rejects reserved keywords', () => {
    ['admin', 'api', '_next', 'login', 'dashboard', 'settings', 'favicon.ico'].forEach((word) => {
      const res = isValidCustomCode(word);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('reserved code');
    });
  });

  test('accepts valid custom alias codes', () => {
    const res1 = isValidCustomCode('my-link');
    expect(res1.valid).toBe(true);

    const res2 = isValidCustomCode('promo_2026');
    expect(res2.valid).toBe(true);
  });
});

describe('lib/utils - fetchTargetTitle', () => {
  test('returns title from HTML response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('<html><head><title>My Example Page</title></head></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )
    ) as unknown as typeof fetch;

    const title = await fetchTargetTitle('https://example.com');
    expect(title).toBe('My Example Page');

    globalThis.fetch = originalFetch;
  });

  test('falls back to og:title meta tag if <title> is missing', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('<html><head><meta property="og:title" content="OG Title Example" /></head></html>', {
          status: 200,
        })
      )
    ) as unknown as typeof fetch;

    const title = await fetchTargetTitle('https://example.com');
    expect(title).toBe('OG Title Example');

    globalThis.fetch = originalFetch;
  });

  test('decodes HTML entities and trims title', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('<html><head><title>  Hello &amp; World &lt;Code&gt;  </title></head></html>', {
          status: 200,
        })
      )
    ) as unknown as typeof fetch;

    const title = await fetchTargetTitle('https://example.com');
    expect(title).toBe('Hello & World <Code>');

    globalThis.fetch = originalFetch;
  });

  test('truncates titles longer than 100 characters', async () => {
    const longTitle = 'A'.repeat(120);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(`<html><head><title>${longTitle}</title></head></html>`, {
          status: 200,
        })
      )
    ) as unknown as typeof fetch;

    const title = await fetchTargetTitle('https://example.com');
    expect(title).toHaveLength(100);
    expect(title).toBe(`${'A'.repeat(97)}...`);

    globalThis.fetch = originalFetch;
  });

  test('returns null on HTTP error or network failure', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.reject(new Error('Network error'))) as unknown as typeof fetch;

    const title = await fetchTargetTitle('https://unreachable-domain-99.com');
    expect(title).toBeNull();

    globalThis.fetch = originalFetch;
  });
});

describe('lib/utils - getOrCreateClientId', () => {
  beforeEach(() => {
    // @ts-expect-error Mocking window & localStorage for DOM environment simulation
    globalThis.window = {};
    // @ts-expect-error Mocking localStorage
    globalThis.localStorage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] || null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    };
  });

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window;
    // @ts-expect-error cleanup
    delete globalThis.localStorage;
  });

  test('generates and persists new client ID in localStorage', () => {
    const id1 = getOrCreateClientId();
    expect(id1).toBeTruthy();

    const id2 = getOrCreateClientId();
    expect(id2).toBe(id1);
  });
});
