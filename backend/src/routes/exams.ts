import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/exams — All eligible exams for the user (paginated) */
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '20', category, closing_in_days } = req.query
        // TODO: Run eligibility matching query with user profile
        res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get exams' })
    }
})

/** GET /api/v1/exams/search — Search exam catalog */
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query
        // TODO: PostgreSQL full-text search with pg_trgm
        res.json({ success: true, data: [] })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Search failed' })
    }
})

/** GET /api/v1/exams/categories — Available exam categories */
router.get('/categories', async (_req, res) => {
    const categories = ['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER']
    res.json({ success: true, data: categories })
})

/** GET /api/v1/exams/:id — Single exam detail */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        // TODO: Fetch exam + compute user eligibility flag + category vacancies
        res.json({ success: true, data: null })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get exam' })
    }
})

/** POST /api/v1/exams/track — Track an exam */
router.post('/track', async (req, res) => {
    try {
        const { exam_id } = req.body
        const userId = req.user!.id
        // TODO: Insert into tracked_exams
        res.json({ success: true, data: { tracked: true, exam_id } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to track exam' })
    }
})

/** DELETE /api/v1/exams/:id/untrack — Untrack an exam */
router.delete('/:id/untrack', async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user!.id
        // TODO: Delete from tracked_exams
        res.json({ success: true, data: { untracked: true } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to untrack exam' })
    }
})

export default router
