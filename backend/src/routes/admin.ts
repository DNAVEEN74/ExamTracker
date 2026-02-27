import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(requireAuth, requireAdmin)

// ── Exam Queue ──────────────────────────────────────────────────────────────

/** GET /api/v1/admin/queue — PDF review queue (DRAFT/NEEDS_REVIEW exams) */
router.get('/queue', async (req, res) => {
    try {
        const { status = 'NEEDS_REVIEW', source, category } = req.query
        // TODO: Query exams WHERE status IN (DRAFT, NEEDS_REVIEW) ORDER BY application_end
        res.json({ success: true, data: [] })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get queue' })
    }
})

// ── Exams CRUD ──────────────────────────────────────────────────────────────

/** GET /api/v1/admin/exams — All exam records with filters */
router.get('/exams', async (req, res) => {
    try {
        const { page = '1', limit = '20', search, status, category } = req.query
        // TODO: Query exams with all filters
        res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get exams' })
    }
})

/** POST /api/v1/admin/exams — Create new exam record */
router.post('/exams', async (req, res) => {
    try {
        const examData = req.body
        // TODO: Validate all 8 field groups; insert into exams table
        res.status(201).json({ success: true, data: { id: null } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to create exam' })
    }
})

/** GET /api/v1/admin/exams/:id — Single exam for editing */
router.get('/exams/:id', async (req, res) => {
    try {
        const { id } = req.params
        // TODO: Fetch exam with pipeline_metadata for admin review
        res.json({ success: true, data: null })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get exam' })
    }
})

/** PUT /api/v1/admin/exams/:id — Update exam */
router.put('/exams/:id', async (req, res) => {
    try {
        const { id } = req.params
        // TODO: Update exam; if notification_verified changes to true, queue notifications
        res.json({ success: true, data: { updated: true } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update exam' })
    }
})

/** POST /api/v1/admin/exams/:id/approve — Approve exam and trigger notifications */
router.post('/exams/:id/approve', async (req, res) => {
    try {
        const { id } = req.params
        const { notify = true } = req.body
        // TODO: Set notification_verified=true, is_active=true
        // If notify=true: enqueue 'new_exam_notification' BullMQ job
        res.json({ success: true, data: { approved: true, notifications_queued: notify } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to approve exam' })
    }
})

/** POST /api/v1/admin/exams/:id/duplicate — Duplicate exam (for annual recurring exams) */
router.post('/exams/:id/duplicate', async (req, res) => {
    try {
        const { id } = req.params
        // TODO: Copy all fields, set status=DRAFT, clear dates, return new exam id
        res.status(201).json({ success: true, data: { new_id: null } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to duplicate exam' })
    }
})

// ── Analytics ────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/analytics — Key product metrics */
router.get('/analytics', async (req, res) => {
    try {
        // TODO: Run aggregation queries from PostgreSQL directly
        res.json({
            success: true,
            data: {
                total_users: 0,
                onboarding_completed: 0,
                daily_active_7d: 0,
                active_exams: 0,
                exams_closing_7d: 0,
                emails_sent_today: 0,
                notification_failures_24h: 0,
            },
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get analytics' })
    }
})

// ── Site Health ───────────────────────────────────────────────────────────────

/** GET /api/v1/admin/health/scrapers — Scraper status per monitored site */
router.get('/health/scrapers', async (req, res) => {
    try {
        // TODO: Query scraper_log, group by source_id, get latest per site
        res.json({ success: true, data: [] })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get scraper health' })
    }
})

export default router
