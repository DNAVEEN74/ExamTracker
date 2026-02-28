import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/redis'
import { AuthUser } from '@/lib/auth'

/**
 * Rate limiting helper for Next.js API routes.
 * Uses authenticated user's ID if available, falls back to IP.
 *
 * Returns a NextResponse 429 if rate limited, or null if request is allowed.
 *
 * @param request - The incoming Next.js request
 * @param user    - Authenticated user (optional — uses IP if not provided)
 * @param limit   - Max requests per window (default: 100)
 * @param windowSeconds - Window duration in seconds (default: 60)
 */
export async function applyRateLimit(
    request: NextRequest,
    user?: AuthUser | null,
    limit = 100,
    windowSeconds = 60
): Promise<NextResponse | null> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous'
    const identifier = user?.id ?? ip
    const key = `${identifier}:${request.method}:${request.nextUrl.pathname}`

    try {
        const { allowed, remaining, resetAt } = await checkRateLimit(key, limit, windowSeconds)

        if (!allowed) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please slow down.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': String(limit),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
                        'Retry-After': String(windowSeconds),
                    },
                }
            )
        }

        return null // Allowed
    } catch {
        // Don't block requests if Redis is down
        return null
    }
}

/** Strict rate limiter preset for auth endpoints (10 req / 60 seconds) */
export async function applyAuthRateLimit(
    request: NextRequest,
    user?: AuthUser | null
): Promise<NextResponse | null> {
    return applyRateLimit(request, user, 10, 60)
}
