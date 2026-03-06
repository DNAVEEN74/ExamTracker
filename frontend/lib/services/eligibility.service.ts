import db from '@/lib/db'
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
 * Runs the eligibility matching query. Direct Prisma conversion without RPC fallback.
 */
export async function getEligibleExams(
    userId: string,
    opts: EligibleExamsOptions = {}
): Promise<{ exams: Exam[]; total: number }> {
    const { page = 1, limit = 20, category, closing_in_days } = opts
    const offset = (page - 1) * limit

    const profile = await db.userProfile.findUnique({
        where: { user_id: userId }
    })

    if (!profile) return { exams: [], total: 0 }

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { onboarding_mode: true }
    })

    const where: any = {
        is_active: true,
        is_cancelled: false,
        application_end: {
            gte: new Date(new Date().toISOString().split('T')[0])
        }
    }

    if (category) where.category = category
    if (closing_in_days) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + Number(closing_in_days))
        where.application_end.lte = new Date(cutoff.toISOString().split('T')[0])
    }
    if (profile.exam_categories?.length) {
        where.category = { in: profile.exam_categories }
    }

    try {
        const [exams, count] = await Promise.all([
            db.exam.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { application_end: 'asc' }
            }),
            db.exam.count({ where })
        ])

        const filtered = (exams ?? []).filter((exam) =>
            isEligibleClientSide(profile, user?.onboarding_mode ?? 'DISCOVERY', exam)
        )

        return { exams: filtered as unknown as Exam[], total: count ?? 0 }
    } catch (error: any) {
        throw new Error(`Exam query failed: ${error.message}`)
    }
}

function isEligibleClientSide(
    profile: Record<string, unknown>,
    mode: string,
    exam: Record<string, unknown>
): boolean {
    const dob = profile.date_of_birth as Date | undefined
    if (!dob) return true

    const ageCutoff = (exam.age_cutoff_date as Date | undefined) || (exam.application_end as Date)
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

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { last_active_at: true }
    })

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
