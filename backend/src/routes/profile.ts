import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/profile — Get full user + profile data */
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Join users + user_profiles + notification_preferences
        res.json({ success: true, data: null })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get profile' })
    }
})

/** PUT /api/v1/profile — Update profile fields */
router.put('/', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Update user_profiles; re-run eligibility for changed fields
        res.json({ success: true, data: { updated: true } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update profile' })
    }
})

/**
 * GET /api/v1/profile/eligibility-summary
 * Quick stats: total eligible, closing soon, newly opened
 */
router.get('/eligibility-summary', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Run eligibility query, return summary counts
        res.json({ success: true, data: { total_eligible: 0, closing_soon: 0, newly_opened: 0 } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get eligibility summary' })
    }
})

export default router
