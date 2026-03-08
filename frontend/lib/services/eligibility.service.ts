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
                orderBy: { application_end: 'asc' },
                include: {
                    posts: {
                        include: {
                            age_limits: true,
                            vacancies: true
                        }
                    }
                }
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

    const posts = (exam.posts as any[]) || []
    if (posts.length === 0) return true

    const userCat = (profile.category as string) || 'GENERAL'
    const userQual = QUALIFICATION_ORDER[profile.highest_qualification as string] ?? 5

    for (const post of posts) {
        let isPostEligible = true

        const ageCutoff = (post.age_cutoff_date as Date | undefined) || (exam.application_end as Date)
        const age = (new Date(ageCutoff).getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)

        const minAge = (post.min_age as number) ?? 0

        let maxAge = 99
        if (post.age_limits && Array.isArray(post.age_limits) && post.age_limits.length > 0) {
            let targetCat = 'GENERAL'
            if (userCat === 'OBC_NCL' || userCat === 'OBC_CL') targetCat = 'OBC'
            else if (userCat === 'SC' || userCat === 'ST') targetCat = 'SC_ST'
            else if (userCat === 'EWS') targetCat = 'EWS'

            const limitRecord = post.age_limits.find((l: any) => l.category === targetCat)
            if (limitRecord && limitRecord.max_age) {
                maxAge = limitRecord.max_age
            } else {
                const genLimit = post.age_limits.find((l: any) => l.category === 'GENERAL')
                if (genLimit && genLimit.max_age) maxAge = genLimit.max_age
            }
        }

        if (age < minAge || age > maxAge) isPostEligible = false

        const reqQual = QUALIFICATION_ORDER[post.required_qualification as string] ?? 5
        if (userQual < reqQual) isPostEligible = false

        if (post.gender_restriction && post.gender_restriction !== profile.gender) isPostEligible = false

        if (mode === 'VACANCY_AWARE' && post.vacancies && Array.isArray(post.vacancies)) {
            let targetCat = 'GENERAL'
            if (userCat === 'OBC_NCL' || userCat === 'OBC_CL') targetCat = 'OBC'
            else if (userCat === 'SC') targetCat = 'SC'
            else if (userCat === 'ST') targetCat = 'ST'
            else if (userCat === 'EWS') targetCat = 'EWS'

            const vacRecord = post.vacancies.find((v: any) => v.category === targetCat)
            if (!vacRecord || vacRecord.count <= 0) {
                isPostEligible = false
            }
        }

        if (isPostEligible) return true
    }

    return false
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
