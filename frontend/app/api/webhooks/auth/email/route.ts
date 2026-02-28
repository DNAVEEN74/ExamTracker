import { NextRequest, NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/email/email.service'

/**
 * POST /api/webhooks/auth/email
 * Supabase Auth Custom Email Hook endpoint.
 * Supabase fires this whenever it needs to send an auth email (OTP signup/login).
 * We intercept it and send via Resend with our branded template.
 */
export async function POST(request: NextRequest) {
    // Validate webhook secret
    const secret = request.headers.get('x-supabase-webhook-secret')
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized webhook request' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { user, email_data } = body

        const destinationEmail = user?.email
        const token = email_data?.token

        if (!destinationEmail || !token) {
            console.error('Invalid webhook payload structure:', body)
            return NextResponse.json(
                { success: false, error: 'Missing required email payload fields' },
                { status: 400 }
            )
        }

        if (email_data?.email_action_type === 'signup' || email_data?.email_action_type === 'login') {
            const result = await sendOtpEmail(destinationEmail, token)
            if (!result.success) {
                return NextResponse.json({ success: false, error: result.error }, { status: 500 })
            }
        }

        // Must return 200 OK so Supabase knows the hook succeeded
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Auth email hook error:', err)
        return NextResponse.json({ success: false, error: 'Internal server error processing email hook' }, { status: 500 })
    }
}
