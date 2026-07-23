import { describe, test, expect } from 'bun:test';
import { isExpired, isExpiringSoon, matchesSearch, matchesStatus } from '@/lib/url-filter';
import type { UrlRecord } from '@/lib/supabase';

const base: UrlRecord = {
  id: '1',
  short_code: 'abc',
  original_url: 'https://example.com',
  clicks: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: null,
  title: null,
  client_id: 'client-1',
};

describe('lib/url-filter', () => {
  test('isExpired: null expiry is never expired', () => {
    expect(isExpired(base)).toBe(false);
  });

  test('isExpired: past expiry is expired', () => {
    expect(isExpired({ ...base, expires_at: '2020-01-01T00:00:00.000Z' })).toBe(true);
  });

  test('isExpired: future expiry is not expired', () => {
    expect(isExpired({ ...base, expires_at: '2099-01-01T00:00:00.000Z' })).toBe(false);
  });

  test('isExpiringSoon: future within window returns true', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpiringSoon({ ...base, expires_at: future }, Date.now(), 120_000)).toBe(true);
  });

  test('isExpiringSoon: past expiry returns false', () => {
    expect(isExpiringSoon({ ...base, expires_at: '2020-01-01T00:00:00.000Z' })).toBe(false);
  });

  test('matchesSearch: empty query matches everything', () => {
    expect(matchesSearch(base, '')).toBe(true);
  });

  test('matchesSearch: matches across short_code, url, title, client_id', () => {
    expect(matchesSearch(base, 'abc')).toBe(true);
    expect(matchesSearch(base, 'EXAMPLE')).toBe(true);
    expect(matchesSearch(base, 'client')).toBe(true);
    expect(matchesSearch(base, 'nope')).toBe(false);
  });

  test('matchesSearch: matches title when present', () => {
    const withTitle = { ...base, title: 'My Page' };
    expect(matchesSearch(withTitle, 'page')).toBe(true);
  });

  test('matchesStatus: status=all matches everything', () => {
    expect(matchesStatus(base, 'all')).toBe(true);
    expect(matchesStatus({ ...base, expires_at: '2020-01-01T00:00:00.000Z' }, 'all')).toBe(true);
  });

  test('matchesStatus: status=active excludes expired', () => {
    expect(matchesStatus(base, 'active')).toBe(true);
    expect(matchesStatus({ ...base, expires_at: '2020-01-01T00:00:00.000Z' }, 'active')).toBe(false);
  });

  test('matchesStatus: status=expired excludes active', () => {
    expect(matchesStatus(base, 'expired')).toBe(false);
    expect(matchesStatus({ ...base, expires_at: '2020-01-01T00:00:00.000Z' }, 'expired')).toBe(true);
  });
});
