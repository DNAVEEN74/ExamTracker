import Razorpay from 'razorpay'
import crypto from 'crypto'
import { env } from '../config/env'

const razorpay =
    env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
        ? new Razorpay({
            key_id: env.RAZORPAY_KEY_ID,
            key_secret: env.RAZORPAY_KEY_SECRET,
        })
        : null

/** Plan pricing config (in paise) */
export const PLAN_CONFIG = {
    MONTHLY: {
        amount: 4900,      // ₹49
        currency: 'INR',
        description: 'ExamTracker Premium Monthly',
    },
    ANNUAL: {
        amount: 39900,     // ₹399
        currency: 'INR',
        description: 'ExamTracker Premium Annual',
    },
} as const

/** Create a Razorpay order for one-time payment (used as upgrade trigger) */
export async function createOrder(plan: 'MONTHLY' | 'ANNUAL', userId: string) {
    if (!razorpay) {
        throw new Error('Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET')
    }

    const { amount, currency, description } = PLAN_CONFIG[plan]
    const receipt = `et_${userId.slice(0, 8)}_${Date.now()}`

    const order = await razorpay.orders.create({
        amount,
        currency,
        receipt,
        notes: {
            user_id: userId,
            plan,
            description,
        },
    })

    return {
        order_id: order.id,
        amount,
        currency,
        plan,
    }
}

/**
 * Verify Razorpay webhook HMAC signature.
 * Razorpay signs the raw request body with the webhook secret using SHA-256.
 */
export function verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string
): boolean {
    // Fail CLOSED — never skip verification even in dev.
    // Use Razorpay test mode credentials instead of bypassing this check.
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
        throw new Error(
            'RAZORPAY_WEBHOOK_SECRET is not set. Cannot verify webhook signature. ' +
            'Set this env var to your Razorpay webhook secret (test or production).'
        )
    }

    const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')

    // timingSafeEqual prevents timing attacks — both buffers must be same length
    if (expectedSignature.length !== signature.length) return false

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
    )
}

/** Verify payment signature after client-side checkout completion */
export function verifyPaymentSignature(params: {
    order_id: string
    payment_id: string
    signature: string
}): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return false

    const { order_id, payment_id, signature } = params
    const body = `${order_id}|${payment_id}`
    const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex')

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    )
}

/** Determine the new subscription end date based on plan */
export function computeSubscriptionEnd(plan: 'MONTHLY' | 'ANNUAL'): Date {
    const end = new Date()
    if (plan === 'ANNUAL') {
        end.setFullYear(end.getFullYear() + 1)
    } else {
        end.setMonth(end.getMonth() + 1)
    }
    return end
}
