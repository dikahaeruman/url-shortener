import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { isTrustedDomain, DEFAULT_TRUSTED_DOMAINS } from '@/lib/trusted-domains';
import { GET as handleRedirect } from '@/app/[short_code]/route';
import { POST as handleReportAbuse } from '@/app/api/report/route';
import { supabase } from '@/lib/supabase';

const originalFrom = supabase.from;

function mockSupabaseUrlRow(row: Record<string, any> | null) {
  const builder: any = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.limit = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: row, error: null });
  builder.single = () => Promise.resolve({ data: row, error: null });
  builder.update = (updates: any) => {
    if (row) Object.assign(row, updates);
    return builder;
  };
  return builder;
}

describe('Domain & Reputation Protection: Trusted Domains & Interstitial Redirection', () => {
  const originalEnv = process.env.TRUSTED_DOMAINS;

  afterEach(() => {
    process.env.TRUSTED_DOMAINS = originalEnv;
    (supabase as any).from = originalFrom;
  });

  test('isTrustedDomain recognizes standard whitelisted domains', () => {
    expect(DEFAULT_TRUSTED_DOMAINS.size).toBeGreaterThan(10);
    expect(isTrustedDomain('google.com')).toBe(true);
    expect(isTrustedDomain('github.com')).toBe(true);
    expect(isTrustedDomain('youtube.com')).toBe(true);
    expect(isTrustedDomain('detik.com')).toBe(true);
    expect(isTrustedDomain('kompas.com')).toBe(true);
  });

  test('isTrustedDomain recognizes subdomains of trusted domains', () => {
    expect(isTrustedDomain('docs.github.com')).toBe(true);
    expect(isTrustedDomain('api.github.com')).toBe(true);
    expect(isTrustedDomain('drive.google.com')).toBe(true);
    expect(isTrustedDomain('news.detik.com')).toBe(true);
  });

  test('isTrustedDomain rejects domain lookalikes and suffixes (anti-impersonation)', () => {
    expect(isTrustedDomain('evil-github.com')).toBe(false);
    expect(isTrustedDomain('fakegoogle.com')).toBe(false);
    expect(isTrustedDomain('github.com.attacker.com')).toBe(false);
    expect(isTrustedDomain('google.com.phishing.link')).toBe(false);
  });

  test('isTrustedDomain handles ports and uppercase letters gracefully', () => {
    expect(isTrustedDomain('GITHUB.COM:443')).toBe(true);
    expect(isTrustedDomain('WWW.YOUTUBE.COM:80')).toBe(true);
    expect(isTrustedDomain('EVIL.COM:8080')).toBe(false);
  });

  test('isTrustedDomain respects custom TRUSTED_DOMAINS environment variable', () => {
    process.env.TRUSTED_DOMAINS = 'mycompany.id, trustedpartner.org';
    expect(isTrustedDomain('mycompany.id')).toBe(true);
    expect(isTrustedDomain('app.mycompany.id')).toBe(true);
    expect(isTrustedDomain('trustedpartner.org')).toBe(true);
    expect(isTrustedDomain('untrusted-site.org')).toBe(false);
  });

  test('GET /[short_code] directly redirects (302) to trusted domains', async () => {
    const fakeRow = {
      id: 'row-trusted-1',
      original_url: 'https://github.com/torvalds/linux',
      short_code: 'linux-src',
      expires_at: null,
    };
    (supabase as any).from = () => mockSupabaseUrlRow(fakeRow);

    const req = new Request('http://localhost:3000/linux-src');
    const res = await handleRedirect(req, {
      params: Promise.resolve({ short_code: 'linux-src' }),
    });

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toBe('https://github.com/torvalds/linux');
  });

  test('GET /[short_code] intercepts untrusted domains and redirects to /warning interstitial', async () => {
    const fakeRow = {
      id: 'row-untrusted-1',
      original_url: 'https://new-unverified-site.biz/promo',
      short_code: 'newpromo',
      expires_at: null,
    };
    (supabase as any).from = () => mockSupabaseUrlRow(fakeRow);

    const req = new Request('http://localhost:3000/newpromo');
    const res = await handleRedirect(req, {
      params: Promise.resolve({ short_code: 'newpromo' }),
    });

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('/warning');
    expect(location).toContain('code=newpromo');
    expect(location).toContain('target=' + encodeURIComponent('https://new-unverified-site.biz/promo'));
  });
});

describe('Abuse Reporting Endpoint (POST /api/report) & Auto-Disable', () => {
  beforeEach(() => {
    (supabase as any).from = originalFrom;
  });

  afterEach(() => {
    (supabase as any).from = originalFrom;
  });

  test('POST /api/report rejects request when reason is missing', async () => {
    const req = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.1' },
      body: JSON.stringify({ short_code: 'phish123', reason: '' }),
    });
    const res = await handleReportAbuse(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Alasan');
  });

  test('POST /api/report rejects request when short_code and url are missing', async () => {
    const req = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.2' },
      body: JSON.stringify({ reason: 'phishing' }),
    });
    const res = await handleReportAbuse(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Kode tautan atau URL');
  });

  test('POST /api/report flags and auto-disables malicious link immediately', async () => {
    const maliciousRow = {
      id: 'malicious-id-1',
      original_url: 'https://fake-bank-login.xyz/auth',
      short_code: 'securelogin',
      title: 'Official Bank Login',
      expires_at: null,
    };
    (supabase as any).from = () => mockSupabaseUrlRow(maliciousRow);

    const req = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.3' },
      body: JSON.stringify({
        short_code: 'securelogin',
        reason: 'phishing',
        details: 'Phishing login page asking for bank PIN',
      }),
    });

    const res = await handleReportAbuse(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.disabled).toBe(true);

    // Verify row was auto-disabled in database (expires_at in past)
    expect(maliciousRow.expires_at).toBe(new Date(0).toISOString());
    expect(maliciousRow.title).toContain('[FLAGGED ABUSE: phishing]');

    // Verify that subsequent GET /[short_code] now redirects to /expired
    const redirectReq = new Request('http://localhost:3000/securelogin');
    const redirectRes = await handleRedirect(redirectReq, {
      params: Promise.resolve({ short_code: 'securelogin' }),
    });
    expect([302, 307]).toContain(redirectRes.status);
    const location = redirectRes.headers.get('location');
    expect(location).toContain('/expired?code=securelogin');
  });

  test('POST /api/report accepts full URL input and extracts short code', async () => {
    const maliciousRow = {
      id: 'malicious-id-2',
      original_url: 'https://malware-drop.top/trojan.exe',
      short_code: 'giftcard',
      title: 'Free Gift Card',
      expires_at: null,
    };
    (supabase as any).from = () => mockSupabaseUrlRow(maliciousRow);

    const req = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.4' },
      body: JSON.stringify({
        url: 'https://pendekin.link/giftcard',
        reason: 'malware',
      }),
    });

    const res = await handleReportAbuse(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.disabled).toBe(true);
    expect(maliciousRow.expires_at).toBe(new Date(0).toISOString());
  });

  test('POST /api/report enforces rate limiting on excessive reports', async () => {
    const testIp = '198.51.100.99';
    for (let i = 0; i < 10; i++) {
      const req = new Request('http://localhost:3000/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
        body: JSON.stringify({ url: 'test', reason: 'spam' }),
      });
      await handleReportAbuse(req);
    }

    // 11th request should be blocked with 429
    const blockedReq = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
      body: JSON.stringify({ url: 'test', reason: 'spam' }),
    });
    const blockedRes = await handleReportAbuse(blockedReq);
    expect(blockedRes.status).toBe(429);
  });
});
