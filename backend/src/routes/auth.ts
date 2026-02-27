import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { requireAuth } from '../middleware/auth'
import { authRateLimiter } from '../middleware/rateLimit'
import { sendOtpSchema, verifyOtpSchema } from '../lib/validators/auth.validator'
import * as userService from '../services/user.service'
import * as notificationService from '../services/notification.service'

const router = Router()
router.use(authRateLimiter)

/**
 * POST /api/v1/auth/send-otp
 * Trigger Supabase phone OTP. Supabase handles the SMS via configured provider (Twilio/MSG91).
 * Body: { phone: string }  — must be +91XXXXXXXXXX format
 */
router.post('/send-otp', async (req, res) => {
    try {
        const parsed = sendOtpSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const { phone } = parsed.data

        const { error } = await supabase.auth.signInWithOtp({ phone })
        if (error) {
            // Supabase rate-limits OTP requests automatically
            return res.status(429).json({ success: false, error: error.message })
        }

        res.json({ success: true, data: { message: 'OTP sent', cooldown_seconds: 60 } })
    } catch (err) {
        console.error('send-otp error:', err)
        res.status(500).json({ success: false, error: 'Failed to send OTP' })
    }
})

/**
 * POST /api/v1/auth/verify-otp
 * Verify the 6-digit OTP and return JWT session + is_new_user flag.
 * Creates a user row in our `users` table if this is the first login.
 * Body: { phone: string, token: string }
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const parsed = verifyOtpSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const { phone, token } = parsed.data

        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms',
        })

        if (error || !data.session) {
            return res.status(401).json({ success: false, error: 'Invalid or expired OTP' })
        }

        const supabaseUser = data.user!
        const isNewUser = !(await userService.userExists(supabaseUser.id))

        if (isNewUser) {
            await userService.createUser({ id: supabaseUser.id, phone })
            // Create default notification preferences row
            await notificationService.createDefaultPreferences(supabaseUser.id)
        }

        res.json({
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
        res.status(500).json({ success: false, error: 'Failed to verify OTP' })
    }
})

/**
 * POST /api/v1/auth/google
 * Google OAuth is handled client-side by Supabase JS SDK.
 * This endpoint exists for documentation; redirect happens via Supabase's /auth/v1/authorize.
 */
router.post('/google', (_req, res) => {
    res.json({
        success: true,
        data: { message: 'Use the Supabase client-side OAuth flow (supabase.auth.signInWithOAuth)' },
    })
})

/**
 * POST /api/v1/auth/refresh
 * Exchange a refresh_token for a new access_token.
 * Body: { refresh_token: string }
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body
        if (!refresh_token) {
            return res.status(400).json({ success: false, error: 'refresh_token is required' })
        }

        const { data, error } = await supabase.auth.refreshSession({ refresh_token })
        if (error || !data.session) {
            return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' })
        }

        res.json({
            success: true,
            data: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Token refresh failed' })
    }
})

/**
 * POST /api/v1/auth/logout
 * Revokes the user's session on the Supabase side.
 */
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const authHeader = req.headers.authorization!
        const token = authHeader.replace('Bearer ', '')

        // Set the user's session so we can sign them out
        await supabase.auth.admin.signOut(token)

        res.json({ success: true, data: { message: 'Logged out successfully' } })
    } catch (err) {
        // Non-blocking: even if signout fails server-side, client should clear tokens
        res.json({ success: true, data: { message: 'Logged out' } })
    }
})

export default router
