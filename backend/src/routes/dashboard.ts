import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as eligibilityService from '../services/eligibility.service'
import * as examService from '../services/exam.service'
import * as userService from '../services/user.service'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/dashboard — Personalized dashboard data */
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id

        // Run eligibility in parallel with tracked exams + active update
        const [{ exams: allEligible }, trackedExams] = await Promise.all([
            eligibilityService.getEligibleExams(userId, { limit: 100 }),
            examService.getTrackedExams(userId),
        ])

        const now = new Date()
        const sevenDaysOut = new Date(now)
        sevenDaysOut.setDate(now.getDate() + 7)
        const threeDaysAgo = new Date(now)
        threeDaysAgo.setDate(now.getDate() - 3)

        const closingSoon = allEligible.filter(
            (e) => new Date(e.application_end) <= sevenDaysOut
        )
        const newlyOpened = allEligible.filter(
            (e) => new Date(e.created_at!) >= threeDaysAgo
        )

        // Update last_active_at for new-match tracking (non-blocking)
        userService.updateLastActive(userId).catch(() => { })

        res.json({
            success: true,
            data: {
                eligible_exams: allEligible.slice(0, 10),
                closing_soon: closingSoon.slice(0, 5),
                newly_opened: newlyOpened.slice(0, 5),
                total_tracked: trackedExams.length,
                upcoming_deadlines: trackedExams
                    .filter((t) => t.exam && new Date(t.exam.application_end) >= now)
                    .slice(0, 5),
            },
        })
    } catch (err) {
        console.error('GET /dashboard error:', err)
        res.status(500).json({ success: false, error: 'Failed to load dashboard' })
    }
})

/** GET /api/v1/dashboard/deadlines — Upcoming deadlines for tracked exams */
router.get('/deadlines', async (req, res) => {
    try {
        const userId = req.user!.id
        const deadlines = await examService.getUpcomingDeadlines(userId)
        res.json({ success: true, data: deadlines })
    } catch (err) {
        console.error('GET /dashboard/deadlines error:', err)
        res.status(500).json({ success: false, error: 'Failed to get deadlines' })
    }
})

/** GET /api/v1/dashboard/new-matches — New eligible exams since last visit */
router.get('/new-matches', async (req, res) => {
    try {
        const userId = req.user!.id

        const { data: user } = await require('../config/supabase').supabase
            .from('users')
            .select('last_active_at')
            .eq('id', userId)
            .single()

        const { exams } = await eligibilityService.getEligibleExams(userId, { limit: 50 })
        const lastActive = user?.last_active_at ? new Date(user.last_active_at) : new Date(0)

        const newMatches = exams.filter(
            (e) => new Date(e.created_at!) >= lastActive
        )

        // Update last_active_at now that user has seen new matches
        userService.updateLastActive(userId).catch(() => { })

        res.json({ success: true, data: newMatches })
    } catch (err) {
        console.error('GET /dashboard/new-matches error:', err)
        res.status(500).json({ success: false, error: 'Failed to get new matches' })
    }
})

export default router
