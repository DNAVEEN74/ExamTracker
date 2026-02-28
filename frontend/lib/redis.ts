import { Redis } from '@upstash/redis'

let redis: Redis | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
}

/**
 * Sliding window rate limit check using Upstash Redis.
 * Returns { allowed, remaining, resetAt }
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!redis) {
        // No Redis configured — allow all requests in development
        return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 }
    }

    const now = Date.now()
    const windowStart = now - windowSeconds * 1000
    const redisKey = `ratelimit:${key}`

    await redis.zremrangebyscore(redisKey, 0, windowStart)
    await redis.zadd(redisKey, { score: now, member: now.toString() })
    await redis.expire(redisKey, windowSeconds)
    const count = await redis.zcard(redisKey)

    const allowed = count <= limit
    const remaining = Math.max(0, limit - count)
    const resetAt = now + windowSeconds * 1000

    return { allowed, remaining, resetAt }
}

/**
 * Distributed lock using Redis SET NX. Returns true if lock acquired.
 */
export async function acquireLock(
    name: string,
    ttlSeconds = 300,
    holder = 'default'
): Promise<boolean> {
    if (!redis) return true
    const result = await redis.set(`lock:${name}`, holder, { nx: true, ex: ttlSeconds })
    return result === 'OK'
}

/** Release a lock — only if we are the current holder */
export async function releaseLock(name: string, holder = 'default'): Promise<void> {
    if (!redis) return
    const current = await redis.get(`lock:${name}`)
    if (current === holder) await redis.del(`lock:${name}`)
}

/**
 * Idempotency check — prevents webhook replay attacks.
 * Returns true if already processed (skip). Marks as processed with 24h TTL.
 */
export async function checkAndMarkIdempotent(eventId: string): Promise<boolean> {
    if (!redis) return false
    const key = `idempotent:${eventId}`
    const result = await redis.set(key, '1', { nx: true, ex: 86400 })
    return result === null
}
