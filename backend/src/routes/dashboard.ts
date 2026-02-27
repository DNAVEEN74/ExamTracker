import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/dashboard — Personalized dashboard data */
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Return eligible_exams, closing_soon, newly_opened, tracked count
        res.json({
            success: true,
            data: {
                eligible_exams: [],
                closing_soon: [],
                newly_opened: [],
                total_tracked: 0,
                upcoming_deadlines: [],
            },
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load dashboard' })
    }
})

/** GET /api/v1/dashboard/deadlines — Upcoming deadlines for tracked exams */
router.get('/deadlines', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Query tracked_exams JOIN exams ORDER BY application_end
        res.json({ success: true, data: [] })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get deadlines' })
    }
})

/** GET /api/v1/dashboard/new-matches — New eligible exams since last visit */
router.get('/new-matches', async (req, res) => {
    try {
        const userId = req.user!.id
        // TODO: Query exams approved after user.last_active_at that match eligibility
        res.json({ success: true, data: [] })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get new matches' })
    }
})

export default router
