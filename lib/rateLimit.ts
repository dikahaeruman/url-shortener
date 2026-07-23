// ponytail: per-(ip, bucket) token bucket. In-memory means it resets
// on container restart and isn't shared across replicas. Upgrade to
// Redis (already in npm-network) if you ever scale past 1 instance.
type Bucket = { tokens: number; lastRefill: number };

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60_000;

const buckets = new Map<string, Bucket>();

export function rateLimit(
  ip: string,
  bucketKey: string = 'default',
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const key = `${ip}::${bucketKey}`;
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

// ponytail: unbounded growth is fine at this scale (1 instance, low QPS).
// Add periodic cleanup if it ever matters.
