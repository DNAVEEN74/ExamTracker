import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { onboardingModeSchema, updateProfileSchema } from '../lib/validators/onboarding.validator'
import * as userService from '../services/user.service'
import * as eligibilityService from '../services/eligibility.service'

const router = Router()
router.use(requireAuth)

/** PUT /api/v1/onboarding/mode — Set onboarding mode */
router.put('/mode', async (req, res) => {
    try {
        const parsed = onboardingModeSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const { mode } = parsed.data
        const userId = req.user!.id

        await userService.upsertProfile(userId, { onboarding_step: 2 })
        await require('../config/supabase').supabase
            .from('users')
            .update({ onboarding_mode: mode, updated_at: new Date().toISOString() })
            .eq('id', userId)

        res.json({ success: true, data: { mode } })
    } catch (err) {
        console.error('onboarding/mode error:', err)
        res.status(500).json({ success: false, error: 'Failed to update mode' })
    }
})

/** PUT /api/v1/onboarding/profile — Incremental profile save (called after each step) */
router.put('/profile', async (req, res) => {
    try {
        const parsed = updateProfileSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }

        const userId = req.user!.id
        await userService.upsertProfile(userId, parsed.data)

        res.json({ success: true, data: { updated: true } })
    } catch (err) {
        console.error('onboarding/profile error:', err)
        res.status(500).json({ success: false, error: 'Failed to save profile' })
    }
})

/** POST /api/v1/onboarding/complete — Mark onboarding complete, run initial eligibility match */
router.post('/complete', async (req, res) => {
    try {
        const userId = req.user!.id
        await userService.markOnboardingComplete(userId)

        // Run initial eligibility match and return count
        const summary = await eligibilityService.getEligibilitySummary(userId)

        res.json({
            success: true,
            data: {
                onboarding_completed: true,
                matched_exams: summary.total_eligible,
                closing_soon: summary.closing_soon,
                newly_opened: summary.newly_opened,
            },
        })
    } catch (err) {
        console.error('onboarding/complete error:', err)
        res.status(500).json({ success: false, error: 'Failed to complete onboarding' })
    }
})

export default router
