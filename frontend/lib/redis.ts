import db from '@/lib/db'

// Simple in-memory cache to prevent DB overload from basic rate limiting on Hobby Tier
const CACHE_MAX_SIZE = 10000;
const memoryCache = new Map<string, { points: number, expireAt: number }>();

/**
 * Database-backed rate limiting replacement for Upstash Redis.
 * Returns { allowed, remaining, resetAt }
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = new Date()
    const nowMs = now.getTime()
    const expireAt = new Date(nowMs + windowSeconds * 1000)

    // 1. Check memory cache first
    let cached = memoryCache.get(key);
    if (cached && cached.expireAt < nowMs) {
        memoryCache.delete(key);
        cached = undefined;
    }

    if (cached) {
        cached.points += 1;
        const allowed = cached.points <= limit;
        return { allowed, remaining: Math.max(0, limit - cached.points), resetAt: cached.expireAt };
    }

    // 2. Fallback to DB if not strictly enforced in memory or if it's the first hit
    try {
        // Prevent uncontrollable memory bloat
        if (memoryCache.size >= CACHE_MAX_SIZE) {
            memoryCache.clear();
        }
        // Clean up expired records for this key (optional but keeps DB lean)
        await db.rateLimit.deleteMany({
            where: {
                key,
                expire_at: { lt: now }
            }
        })

        // Upsert rate limit record
        const record = await db.rateLimit.upsert({
            where: { key },
            update: {
                points: { increment: 1 }
            },
            create: {
                key,
                points: 1,
                expire_at: expireAt
            }
        })

        const allowed = record.points <= limit
        const remaining = Math.max(0, limit - record.points)
        const resetAt = record.expire_at.getTime()

        // 3. Sync back to memory 
        memoryCache.set(key, { points: record.points, expireAt: resetAt });

        return { allowed, remaining, resetAt }

    } catch (err) {
        // Fallback gracefully to allow requests if DB throws
        console.error('Rate Limit DB Error:', err)
        return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 }
    }
}

/**
 * Read-only idempotency check to avoid lockouts if server crashes before transaction.
 */
export async function checkIdempotent(eventId: string): Promise<boolean> {
    try {
        const key = `idempotent:${eventId}`
        const exists = await db.idempotencyKey.findUnique({ where: { key } })
        return !!exists
    } catch {
        return false
    }
}

/**
 * Idempotency check — prevents webhook replay attacks using DB.
 * Returns true if already processed (skip). Marks as processed inline.
 */
export async function checkAndMarkIdempotent(eventId: string): Promise<boolean> {
    try {
        const key = `idempotent:${eventId}`

        // Attempt to create. If it exists, Prisma throws P2002 Unique Constraint error
        await db.idempotencyKey.create({
            data: { key }
        })

        return false // Was not already processed

    } catch (err: any) {
        if (err.code === 'P2002') {
            return true // Already processed (Unique constraint failed)
        }
        console.error('Idempotency DB Error:', err)
        return false // Allow processing on random DB errors to fail-open
    }
}

/**
 * Cleanup function to be run periodically (e.g. via cron route)
 * Removes old rate limits and idempotency keys
 */
export async function cleanupSecurityKeys() {
    try {
        const now = new Date()

        // Delete expired rate limits
        await db.rateLimit.deleteMany({
            where: { expire_at: { lt: now } }
        })

        // Delete idempotency keys older than 30 days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        await db.idempotencyKey.deleteMany({
            where: { created_at: { lt: thirtyDaysAgo } }
        })

        return true
    } catch (err) {
        console.error('Security Cleanup DB Error:', err)
        return false
    }
}

/** Stub implementations for lock mechanism as DB locking is complex and currently unused outside tests/scripts */
export async function acquireLock(name: string, ttlSeconds = 300, holder = 'default'): Promise<boolean> {
    return true
}

export async function releaseLock(name: string, holder = 'default'): Promise<void> {
    return
}
