import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { updateNotificationPreferencesSchema } from '../lib/validators/notification.validator'
import * as notificationService from '../services/notification.service'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/notifications/preferences — Get notification settings */
router.get('/preferences', async (req, res) => {
    try {
        const userId = req.user!.id
        const prefs = await notificationService.getPreferences(userId)
        res.json({ success: true, data: prefs })
    } catch (err) {
        console.error('GET /notifications/preferences error:', err)
        res.status(500).json({ success: false, error: 'Failed to get preferences' })
    }
})

/** PUT /api/v1/notifications/preferences — Update notification settings */
router.put('/preferences', async (req, res) => {
    try {
        const parsed = updateNotificationPreferencesSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const userId = req.user!.id
        const updated = await notificationService.upsertPreferences(userId, parsed.data as any)
        res.json({ success: true, data: updated })
    } catch (err) {
        console.error('PUT /notifications/preferences error:', err)
        res.status(500).json({ success: false, error: 'Failed to update preferences' })
    }
})

/** GET /api/v1/notifications/history — Past notifications received */
router.get('/history', async (req, res) => {
    try {
        const userId = req.user!.id
        const page = parseInt(req.query.page as string) || 1
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

        const { logs, total } = await notificationService.getNotificationHistory(userId, page, limit)
        res.json({
            success: true,
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (err) {
        console.error('GET /notifications/history error:', err)
        res.status(500).json({ success: false, error: 'Failed to get notification history' })
    }
})

/**
 * POST /api/v1/notifications/whatsapp-optin
 * Records WhatsApp consent with timestamp + IP (DPDPA 2023 compliance).
 * This is a legal requirement — the record is immutable.
 */
router.post('/whatsapp-optin', async (req, res) => {
    try {
        const userId = req.user!.id
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown'
        const result = await notificationService.recordWhatsAppConsent(userId, ip)
        res.json({ success: true, data: result })
    } catch (err) {
        console.error('POST /notifications/whatsapp-optin error:', err)
        res.status(500).json({ success: false, error: 'Failed to record WhatsApp opt-in' })
    }
})

export default router
