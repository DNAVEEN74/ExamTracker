import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

/** PUT /api/v1/onboarding/mode — Set onboarding mode (FOCUSED/DISCOVERY/VACANCY_AWARE) */
router.put('/mode', async (req, res) => {
    try {
        const { mode } = req.body
        const validModes = ['FOCUSED', 'DISCOVERY', 'VACANCY_AWARE', 'COMPREHENSIVE']
        if (!validModes.includes(mode)) return res.status(400).json({ success: false, error: 'Invalid mode' })
        // TODO: Update users.onboarding_mode
        res.json({ success: true, data: { mode } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update mode' })
    }
})

/** PUT /api/v1/onboarding/profile — Incremental profile save (called after each step) */
router.put('/profile', async (req, res) => {
    try {
        const userId = req.user!.id
        const profileData = req.body
        // TODO: Upsert user_profiles row incrementally; update onboarding_step
        res.json({ success: true, data: { updated: true } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to save profile' })
    }
})

/** POST /api/v1/onboarding/complete — Mark onboarding complete, trigger eligibility match */
router.post('/complete', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Set onboarding_completed=true, run initial eligibility query, return matched exams count
        res.json({ success: true, data: { onboarding_completed: true, matched_exams: 0 } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to complete onboarding' })
    }
})

export default router
