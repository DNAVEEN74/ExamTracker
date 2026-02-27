import { Router } from 'express'

const router = Router()

/**
 * POST /api/v1/webhooks/resend
 * Handles Resend email delivery events
 * Events: email.delivered, email.opened, email.clicked, email.bounced, email.spam_complained
 */
router.post('/resend', async (req, res) => {
    try {
        const event = req.body
        const { type, data } = event

        // TODO: Verify Resend webhook signature from headers

        switch (type) {
            case 'email.delivered':
                // UPDATE notification_log SET status='DELIVERED' WHERE resend_email_id = data.email_id
                break
            case 'email.opened':
                // UPDATE notification_log SET opened_at=NOW() WHERE resend_email_id = data.email_id
                break
            case 'email.clicked':
                // UPDATE notification_log SET clicked_at=NOW() WHERE resend_email_id = data.email_id
                break
            case 'email.bounced':
                // UPDATE notification_log SET status='BOUNCED'
                // UPDATE user_profiles SET email_notifications_enabled=false (hard bounce)
                break
            case 'email.spam_complained':
                // CRITICAL: Immediately disable all emails for this user
                // spam complaint rate > 0.1% will get Resend account flagged
                break
            default:
                console.log(`Unhandled Resend event type: ${type}`)
        }

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Webhook processing failed' })
    }
})

/**
 * POST /api/v1/webhooks/razorpay
 * Handles Razorpay payment events
 */
router.post('/razorpay', async (req, res) => {
    try {
        // TODO: Verify Razorpay signature, handle payment.captured / subscription.activated / subscription.cancelled
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Webhook processing failed' })
    }
})

/**
 * POST /api/v1/webhooks/parse-queue
 * Internal webhook: called by scraper when a new PDF is found
 * Triggers the PDF parsing pipeline
 */
router.post('/parse-queue', async (req, res) => {
    try {
        const authHeader = req.headers['x-internal-secret']
        if (authHeader !== process.env.INTERNAL_API_SECRET) {
            return res.status(401).json({ success: false, error: 'Unauthorized' })
        }
        const { pdf_url, source_id } = req.body
        // TODO: Enqueue BullMQ job 'parse_pdf' with { pdf_url, source_id }
        res.json({ success: true, data: { queued: true } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to queue PDF' })
    }
})

export default router
