import { Request, Response, NextFunction } from 'express'
import { checkRateLimit } from '../services/redis.service'

/**
 * Express middleware factory for rate limiting.
 * Uses the authenticated user's ID if available, falls back to IP.
 *
 * @param limit - Max requests allowed per window
 * @param windowSeconds - Time window in seconds (default: 60 = 1 minute)
 */
export function rateLimiter(limit = 100, windowSeconds = 60) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const identifier = req.user?.id ?? req.ip ?? 'anonymous'
        const key = `${identifier}:${req.method}:${req.baseUrl}`

        try {
            const { allowed, remaining, resetAt } = await checkRateLimit(key, limit, windowSeconds)

            // Set rate limit headers regardless of result
            res.setHeader('X-RateLimit-Limit', limit)
            res.setHeader('X-RateLimit-Remaining', remaining)
            res.setHeader('X-RateLimit-Reset', Math.floor(resetAt / 1000))

            if (!allowed) {
                res.setHeader('Retry-After', Math.ceil(windowSeconds - (Date.now() - resetAt + windowSeconds * 1000) / 1000))
                return res.status(429).json({
                    success: false,
                    error: 'Too many requests. Please slow down.',
                })
            }

            next()
        } catch {
            // Don't block requests if Redis is down
            next()
        }
    }
}

/** Strict rate limiter for auth endpoints (10 req / 60 seconds) */
export const authRateLimiter = rateLimiter(10, 60)

/** Standard API rate limiter (100 req / 60 seconds) */
export const apiRateLimiter = rateLimiter(100, 60)
