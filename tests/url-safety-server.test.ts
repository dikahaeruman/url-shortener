import { describe, expect, test } from 'bun:test';
import { validateUrlSafety, fetchTargetTitleSafe } from '../lib/url-safety-server';

describe('validateUrlSafety (server)', () => {
  test('rejects private/blocked hostnames', async () => {
    for (const bad of [
      'http://127.0.0.1/',
      'http://localhost/',
      'http://10.0.0.5/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://[fd00::1]/',
    ]) {
      const res = await validateUrlSafety(bad);
      expect(res.safe).toBe(false);
    }
  });

  test('blocks self-domain shortening', async () => {
    const res = await validateUrlSafety('https://pendekin.andhikadev.my.id/x', 'pendekin.andhikadev.my.id');
    expect(res.safe).toBe(false);
  });

  test('accepts public http/https', async () => {
    const res = await validateUrlSafety('https://example.com/foo');
    expect(res.safe).toBe(true);
    expect(res.normalizedUrl).toBe('https://example.com/foo');
  });

  test('rejects non-http protocols', async () => {
    const res = await validateUrlSafety('ftp://example.com/x');
    expect(res.safe).toBe(false);
  });
});

describe('fetchTargetTitleSafe', () => {
  test('fetches a title from a public page (IP-pinned)', async () => {
    const title = await fetchTargetTitleSafe('https://example.com/');
    expect(title).toBe('Example Domain');
  });

  test('does not fetch private addresses', async () => {
    const title = await fetchTargetTitleSafe('http://127.0.0.1:3000/');
    expect(title).toBeNull();
  });
});
