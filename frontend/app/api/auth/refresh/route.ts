export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { applyAuthRateLimit } from '@/lib/rateLimit'

import { signJWT, verifyJWT } from '@/lib/jwt'


/** POST /api/auth/refresh */
export async function POST(request: NextRequest) {
    const rateLimitRes = await applyAuthRateLimit(request)
    if (rateLimitRes) return rateLimitRes

    try {
        let token = request.cookies.get('auth-token')?.value

        if (!token) {
            const authHeader = request.headers.get('authorization')
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '')
            }
        }

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token is required' },
                { status: 400 }
            )
        }

        const user = await verifyJWT(token)
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired token' },
                { status: 401 }
            )
        }

        const newToken = await signJWT(user)

        const response = NextResponse.json({
            success: true,
            data: {
                access_token: newToken,
                expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
            },
        })

        response.cookies.set({
            name: 'auth-token',
            value: newToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
        })

        return response
    } catch {
        return NextResponse.json({ success: false, error: 'Token refresh failed' }, { status: 500 })
    }
}
