// ponytail: per-(ip, bucket) token bucket. In-memory means it resets
// on container restart and isn't shared across replicas. Upgrade to
// Redis (already in npm-network) if you ever scale past 1 instance.
type Bucket = { tokens: number; lastRefill: number };

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;

const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();

function cleanupStaleBuckets(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && buckets.size < MAX_BUCKETS) {
    return;
  }
  lastCleanup = now;

  for (const [key, bucket] of buckets.entries()) {
    // Evict buckets that have been inactive for more than 5 minutes
    if (now - bucket.lastRefill > 5 * 60_000) {
      buckets.delete(key);
    }
  }

  // Hard safety cap if still oversized: clear oldest half
  if (buckets.size > MAX_BUCKETS) {
    let count = 0;
    const target = Math.floor(MAX_BUCKETS / 2);
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++count >= target) break;
    }
  }
}

export function rateLimit(
  ip: string,
  bucketKey: string = 'default',
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  cleanupStaleBuckets(now);

  const safeIp = (ip || 'unknown').slice(0, 45).replace(/[^0-9a-zA-Z:._-]/g, '');
  const safeBucket = (bucketKey || 'default').slice(0, 32).replace(/[^0-9a-zA-Z_-]/g, '');
  const key = `${safeIp}::${safeBucket}`;
  const bucket = buckets.get(key) ?? { tokens: max, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / windowMs) * max;
    bucket.tokens = Math.min(max, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
