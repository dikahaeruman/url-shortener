import type { UrlRecord } from './supabase';

/** Is the link's expiry timestamp in the past relative to `now`? */
export function isExpired(record: Pick<UrlRecord, 'expires_at'>, now: number = Date.now()): boolean {
  if (!record.expires_at) return false;
  return new Date(record.expires_at).getTime() < now;
}

/** Is the link not expired but expiring within the next `windowMs` ms? */
export function isExpiringSoon(
  record: Pick<UrlRecord, 'expires_at'>,
  now: number = Date.now(),
  windowMs: number = 24 * 60 * 60 * 1000
): boolean {
  if (!record.expires_at) return false;
  const t = new Date(record.expires_at).getTime();
  return t >= now && t - now < windowMs;
}

/** Case-insensitive search across short_code, original_url, title, client_id. */
export function matchesSearch(record: UrlRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    record.short_code.toLowerCase().includes(q) ||
    record.original_url.toLowerCase().includes(q) ||
    (record.title?.toLowerCase().includes(q) ?? false) ||
    (record.client_id?.toLowerCase().includes(q) ?? false)
  );
}

/** Status filter for admin: 'all' | 'active' | 'expired'. */
export function matchesStatus(
  record: UrlRecord,
  status: 'all' | 'active' | 'expired',
  now: number = Date.now()
): boolean {
  if (status === 'all') return true;
  const expired = isExpired(record, now);
  return status === 'expired' ? expired : !expired;
}
