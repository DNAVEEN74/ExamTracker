import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/subscriptions/status — Current subscription tier */
router.get('/status', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Query users.subscription_tier, subscription_end
        res.json({ success: true, data: { tier: 'FREE', subscription_end: null } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get subscription status' })
    }
})

/** POST /api/v1/subscriptions/create-order — Create Razorpay order for payment */
router.post('/create-order', async (req, res) => {
    try {
        const { plan } = req.body // 'MONTHLY' | 'ANNUAL'
        const amount = plan === 'ANNUAL' ? 39900 : 4900 // in paise
        // TODO: Create Razorpay order, return order_id for frontend
        res.json({ success: true, data: { order_id: null, amount, currency: 'INR' } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to create order' })
    }
})

/** POST /api/v1/subscriptions/webhook — Razorpay webhook (verify & activate subscription) */
router.post('/webhook', async (req, res) => {
    try {
        // TODO: Verify Razorpay signature, activate/cancel subscription in DB
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Webhook processing failed' })
    }
})

/** POST /api/v1/subscriptions/cancel — Cancel subscription */
router.post('/cancel', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Cancel Razorpay subscription, update DB (subscription remains active until period end)
        res.json({ success: true, data: { cancelled: true, active_until: null } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to cancel subscription' })
    }
})

export default router
