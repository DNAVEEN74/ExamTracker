import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { trackExamSchema } from '../lib/validators/exam.validator'
import * as eligibilityService from '../services/eligibility.service'
import * as examService from '../services/exam.service'
import { supabase } from '../config/supabase'

const router = Router()
router.use(requireAuth)

/** GET /api/v1/exams — All eligible exams for the user (paginated) */
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id
        const page = parseInt(req.query.page as string) || 1
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
        const category = req.query.category as string | undefined
        const closing_in_days = req.query.closing_in_days as string | undefined

        const { exams, total } = await eligibilityService.getEligibleExams(userId, {
            page, limit, category, closing_in_days: closing_in_days?.toString(),
        })

        res.json({
            success: true,
            data: exams,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (err) {
        console.error('GET /exams error:', err)
        res.status(500).json({ success: false, error: 'Failed to get exams' })
    }
})

/** GET /api/v1/exams/search — Full-text exam search */
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q as string
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'q must be at least 2 characters' })
        }
        const exams = await examService.searchExams(q.trim())
        res.json({ success: true, data: exams })
    } catch (err) {
        console.error('GET /exams/search error:', err)
        res.status(500).json({ success: false, error: 'Search failed' })
    }
})

/** GET /api/v1/exams/categories — Available exam categories */
router.get('/categories', (_req, res) => {
    const categories = ['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER']
    res.json({ success: true, data: categories })
})

/** GET /api/v1/exams/tracked — All tracked exams for the user */
router.get('/tracked', async (req, res) => {
    try {
        const userId = req.user!.id
        const tracked = await examService.getTrackedExams(userId)
        res.json({ success: true, data: tracked })
    } catch (err) {
        console.error('GET /exams/tracked error:', err)
        res.status(500).json({ success: false, error: 'Failed to get tracked exams' })
    }
})

/** POST /api/v1/exams/track — Track an exam */
router.post('/track', async (req, res) => {
    try {
        const parsed = trackExamSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0].message })
        }
        const userId = req.user!.id
        const tracked = await examService.trackExam(userId, parsed.data.exam_id)
        res.json({ success: true, data: tracked })
    } catch (err) {
        console.error('POST /exams/track error:', err)
        res.status(500).json({ success: false, error: 'Failed to track exam' })
    }
})

/** GET /api/v1/exams/:id — Single exam detail with user eligibility flag */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user!.id
        const exam = await examService.getExamById(id)
        if (!exam) {
            return res.status(404).json({ success: false, error: 'Exam not found' })
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()

        const eligibilityFlag = eligibilityService.computeEligibilityFlag(
            profile as Record<string, unknown> | null,
            exam as unknown as Record<string, unknown>
        )

        res.json({ success: true, data: { ...exam, eligibility_flag: eligibilityFlag } })
    } catch (err) {
        console.error('GET /exams/:id error:', err)
        res.status(500).json({ success: false, error: 'Failed to get exam' })
    }
})

/** DELETE /api/v1/exams/:id/untrack — Untrack an exam */
router.delete('/:id/untrack', async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user!.id
        await examService.untrackExam(userId, id)
        res.json({ success: true, data: { untracked: true, exam_id: id } })
    } catch (err) {
        console.error('DELETE /exams/:id/untrack error:', err)
        res.status(500).json({ success: false, error: 'Failed to untrack exam' })
    }
})

export default router
