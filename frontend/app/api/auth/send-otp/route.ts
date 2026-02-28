import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { applyAuthRateLimit } from '@/lib/rateLimit'
import { sendOtpSchema } from '@/lib/validators/auth.validator'

/** POST /api/auth/send-otp */
export async function POST(request: NextRequest) {
    const rateLimitRes = await applyAuthRateLimit(request)
    if (rateLimitRes) return rateLimitRes

    try {
        const body = await request.json()
        const parsed = sendOtpSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }

        const { email } = parsed.data
        const { error } = await supabaseAdmin.auth.signInWithOtp({ email })
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 429 })
        }

        return NextResponse.json({ success: true, data: { message: 'OTP sent', cooldown_seconds: 60 } })
    } catch (err) {
        console.error('send-otp error:', err)
        return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 })
    }
}
