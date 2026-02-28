import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { applyAuthRateLimit } from '@/lib/rateLimit'
import { verifyOtpSchema } from '@/lib/validators/auth.validator'
import * as userService from '@/lib/services/user.service'
import * as notificationService from '@/lib/services/notification.service'

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

        const { data, error } = await supabaseAdmin.auth.verifyOtp({
            email,
            token,
            type: 'email',
        })

        if (error || !data.session) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP' },
                { status: 401 }
            )
        }

        const supabaseUser = data.user!
        const isNewUser = !(await userService.userExists(supabaseUser.id))

        if (isNewUser) {
            await userService.createUser({ id: supabaseUser.id, email })
            await notificationService.createDefaultPreferences(supabaseUser.id)
        }

        return NextResponse.json({
            success: true,
            data: {
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at,
                },
                is_new_user: isNewUser,
            },
        })
    } catch (err) {
        console.error('verify-otp error:', err)
        return NextResponse.json({ success: false, error: 'Failed to verify OTP' }, { status: 500 })
    }
}
