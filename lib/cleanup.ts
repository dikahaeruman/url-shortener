import { supabase, isSupabaseConfigured } from './supabase';

const CLEANUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
let lastFiredAt = 0;
let inFlight: Promise<number> | null = null;

/**
 * ponytail: lazy in-app cleanup. Gates the actual DELETE behind an
 * in-process timestamp so a request burst doesn't hammer Postgres
 * with "should I clean up?" reads every time. The DELETE itself runs
 * inside the cleanup_expired_urls RPC, which also bumps the
 * persisted last-run timestamp atomically.
 *
 * Returns the number of rows deleted, or 0 if skipped/failed.
 * Errors are swallowed and logged — cleanup is best-effort and must
 * never break the calling request.
 */
export async function maybeCleanupExpired(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const now = Date.now();
  if (now - lastFiredAt < CLEANUP_INTERVAL_MS) return 0;
  if (inFlight) return inFlight;

  lastFiredAt = now;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_urls');
      if (error) {
        console.error('cleanup_expired_urls failed:', error);
        return 0;
      }
      const row = Array.isArray(data) ? data[0] : data;
      const deleted = Number(row?.deleted ?? 0);
      if (deleted > 0) {
        console.log(`cleanup_expired_urls: deleted ${deleted} expired rows`);
      }
      return deleted;
    } catch (err) {
      console.error('cleanup_expired_urls unexpected error:', err);
      return 0;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Test-only hook: reset the in-process gate so unit tests can re-fire. */
export function _resetCleanupGate(): void {
  lastFiredAt = 0;
  inFlight = null;
}
