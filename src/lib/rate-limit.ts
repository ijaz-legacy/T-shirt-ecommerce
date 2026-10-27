interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimit = globalThis as unknown as {
  __ijazRateBuckets?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  globalForLimit.__ijazRateBuckets ??= new Map();
  return globalForLimit.__ijazRateBuckets;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const store = buckets();

  if (store.size > 5000) {
    for (const [bucketKey, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(bucketKey);
    }
  }

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") ?? "local";
}
