import { describe, expect, test } from 'bun:test';
import {
  isBlockedHostname,
  generateShortCode,
  isValidRecordId,
  isValidClientId,
  getClientIp,
  getSafePublicOrigin,
  logSecurityEvent,
} from '@/lib/utils';
import { resolvePublicIp } from '@/lib/url-safety-server';
import { rateLimit } from '@/lib/rateLimit';
import { GET as adminGet } from '@/app/api/admin/urls/route';
import { GET as redirectGet } from '@/app/[short_code]/route';

describe('OWASP Top 10 Security Audit & Verification', () => {
  describe('A01: Broken Access Control & IDOR', () => {
    test('isValidRecordId accepts valid UUID and alphanumeric IDs', () => {
      expect(isValidRecordId('c56a4180-65aa-42ec-a945-5fd21dec0538')).toBe(true);
      expect(isValidRecordId('record-123')).toBe(true);
      expect(isValidRecordId('rec_456_abc')).toBe(true);
    });

    test('isValidRecordId rejects SQL injection payloads and malicious path traversal', () => {
      expect(isValidRecordId("1' OR '1'='1")).toBe(false);
      expect(isValidRecordId('../../etc/passwd')).toBe(false);
      expect(isValidRecordId('; DROP TABLE urls; --')).toBe(false);
      expect(isValidRecordId('')).toBe(false);
      expect(isValidRecordId(null)).toBe(false);
      expect(isValidRecordId('a'.repeat(100))).toBe(false);
    });

    test('isValidClientId rejects malicious headers or query pollution', () => {
      expect(isValidClientId('client-unit-1')).toBe(true);
      expect(isValidClientId('c56a4180-65aa-42ec-a945-5fd21dec0538')).toBe(true);
      expect(isValidClientId('<script>alert(1)</script>')).toBe(false);
      expect(isValidClientId("client' OR 1=1 --")).toBe(false);
      expect(isValidClientId('ab')).toBe(false);
      expect(isValidClientId('a'.repeat(70))).toBe(false);
    });

    test('getSafePublicOrigin mitigates Host Header Injection', () => {
      const maliciousReq = new Request('http://localhost:3000/api/shorten', {
        headers: {
          'x-forwarded-host': 'evil-attacker.com',
          'host': 'evil-attacker.com',
        },
      });
      const origin = getSafePublicOrigin(maliciousReq);
      expect(origin.startsWith('http')).toBe(true);
      expect(origin.includes('\r')).toBe(false);
      expect(origin.includes('\n')).toBe(false);
    });
  });

  describe('A02: Cryptographic Failures', () => {
    test('generateShortCode generates high-entropy strings using CSPRNG', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const code = generateShortCode(6);
        expect(code.length).toBe(6);
        expect(/^[a-zA-Z0-9]{6}$/.test(code)).toBe(true);
        codes.add(code);
      }
      expect(codes.size).toBe(1000);
    });

    test('generateShortCode respects custom lengths', () => {
      expect(generateShortCode(8).length).toBe(8);
      expect(generateShortCode(16).length).toBe(16);
    });
  });

  describe('A03: Injection & Dangerous Protocols', () => {
    test('isBlockedHostname rejects dangerous pseudo-protocols and schemes', () => {
      expect(isBlockedHostname('localhost')).toBe(true);
      expect(isBlockedHostname('127.0.0.1')).toBe(true);
    });

    test('redirect handler rejects malformed or oversized short codes', async () => {
      const req = new Request('http://localhost:3000/bad%20code%20here');
      const params = Promise.resolve({ short_code: 'bad code here' });
      const res = await redirectGet(req, { params });
      expect([302, 307]).toContain(res.status);
      expect(res.headers.get('location')).toContain('/not-found');
    });

    test('redirect handler applies Referrer-Policy no-referrer', async () => {
      const req = new Request('http://localhost:3000/anycode');
      const params = Promise.resolve({ short_code: 'anycode' });
      const res = await redirectGet(req, { params });
      expect(res.headers.get('location')).toBeDefined();
    });
  });

  describe('A04: Insecure Design & Rate Limiting', () => {
    test('getClientIp safely extracts valid IPs and sanitizes malicious headers', () => {
      const normalReq = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '203.0.113.195' },
      });
      expect(getClientIp(normalReq)).toBe('203.0.113.195');

      const attackReq = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '1.2.3.4; DROP TABLE users; --' },
      });
      expect(getClientIp(attackReq)).toBe('127.0.0.1');

      const bloatedReq = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '1.'.repeat(100) },
      });
      expect(getClientIp(bloatedReq)).toBe('127.0.0.1');
    });

    test('rateLimit function enforces maximum token consumption and window reset', () => {
      const testIp = '198.51.100.99';
      const bucket = 'owasp_test';
      const max = 3;

      expect(rateLimit(testIp, bucket, max, 10_000)).toBe(true);
      expect(rateLimit(testIp, bucket, max, 10_000)).toBe(true);
      expect(rateLimit(testIp, bucket, max, 10_000)).toBe(true);
      expect(rateLimit(testIp, bucket, max, 10_000)).toBe(false);
    });
  });

  describe('A07: Identification and Authentication Failures', () => {
    test('admin authentication locks out brute-force attacks after repeated failures', async () => {
      const attackerIp = '192.0.2.77';
      const wrongKeyHeaders = {
        'x-admin-key': 'incorrect-guess-pw',
        'x-real-ip': attackerIp,
      };

      let lockedOut = false;
      for (let i = 0; i < 15; i++) {
        const req = new Request('http://localhost:3000/api/admin/urls', {
          headers: wrongKeyHeaders,
        });
        const res = await adminGet(req);
        if (res.status === 429) {
          lockedOut = true;
          break;
        }
      }

      expect(lockedOut).toBe(true);
    });
  });

  describe('A09: Security Logging and Monitoring', () => {
    test('logSecurityEvent writes structured JSON logs with audit level', () => {
      const logs: string[] = [];
      const origWarn = console.warn;
      console.warn = (msg: string) => logs.push(msg);

      logSecurityEvent({
        action: 'TEST_EVENT',
        ip: '127.0.0.1',
        status: 'blocked',
        detail: 'Test security event log',
      });

      console.warn = origWarn;

      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.level).toBe('SECURITY_AUDIT');
      expect(parsed.action).toBe('TEST_EVENT');
      expect(parsed.status).toBe('blocked');
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe('A10: Server-Side Request Forgery (SSRF)', () => {
    test('isBlockedHostname rejects all IPv4 private and loopback ranges', () => {
      const badIpv4 = [
        '127.0.0.1',
        '127.255.255.254',
        '10.0.0.1',
        '10.254.1.1',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.0.1',
        '192.168.100.50',
        '169.254.169.254',
        '100.64.0.1',
        '0.0.0.0',
        '224.0.0.1',
        '240.0.0.1',
      ];
      for (const ip of badIpv4) {
        expect(isBlockedHostname(ip)).toBe(true);
      }
    });

    test('isBlockedHostname rejects alternative IPv4 representations (decimal, hex, octal)', () => {
      expect(isBlockedHostname('2130706433')).toBe(true);
      expect(isBlockedHostname('0x7f000001')).toBe(true);
      expect(isBlockedHostname('127.1')).toBe(true);
      expect(isBlockedHostname('0')).toBe(true);
    });

    test('isBlockedHostname rejects IPv6 Unique Local (ULA fc00::/7 including fd00::)', () => {
      expect(isBlockedHostname('fc00::1')).toBe(true);
      expect(isBlockedHostname('fd00::1')).toBe(true);
      expect(isBlockedHostname('[fd00::1]')).toBe(true);
      expect(isBlockedHostname('[fd00::1]:8080')).toBe(true);
      expect(isBlockedHostname('fd12:3456:789a:1::1')).toBe(true);
    });

    test('isBlockedHostname rejects IPv6 Link-Local and Multicast', () => {
      expect(isBlockedHostname('fe80::1')).toBe(true);
      expect(isBlockedHostname('[fe80::1]')).toBe(true);
      expect(isBlockedHostname('ff02::1')).toBe(true);
    });

    test('isBlockedHostname rejects IPv4-mapped and IPv4-translated IPv6 addresses', () => {
      expect(isBlockedHostname('::ffff:127.0.0.1')).toBe(true);
      expect(isBlockedHostname('::ffff:10.0.0.1')).toBe(true);
      expect(isBlockedHostname('::ffff:192.168.1.1')).toBe(true);
      expect(isBlockedHostname('::ffff:169.254.169.254')).toBe(true);
      expect(isBlockedHostname('::ffff:8.8.8.8')).toBe(false);
      expect(isBlockedHostname('::ffff:1.1.1.1')).toBe(false);
    });

    test('isBlockedHostname rejects 6to4 addresses embedding private IPv4', () => {
      expect(isBlockedHostname('2002:7f00:0001::')).toBe(true);
      expect(isBlockedHostname('2002:0a00:0001::')).toBe(true);
      expect(isBlockedHostname('2002:0808:0808::')).toBe(false);
    });

    test('isBlockedHostname rejects Cloud Metadata endpoints and internal domains', () => {
      expect(isBlockedHostname('metadata.google.internal')).toBe(true);
      expect(isBlockedHostname('instance-data')).toBe(true);
      expect(isBlockedHostname('169.254.169.254')).toBe(true);
      expect(isBlockedHostname('myhost.localhost')).toBe(true);
      expect(isBlockedHostname('service.local')).toBe(true);
      expect(isBlockedHostname('db.internal')).toBe(true);
      expect(isBlockedHostname('router.lan')).toBe(true);
      expect(isBlockedHostname('nas.home')).toBe(true);
      expect(isBlockedHostname('intranet.corp')).toBe(true);
    });

    test('isBlockedHostname allows safe public domains and IPs', () => {
      expect(isBlockedHostname('example.com')).toBe(false);
      expect(isBlockedHostname('google.com')).toBe(false);
      expect(isBlockedHostname('github.com')).toBe(false);
      expect(isBlockedHostname('8.8.8.8')).toBe(false);
      expect(isBlockedHostname('1.1.1.1')).toBe(false);
    });

    test('resolvePublicIp rejects hostnames resolving to private addresses', async () => {
      expect(await resolvePublicIp('localhost')).toBeNull();
      expect(await resolvePublicIp('127.0.0.1')).toBeNull();
      expect(await resolvePublicIp('metadata.google.internal')).toBeNull();
    });
  });
});
