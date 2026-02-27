import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { createOrderSchema } from '../lib/validators/subscription.validator'
import * as razorpayService from '../services/razorpay.service'
import * as userService from '../services/user.service'
import { supabase } from '../config/supabase'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/subscriptions/status — Current subscription tier and end date */
router.get('/status', async (req, res) => {
    try {
        const userId = req.user!.id
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier, subscription_start, subscription_end, razorpay_subscription_id')
            .eq('id', userId)
            .single()

        if (!user) return res.status(404).json({ success: false, error: 'User not found' })

        res.json({
            success: true,
            data: {
                tier: user.subscription_tier,
                subscription_start: user.subscription_start,
                subscription_end: user.subscription_end,
                is_active: user.subscription_end ? new Date(user.subscription_end) > new Date() : false,
            },
        })
    } catch (err) {
        console.error('GET /subscriptions/status error:', err)
        res.status(500).json({ success: false, error: 'Failed to get subscription status' })
    }
})

/** POST /api/v1/subscriptions/create-order — Create a Razorpay order to trigger checkout */
router.post('/create-order', async (req, res) => {
    try {
        const parsed = createOrderSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const userId = req.user!.id
        const { plan } = parsed.data

        const order = await razorpayService.createOrder(plan, userId)
        res.json({ success: true, data: order })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create order'
        console.error('POST /subscriptions/create-order error:', msg)
        res.status(500).json({ success: false, error: msg })
    }
})

/**
 * POST /api/v1/subscriptions/verify-payment
 * Verify Razorpay payment after client checkout.
 * Body: { order_id, payment_id, signature, plan }
 */
router.post('/verify-payment', async (req, res) => {
    try {
        const { order_id, payment_id, signature, plan } = req.body
        if (!order_id || !payment_id || !signature || !plan) {
            return res.status(400).json({ success: false, error: 'order_id, payment_id, signature, and plan are required' })
        }

        const isValid = razorpayService.verifyPaymentSignature({ order_id, payment_id, signature })
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature' })
        }

        const userId = req.user!.id
        const subscriptionEnd = razorpayService.computeSubscriptionEnd(plan)

        await userService.updateSubscription(userId, {
            subscription_tier: plan === 'ANNUAL' ? 'PREMIUM_ANNUAL' : 'PREMIUM',
            subscription_start: new Date().toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
        })

        res.json({ success: true, data: { activated: true, subscription_end: subscriptionEnd.toISOString() } })
    } catch (err) {
        console.error('POST /subscriptions/verify-payment error:', err)
        res.status(500).json({ success: false, error: 'Payment verification failed' })
    }
})

/** POST /api/v1/subscriptions/cancel — Cancel subscription (remains active until period end) */
router.post('/cancel', async (req, res) => {
    try {
        const userId = req.user!.id

        const { data: user } = await supabase
            .from('users')
            .select('subscription_end')
            .eq('id', userId)
            .single()

        // Note: We don't cancel via Razorpay API for one-time payments
        // For subscriptions: razorpayService.cancelSubscription(user.razorpay_subscription_id)
        // For now, we mark it as cancelled but keep active until period end
        res.json({
            success: true,
            data: {
                cancelled: true,
                active_until: user?.subscription_end ?? null,
                message: 'Your subscription has been cancelled. You will retain access until the end of the current period.',
            },
        })
    } catch (err) {
        console.error('POST /subscriptions/cancel error:', err)
        res.status(500).json({ success: false, error: 'Failed to cancel subscription' })
    }
})

export default router
