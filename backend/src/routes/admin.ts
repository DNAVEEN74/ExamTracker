import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { createExamSchema, updateExamSchema } from '../lib/validators/exam.validator'
import * as examService from '../services/exam.service'
import { supabase } from '../config/supabase'

const router = Router()
router.use(requireAuth, requireAdmin)

// ── Exam Queue ──────────────────────────────────────────────────────────────

/** GET /api/v1/admin/queue — PDF review queue (unverified exams pending review) */
router.get('/queue', async (req, res) => {
    try {
        const { category } = req.query
        const queue = await examService.getReviewQueue({ category: category as string | undefined })
        res.json({ success: true, data: queue })
    } catch (err) {
        console.error('GET /admin/queue error:', err)
        res.status(500).json({ success: false, error: 'Failed to get queue' })
    }
})

// ── Exams CRUD ──────────────────────────────────────────────────────────────

/** GET /api/v1/admin/exams — All exam records with filters */
router.get('/exams', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
        const search = req.query.search as string | undefined
        const status = req.query.status as string | undefined
        const category = req.query.category as string | undefined

        const { exams, total } = await examService.getExams({ page, limit, search, status, category })
        res.json({
            success: true,
            data: exams,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (err) {
        console.error('GET /admin/exams error:', err)
        res.status(500).json({ success: false, error: 'Failed to get exams' })
    }
})

/** POST /api/v1/admin/exams — Create new exam record */
router.post('/exams', async (req, res) => {
    try {
        const parsed = createExamSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
            })
        }
        const exam = await examService.createExam(parsed.data as Record<string, unknown>, req.user!.id)
        res.status(201).json({ success: true, data: exam })
    } catch (err) {
        console.error('POST /admin/exams error:', err)
        res.status(500).json({ success: false, error: 'Failed to create exam' })
    }
})

/** GET /api/v1/admin/exams/:id — Single exam for editing */
router.get('/exams/:id', async (req, res) => {
    try {
        const exam = await examService.getExamById(req.params.id)
        if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' })
        res.json({ success: true, data: exam })
    } catch (err) {
        console.error('GET /admin/exams/:id error:', err)
        res.status(500).json({ success: false, error: 'Failed to get exam' })
    }
})

/** PUT /api/v1/admin/exams/:id — Update exam */
router.put('/exams/:id', async (req, res) => {
    try {
        const parsed = updateExamSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
            })
        }
        const exam = await examService.updateExam(req.params.id, parsed.data as Record<string, unknown>)
        res.json({ success: true, data: exam })
    } catch (err) {
        console.error('PUT /admin/exams/:id error:', err)
        res.status(500).json({ success: false, error: 'Failed to update exam' })
    }
})

/** POST /api/v1/admin/exams/:id/approve — Verify and publish an exam */
router.post('/exams/:id/approve', async (req, res) => {
    try {
        const { notify = true } = req.body
        const exam = await examService.approveExam(req.params.id)

        let usersQueued = 0
        if (notify) {
            // Call queue_new_exam_notification(exam_id) SQL function via Supabase RPC.
            // This runs full eligibility matching in ONE SQL query and inserts one
            // notification_queue row per eligible user. The Supabase DB webhook then
            // fires automatically → POST /api/v1/webhooks/process-notifications → Resend.
            const { data, error: rpcError } = await supabase.rpc(
                'queue_new_exam_notification',
                { p_exam_id: req.params.id }
            )
            if (rpcError) {
                // Non-fatal: exam is approved, notification queue failed — log and continue
                console.error(`⚠️  queue_new_exam_notification failed for ${exam.name}:`, rpcError.message)
            } else {
                usersQueued = data as number ?? 0
                console.log(`📣 Queued NEW_EXAM notifications for ${usersQueued} eligible users → ${exam.name}`)
            }
        }

        res.json({
            success: true,
            data: {
                approved: true,
                notifications_queued: notify,
                users_queued: usersQueued,
                exam,
            },
        })
    } catch (err) {
        console.error('POST /admin/exams/:id/approve error:', err)
        res.status(500).json({ success: false, error: 'Failed to approve exam' })
    }
})

/** POST /api/v1/admin/exams/:id/duplicate — Duplicate exam (for annual cycles) */
router.post('/exams/:id/duplicate', async (req, res) => {
    try {
        const newExam = await examService.duplicateExam(req.params.id, req.user!.id)
        res.status(201).json({ success: true, data: { new_id: newExam.id, exam: newExam } })
    } catch (err) {
        console.error('POST /admin/exams/:id/duplicate error:', err)
        res.status(500).json({ success: false, error: 'Failed to duplicate exam' })
    }
})

// ── Analytics ─────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/analytics — Key product metrics */
router.get('/analytics', async (req, res) => {
    try {
        const now = new Date()
        const sevenDays = new Date(now)
        sevenDays.setDate(now.getDate() + 7)
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)

        const [
            { count: totalUsers },
            { count: onboardingCompleted },
            { count: activeExams },
            { count: examsClosing7d },
        ] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('onboarding_completed', true),
            supabase.from('exams').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('exams').select('id', { count: 'exact', head: true })
                .eq('is_active', true)
                .lte('application_end', sevenDays.toISOString().split('T')[0]),
        ])

        const { count: dau7d } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('last_active_at', sevenDaysAgo.toISOString())

        res.json({
            success: true,
            data: {
                total_users: totalUsers ?? 0,
                onboarding_completed: onboardingCompleted ?? 0,
                daily_active_7d: dau7d ?? 0,
                active_exams: activeExams ?? 0,
                exams_closing_7d: examsClosing7d ?? 0,
                emails_sent_today: 0,          // Requires notification_log table
                notification_failures_24h: 0,  // Requires notification_log table
            },
        })
    } catch (err) {
        console.error('GET /admin/analytics error:', err)
        res.status(500).json({ success: false, error: 'Failed to get analytics' })
    }
})

// ── Site Health ───────────────────────────────────────────────────────────────

/** GET /api/v1/admin/health/scrapers — Scraper status per monitored site */
router.get('/health/scrapers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('scraper_log')
            .select('source_id, status, queued_at, pdf_url')
            .order('queued_at', { ascending: false })
            .limit(50)

        if (error && error.code === '42P01') {
            // Table doesn't exist yet
            return res.json({ success: true, data: [] })
        }
        if (error) throw new Error(error.message)

        res.json({ success: true, data: data ?? [] })
    } catch (err) {
        console.error('GET /admin/health/scrapers error:', err)
        res.status(500).json({ success: false, error: 'Failed to get scraper health' })
    }
})

export default router
