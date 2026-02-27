import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * POST /api/v1/auth/send-otp
 * Send OTP to phone via MSG91
 * Body: { phone: string }
 */
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body
        if (!phone) return res.status(400).json({ success: false, error: 'phone is required' })
        // TODO: Implement MSG91 OTP send via Supabase SMS hook
        res.json({ success: true, data: { message: 'OTP sent', cooldown_seconds: 60 } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to send OTP' })
    }
})

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP, return JWT session
 * Body: { phone: string, token: string }
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, token } = req.body
        if (!phone || !token) return res.status(400).json({ success: false, error: 'phone and token are required' })
        // TODO: Verify via Supabase Auth
        res.json({ success: true, data: { session: null } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to verify OTP' })
    }
})

/**
 * POST /api/v1/auth/google
 * Exchange Google OAuth code for session
 * Body: { code: string }
 */
router.post('/google', async (req, res) => {
    try {
        // Handled by Supabase Auth directly via /auth/callback route in Next.js
        res.json({ success: true, data: { message: 'Use Supabase OAuth flow' } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Google auth failed' })
    }
})

/**
 * POST /api/v1/auth/logout
 * Invalidate session
 */
router.post('/logout', requireAuth, async (req, res) => {
    try {
        // TODO: Invalidate Supabase session
        res.json({ success: true, data: { message: 'Logged out' } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Logout failed' })
    }
})

export default router
