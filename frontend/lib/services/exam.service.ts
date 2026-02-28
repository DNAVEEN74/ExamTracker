import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
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

    let query = supabase
        .from('exams')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

    if (search) query = query.ilike('name', `%${search}%`)
    if (category) query = query.eq('category', category)
    if (status === 'NEEDS_REVIEW') {
        query = query.eq('notification_verified', false).eq('is_active', false)
    } else if (status === 'ACTIVE') {
        query = query.eq('is_active', true)
    } else if (status === 'CANCELLED') {
        query = query.eq('is_cancelled', true)
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1)
    if (error) throw new Error(`Failed to fetch exams: ${error.message}`)

    return { exams: data ?? [], total: count ?? 0 }
}

/** Single exam detail */
export async function getExamById(id: string): Promise<Exam | null> {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) throw new Error(`Failed to fetch exam: ${error.message}`)
    return data
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
export async function createExam(data: Record<string, unknown>, createdBy: string) {
    const slug = `${slugify(data.name as string)}-${Date.now()}`

    const { data: exam, error } = await supabase
        .from('exams')
        .insert({
            ...data,
            slug,
            created_by: createdBy,
            data_source: 'MANUAL',
            notification_verified: false,
            is_active: false,
        })
        .select()
        .single()

    if (error) throw new Error(`Failed to create exam: ${error.message}`)
    return exam
}

/** Update an existing exam */
export async function updateExam(id: string, data: Record<string, unknown>) {
    const { data: exam, error } = await supabase
        .from('exams')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(`Failed to update exam: ${error.message}`)
    return exam
}

/** Approve exam — sets notification_verified + is_active */
export async function approveExam(id: string) {
    const { data: exam, error } = await supabase
        .from('exams')
        .update({
            notification_verified: true,
            is_active: true,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(`Failed to approve exam: ${error.message}`)
    return exam
}

/** Duplicate an exam (for annual re-runs) — new row with cleared dates */
export async function duplicateExam(id: string, createdBy: string) {
    const exam = await getExamById(id)
    if (!exam) throw new Error('Exam not found')

    const { id: _old, slug: _slug, created_at: _ca, updated_at: _ua, last_verified_at: _lva, ...rest } = exam
    const newSlug = `${slugify(exam.name)}-${Date.now()}`

    const { data: newExam, error } = await supabase
        .from('exams')
        .insert({
            ...rest,
            slug: newSlug,
            is_active: false,
            notification_verified: false,
            application_start: null,
            application_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            exam_date: null,
            admit_card_date: null,
            result_date: null,
            notification_date: null,
            created_by: createdBy,
        })
        .select()
        .single()

    if (error) throw new Error(`Failed to duplicate exam: ${error.message}`)
    return newExam
}

/** Full-text search on exam name/short_name */
export async function searchExams(query: string): Promise<Exam[]> {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .or(`name.ilike.%${query}%,short_name.ilike.%${query}%,conducting_body.ilike.%${query}%`)
        .eq('is_active', true)
        .order('application_end', { ascending: true })
        .limit(20)

    if (error) throw new Error(`Search failed: ${error.message}`)
    return data ?? []
}

/** Track an exam for a user */
export async function trackExam(userId: string, examId: string) {
    const { data, error } = await supabase
        .from('tracked_exams')
        .upsert(
            { user_id: userId, exam_id: examId, status: 'TRACKING' },
            { onConflict: 'user_id,exam_id' }
        )
        .select()
        .single()

    if (error) throw new Error(`Failed to track exam: ${error.message}`)
    return data
}

/** Untrack an exam */
export async function untrackExam(userId: string, examId: string) {
    const { error } = await supabase
        .from('tracked_exams')
        .delete()
        .eq('user_id', userId)
        .eq('exam_id', examId)

    if (error) throw new Error(`Failed to untrack exam: ${error.message}`)
    return true
}

/** Get all tracked exams for a user with exam details joined */
export async function getTrackedExams(userId: string): Promise<TrackedExam[]> {
    const { data, error } = await supabase
        .from('tracked_exams')
        .select(`*, exam:exams(*)`)
        .eq('user_id', userId)
        .order('tracked_at', { ascending: false })

    if (error) throw new Error(`Failed to get tracked exams: ${error.message}`)
    return (data ?? []) as TrackedExam[]
}

/** Get tracked exams ordered by upcoming application deadline */
export async function getUpcomingDeadlines(userId: string): Promise<TrackedExam[]> {
    const { data, error } = await supabase
        .from('tracked_exams')
        .select(`*, exam:exams(*)`)
        .eq('user_id', userId)
        .order('exam(application_end)', { ascending: true })
        .limit(10)

    if (error) throw new Error(`Failed to get deadlines: ${error.message}`)
    return (data ?? []) as TrackedExam[]
}

/** Get exams with NEEDS_REVIEW status for the admin queue */
export async function getReviewQueue(opts: { status?: string; category?: string }) {
    let query = supabase
        .from('exams')
        .select('*')
        .eq('notification_verified', false)
        .order('application_end', { ascending: true })

    if (opts.category) query = query.eq('category', opts.category)

    const { data, error } = await query
    if (error) throw new Error(`Failed to get review queue: ${error.message}`)
    return data ?? []
}
