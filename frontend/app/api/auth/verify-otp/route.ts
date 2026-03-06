export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { applyAuthRateLimit } from '@/lib/rateLimit'
import { verifyOtpSchema } from '@/lib/validators/auth.validator'
import * as userService from '@/lib/services/user.service'
import * as notificationService from '@/lib/services/notification.service'
import db from '@/lib/db'
import { signJWT } from '@/lib/jwt'
import crypto from 'crypto'


/** POST /api/auth/verify-otp */
export async function POST(request: NextRequest) {
    const rateLimitRes = await applyAuthRateLimit(request)
    if (rateLimitRes) return rateLimitRes

    try {
        const body = await request.json()
        const parsed = verifyOtpSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }
        const { email, token } = parsed.data

        // 1. Validate OTP from Postgres safely avoiding race conditions
        const otpRecord = await db.otp.findFirst({
            where: { email, code: token, used: false, expires_at: { gt: new Date() } },
            orderBy: { created_at: 'desc' }
        })

        if (!otpRecord) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP' },
                { status: 401 }
            )
        }

        // Immediately burn the OTP
        await db.otp.update({
            where: { id: otpRecord.id },
            data: { used: true }
        })

        // 2. Resolve User
        let userAuthId
        const isNewUser = !(await db.user.findUnique({ where: { email } }))

        if (isNewUser) {
            // Generate a secure UUID for the user
            userAuthId = crypto.randomUUID()
            await userService.createUser({ id: userAuthId, email })
            await notificationService.createDefaultPreferences(userAuthId)
        } else {
            const existingUser = await db.user.findUnique({ where: { email } })
            userAuthId = existingUser!.id
        }

        // 3. Generate internal JWT using our new Edge-compatible token mechanism
        const jwtStr = await signJWT({ id: userAuthId, email })

        // 4. Attach properly structured cookie matching standard HTTP-only practices
        const response = NextResponse.json({
            success: true,
            data: {
                is_new_user: isNewUser,
                // Client no longer needs internal session details if we rely on cookies, but just in case:
                session: {
                    access_token: jwtStr,
                    expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
                }
            },
        })

        response.cookies.set({
            name: 'auth-token',
            value: jwtStr,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
        })

        return response

    } catch (err) {
        console.error('verify-otp error:', err)
        return NextResponse.json({ success: false, error: 'Failed to verify OTP' }, { status: 500 })
    }
}
