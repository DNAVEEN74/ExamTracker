import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { updateProfileSchema } from '../lib/validators/onboarding.validator'
import * as userService from '../services/user.service'
import * as eligibilityService from '../services/eligibility.service'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/profile — Full user + profile + notification preferences */
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id
        const data = await userService.getUserWithProfile(userId)
        if (!data) {
            return res.status(404).json({ success: false, error: 'User not found' })
        }
        res.json({ success: true, data })
    } catch (err) {
        console.error('GET /profile error:', err)
        res.status(500).json({ success: false, error: 'Failed to get profile' })
    }
})

/** PUT /api/v1/profile — Update profile fields */
router.put('/', async (req, res) => {
    try {
        const parsed = updateProfileSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const userId = req.user!.id
        await userService.upsertProfile(userId, parsed.data)

        const updated = await userService.getUserWithProfile(userId)
        res.json({ success: true, data: updated })
    } catch (err) {
        console.error('PUT /profile error:', err)
        res.status(500).json({ success: false, error: 'Failed to update profile' })
    }
})

/** GET /api/v1/profile/eligibility-summary — Quick counts: total, closing soon, newly opened */
router.get('/eligibility-summary', async (req, res) => {
    try {
        const userId = req.user!.id
        const summary = await eligibilityService.getEligibilitySummary(userId)
        res.json({ success: true, data: summary })
    } catch (err) {
        console.error('GET /profile/eligibility-summary error:', err)
        res.status(500).json({ success: false, error: 'Failed to get eligibility summary' })
    }
})

export default router
