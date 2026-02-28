import { Router } from 'express'
import { env } from '../config/env'
import { sendOtpEmail } from '../lib/email/email.service'

const router = Router()

/**
 * Supabase Auth Custom Email Hook endpoint
 * This expects a POST request from Supabase whenever an auth email is triggered.
 * Supabase will send a JSON payload with user context and the generated OTP.
 */
router.post('/auth/email', async (req, res) => {
    // 1. Authenticate the webhook request (Optional but recommended)
    const secret = req.headers['x-supabase-webhook-secret']
    if (env.SUPABASE_WEBHOOK_SECRET && secret !== env.SUPABASE_WEBHOOK_SECRET) {
        return res.status(401).json({ success: false, error: 'Unauthorized webhook request' })
    }

    try {
        const { user, email_data } = req.body

        // Safely extract token and destination
        const destinationEmail = user?.email
        const token = email_data?.token // The 6-digit OTP Supabase generated (token_hash is NOT the OTP)

        if (!destinationEmail || !token) {
            console.error('Invalid webhook payload structure:', req.body)
            return res.status(400).json({ success: false, error: 'Missing required email payload fields' })
        }

        // We currently only intercept OTP verification/signup emails
        // Other types (e.g. magiclink, recovery) can be handled similarly
        if (email_data?.email_action_type === 'signup' || email_data?.email_action_type === 'login') {
            const result = await sendOtpEmail(destinationEmail, token)

            if (!result.success) {
                return res.status(500).json({ success: false, error: result.error })
            }
        }

        // Must return 200 OK so Supabase knows the hook succeeded
        res.status(200).json({ success: true })

    } catch (err) {
        console.error('Auth email hook error:', err)
        res.status(500).json({ success: false, error: 'Internal server error processing email hook' })
    }
})

export default router
