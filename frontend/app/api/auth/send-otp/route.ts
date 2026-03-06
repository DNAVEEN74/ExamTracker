export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { applyAuthRateLimit } from '@/lib/rateLimit'
import { sendOtpSchema } from '@/lib/validators/auth.validator'
import db from '@/lib/db'
import { sendEmail } from '@/lib/email/email.service'
import crypto from 'crypto'


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

        // Generate a 6 digit secure code
        const code = crypto.randomInt(100000, 999999).toString()

        // Expire in 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        // Store OTP in database
        await db.otp.create({
            data: { email, code, expires_at: expiresAt }
        })

        // Send via Resend natively mapped out from the existing email service
        await sendEmail({
            to: email,
            subject: 'Your ExamTracker Verification Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Welcome to ExamTracker!</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #4F46E5; letter-spacing: 4px;">${code}</h1>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
        })

        return NextResponse.json({ success: true, data: { message: 'OTP sent', cooldown_seconds: 60 } })
    } catch (err) {
        console.error('send-otp error:', err)
        return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 })
    }
}
