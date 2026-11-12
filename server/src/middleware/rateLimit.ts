import type { Request, RequestHandler } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

/**
 * Process-local fixed-window rate limiter.
 *
 * Deliberately dependency-free and in-memory: it exists to stop order-number
 * enumeration on the public tracking endpoint. Behind more than one API
 * instance each instance keeps its own counters, so this is a speed bump, not
 * a hard quota. Swap the Map for Redis if that ever matters.
 */
export function rateLimit(options: {
  windowMs: number
  max: number
  message?: string
  key?: (req: Request) => string
}): RequestHandler {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please wait a few minutes and try again.',
    key = (req: Request) => req.ip ?? 'unknown',
  } = options

  const buckets = new Map<string, Bucket>()
  const MAX_KEYS = 5_000

  return (req, res, next) => {
    const now = Date.now()

    // Keep the map from growing without bound when lots of IPs hit us once.
    if (buckets.size >= MAX_KEYS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey)
      }
      if (buckets.size >= MAX_KEYS) buckets.clear()
    }

    const bucketKey = key(req)
    const existing = buckets.get(bucketKey)

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    existing.count += 1
    if (existing.count > max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfter))
      res.status(429).json({ error: message })
      return
    }

    next()
  }
}
