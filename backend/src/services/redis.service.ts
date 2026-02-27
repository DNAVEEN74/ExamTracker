import { Redis } from '@upstash/redis'
import { env } from '../config/env'

let redis: Redis | null = null

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    })
}

/**
 * Sliding window rate limit check using Upstash Redis.
 * Returns { allowed: boolean, remaining: number, resetAt: number }
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

    // Remove old entries outside the window, add current timestamp, count
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
 * Distributed lock using Redis SET NX (atomic "set if not exists").
 * Returns true if the lock was acquired, false if already held.
 * The lock auto-expires so a crashed process never holds it forever.
 *
 * @param name        Unique lock name e.g. 'notif_processor'
 * @param ttlSeconds  Auto-expiry in seconds (default: 5 minutes)
 * @param holder      Identifier of the holder (requestId, pod name, etc.)
 */
export async function acquireLock(
    name: string,
    ttlSeconds = 300,
    holder = 'default'
): Promise<boolean> {
    if (!redis) {
        // No Redis in dev — always grant the lock (single process anyway)
        return true
    }
    // SET key value NX EX ttl — atomic: only sets if key doesn't exist
    const result = await redis.set(`lock:${name}`, holder, {
        nx: true,      // Only set if not exists
        ex: ttlSeconds, // Expire automatically — crashed process never blocks forever
    })
    return result === 'OK'
}

/**
 * Release a lock. Only releases if we are the current holder (prevents
 * releasing another process's lock if ours expired and was re-acquired).
 */
export async function releaseLock(name: string, holder = 'default'): Promise<void> {
    if (!redis) return
    const current = await redis.get(`lock:${name}`)
    if (current === holder) {
        await redis.del(`lock:${name}`)
    }
}

/**
 * Idempotency check — prevents webhook replay attacks.
 * Returns true if this eventId was already processed (i.e. should be skipped).
 * Marks the eventId as processed atomically with a 24-hour TTL.
 *
 * @param eventId  Unique identifier for the event (e.g. Razorpay payment_id)
 */
export async function checkAndMarkIdempotent(eventId: string): Promise<boolean> {
    if (!redis) {
        // No Redis in dev — allow all events through
        return false
    }
    const key = `idempotent:${eventId}`
    // SET NX EX 86400 — atomic: set only if not exists, expire in 24h
    const result = await redis.set(key, '1', { nx: true, ex: 86400 })
    // If result is null, the key already existed → already processed
    return result === null
}
