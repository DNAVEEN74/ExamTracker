import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import type { Exam, EligibilitySummary, EligibilityFlag, Category } from '@/types/api'

const QUALIFICATION_ORDER: Record<string, number> = {
    CLASS_10: 1,
    CLASS_12: 2,
    ITI: 3,
    DIPLOMA: 4,
    GRADUATION: 5,
    POST_GRADUATION: 6,
    DOCTORATE: 7,
    PROFESSIONAL_CA: 5,
    PROFESSIONAL_CS: 5,
    PROFESSIONAL_ICWA: 5,
    PROFESSIONAL_LLB: 5,
    PROFESSIONAL_MBBS: 5,
    PROFESSIONAL_BED: 5,
}

export interface EligibleExamsOptions {
    page?: number
    limit?: number
    category?: string
    closing_in_days?: string
}

/**
 * Runs the eligibility matching query via Supabase RPC.
 * Falls back to a direct query if the RPC function isn't deployed yet.
 */
export async function getEligibleExams(
    userId: string,
    opts: EligibleExamsOptions = {}
): Promise<{ exams: Exam[]; total: number }> {
    const { page = 1, limit = 20, category, closing_in_days } = opts
    const offset = (page - 1) * limit

    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
            'get_eligible_exams_for_user',
            { user_id: userId }
        )

        if (!rpcError && rpcData) {
            let results: Exam[] = rpcData

            if (category) results = results.filter((e) => e.category === category)
            if (closing_in_days) {
                const cutoff = new Date()
                cutoff.setDate(cutoff.getDate() + Number(closing_in_days))
                results = results.filter((e) => new Date(e.application_end) <= cutoff)
            }

            const total = results.length
            return { exams: results.slice(offset, offset + limit), total }
        }
    } catch {
        // RPC not deployed — fall through to direct query
    }

    // ── Direct query fallback ──────────────────────────────────────────────────
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    if (!profile) return { exams: [], total: 0 }

    const { data: user } = await supabase
        .from('users')
        .select('onboarding_mode')
        .eq('id', userId)
        .single()

    let query = supabase
        .from('exams')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .eq('is_cancelled', false)
        .gte('application_end', new Date().toISOString().split('T')[0])
        .order('application_end', { ascending: true })

    if (category) query = query.eq('category', category)
    if (closing_in_days) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + Number(closing_in_days))
        query = query.lte('application_end', cutoff.toISOString().split('T')[0])
    }
    if (profile.exam_categories?.length) {
        query = query.in('category', profile.exam_categories)
    }

    const { data: exams, count, error } = await query.range(offset, offset + limit - 1)
    if (error) throw new Error(`Exam query failed: ${error.message}`)

    const filtered = (exams ?? []).filter((exam) =>
        isEligibleClientSide(profile, user?.onboarding_mode ?? 'DISCOVERY', exam)
    )

    return { exams: filtered, total: count ?? 0 }
}

function isEligibleClientSide(
    profile: Record<string, unknown>,
    mode: string,
    exam: Record<string, unknown>
): boolean {
    const dob = profile.date_of_birth as string
    if (!dob) return true

    const ageCutoff = (exam.age_cutoff_date as string) || (exam.application_end as string)
    const age = (new Date(ageCutoff).getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    const maxAge = (exam.max_age_general as number) ?? 99
    const minAge = (exam.min_age as number) ?? 0
    if (age < minAge || age > maxAge) return false

    const userQual = QUALIFICATION_ORDER[profile.highest_qualification as string] ?? 5
    const reqQual = QUALIFICATION_ORDER[exam.required_qualification as string] ?? 5
    if (userQual < reqQual) return false

    if (exam.gender_restriction && exam.gender_restriction !== profile.gender) return false

    if (mode === 'VACANCY_AWARE' && exam.vacancies_by_category) {
        const vac = exam.vacancies_by_category as Record<string, number>
        const cat = (profile.category as Category) ?? 'GENERAL'
        const categoryKey = { OBC_NCL: 'obc', SC: 'sc', ST: 'st', EWS: 'ews', OBC_CL: 'general', GENERAL: 'general' }[cat] ?? 'general'
        if ((vac[categoryKey] ?? 0) <= 0) return false
    }

    return true
}

/** Quick summary counts for dashboard + profile page */
export async function getEligibilitySummary(userId: string): Promise<EligibilitySummary> {
    const { exams: allExams } = await getEligibleExams(userId, { limit: 1000 })

    const now = new Date()
    const sevenDays = new Date(now)
    sevenDays.setDate(now.getDate() + 7)

    const { data: user } = await supabase
        .from('users')
        .select('last_active_at')
        .eq('id', userId)
        .single()

    const lastActive = user?.last_active_at ? new Date(user.last_active_at) : new Date(0)

    return {
        total_eligible: allExams.length,
        closing_soon: allExams.filter((e) => new Date(e.application_end) <= sevenDays).length,
        newly_opened: allExams.filter((e) => new Date(e.created_at!) >= lastActive).length,
    }
}

/** Compute eligibility confidence flag for a single exam */
export function computeEligibilityFlag(
    profile: Record<string, unknown> | null,
    exam: Record<string, unknown>
): EligibilityFlag {
    if (!profile) return 'CHECK_REQUIRED'

    const missing: string[] = []
    if (!profile.date_of_birth) missing.push('date_of_birth')
    if (!profile.category) missing.push('category')
    if (!profile.highest_qualification) missing.push('highest_qualification')
    if (!profile.domicile_state) missing.push('domicile_state')
    if (!profile.gender) missing.push('gender')

    if (missing.length >= 3) return 'CHECK_REQUIRED'

    const isEligible = isEligibleClientSide(profile, 'DISCOVERY', exam)
    if (!isEligible) return 'INELIGIBLE'
    if (missing.length > 0) return 'LIKELY_ELIGIBLE'
    return 'ELIGIBLE'
}
