import db from '@/lib/db'
import type { Exam, TrackedExam } from '@/types/api'

/** Paginated exam list for admin panel with optional filters */
export async function getExams(opts: {
    page?: number
    limit?: number
    search?: string
    status?: string
    category?: string
}) {
    const { page = 1, limit = 20, search, status, category } = opts
    const offset = (page - 1) * limit

    const where: any = {}
    if (search) where.name = { contains: search, mode: 'insensitive' }
    if (category) where.category = category
    if (status === 'NEEDS_REVIEW') {
        where.notification_verified = false
        where.is_active = false
    } else if (status === 'ACTIVE') {
        where.is_active = true
    } else if (status === 'CANCELLED') {
        where.is_cancelled = true
    }

    try {
        const [exams, total] = await Promise.all([
            db.exam.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            db.exam.count({ where })
        ])
        return { exams: exams as unknown as Exam[], total }
    } catch (error: any) {
        throw new Error(`Failed to fetch exams: ${error.message}`)
    }
}

/** Single exam detail */
export async function getExamById(id: string): Promise<Exam | null> {
    try {
        const exam = await db.exam.findUnique({ where: { id } })
        return exam as unknown as Exam | null
    } catch (error: any) {
        throw new Error(`Failed to fetch exam: ${error.message}`)
    }
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

/** Create a new exam record */
export async function createExam(data: Record<string, any>, createdBy: string) {
    const slug = `${slugify(data.name as string)}-${Date.now()}`

    try {
        const exam = await db.exam.create({
            data: {
                ...data,
                slug,
                created_by: createdBy,
                data_source: 'MANUAL',
                notification_verified: false,
                is_active: false,
            } as any
        })
        return exam as unknown as Exam
    } catch (error: any) {
        throw new Error(`Failed to create exam: ${error.message}`)
    }
}

/** Update an existing exam */
export async function updateExam(id: string, data: Record<string, any>) {
    try {
        const exam = await db.exam.update({
            where: { id },
            data
        })
        return exam as unknown as Exam
    } catch (error: any) {
        throw new Error(`Failed to update exam: ${error.message}`)
    }
}

/** Approve exam — sets notification_verified + is_active */
export async function approveExam(id: string) {
    try {
        const exam = await db.exam.update({
            where: { id },
            data: {
                notification_verified: true,
                is_active: true,
                last_verified_at: new Date(),
            }
        })
        return exam as unknown as Exam
    } catch (error: any) {
        throw new Error(`Failed to approve exam: ${error.message}`)
    }
}

/** Duplicate an exam (for annual re-runs) — new row with cleared dates */
export async function duplicateExam(id: string, createdBy: string) {
    const exam = await getExamById(id)
    if (!exam) throw new Error('Exam not found')

    const newSlug = `${slugify(exam.name)}-${Date.now()}`
    const { id: _id, slug: _slug, created_at: _ca, updated_at: _ua, last_verified_at: _lva, ...rest } = exam

    try {
        const newExam = await db.exam.create({
            data: {
                ...(rest as any),
                slug: newSlug,
                is_active: false,
                notification_verified: false,
                application_start: null,
                application_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                exam_date: null,
                admit_card_date: null,
                result_date: null,
                notification_date: null,
                created_by: createdBy,
            }
        })
        return newExam as unknown as Exam
    } catch (error: any) {
        throw new Error(`Failed to duplicate exam: ${error.message}`)
    }
}

/** Full-text search on exam name/short_name */
export async function searchExams(query: string): Promise<Exam[]> {
    try {
        const exams = await db.exam.findMany({
            where: {
                is_active: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { short_name: { contains: query, mode: 'insensitive' } },
                    { conducting_body: { contains: query, mode: 'insensitive' } }
                ]
            },
            orderBy: { application_end: 'asc' },
            take: 20
        })
        return exams as unknown as Exam[]
    } catch (error: any) {
        throw new Error(`Search failed: ${error.message}`)
    }
}

/** Track an exam for a user */
export async function trackExam(userId: string, examId: string) {
    try {
        const data = await db.trackedExam.upsert({
            where: {
                user_id_exam_id: { user_id: userId, exam_id: examId }
            },
            update: { status: 'TRACKING' },
            create: { user_id: userId, exam_id: examId, status: 'TRACKING' }
        })
        return data as unknown as TrackedExam
    } catch (error: any) {
        throw new Error(`Failed to track exam: ${error.message}`)
    }
}

/** Untrack an exam */
export async function untrackExam(userId: string, examId: string) {
    try {
        await db.trackedExam.delete({
            where: {
                user_id_exam_id: { user_id: userId, exam_id: examId }
            }
        })
        return true
    } catch (error: any) {
        throw new Error(`Failed to untrack exam: ${error.message}`)
    }
}

/** Get all tracked exams for a user with exam details joined */
export async function getTrackedExams(userId: string): Promise<TrackedExam[]> {
    try {
        const data = await db.trackedExam.findMany({
            where: { user_id: userId },
            include: { exam: true },
            orderBy: { tracked_at: 'desc' }
        })
        return data as unknown as TrackedExam[]
    } catch (error: any) {
        throw new Error(`Failed to get tracked exams: ${error.message}`)
    }
}

/** Get tracked exams ordered by upcoming application deadline */
export async function getUpcomingDeadlines(userId: string): Promise<TrackedExam[]> {
    try {
        const data = await db.trackedExam.findMany({
            where: { user_id: userId },
            include: { exam: true },
            orderBy: {
                exam: { application_end: 'asc' }
            },
            take: 10
        })
        return data as unknown as TrackedExam[]
    } catch (error: any) {
        throw new Error(`Failed to get deadlines: ${error.message}`)
    }
}

/** Get exams with NEEDS_REVIEW status for the admin queue */
export async function getReviewQueue(opts: { status?: string; category?: string }) {
    const where: any = { notification_verified: false }
    if (opts.category) where.category = opts.category

    try {
        const data = await db.exam.findMany({
            where,
            orderBy: { application_end: 'asc' }
        })
        return data as unknown as Exam[]
    } catch (error: any) {
        throw new Error(`Failed to get review queue: ${error.message}`)
    }
}
