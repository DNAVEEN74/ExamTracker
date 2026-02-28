import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as eligibilityService from '@/lib/services/eligibility.service'
import * as examService from '@/lib/services/exam.service'
import * as userService from '@/lib/services/user.service'

/** GET /api/dashboard — Personalized dashboard data */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const [{ exams: allEligible }, trackedExams] = await Promise.all([
            eligibilityService.getEligibleExams(user.id, { limit: 100 }),
            examService.getTrackedExams(user.id),
        ])

        const now = new Date()
        const sevenDaysOut = new Date(now)
        sevenDaysOut.setDate(now.getDate() + 7)
        const threeDaysAgo = new Date(now)
        threeDaysAgo.setDate(now.getDate() - 3)

        const closingSoon = allEligible.filter((e) => new Date(e.application_end) <= sevenDaysOut)
        const newlyOpened = allEligible.filter((e) => new Date(e.created_at!) >= threeDaysAgo)

        userService.updateLastActive(user.id).catch(() => { })

        return NextResponse.json({
            success: true,
            data: {
                eligible_exams: allEligible.slice(0, 10),
                closing_soon: closingSoon.slice(0, 5),
                newly_opened: newlyOpened.slice(0, 5),
                total_tracked: trackedExams.length,
                upcoming_deadlines: trackedExams
                    .filter((t) => t.exam && new Date(t.exam.application_end) >= now)
                    .slice(0, 5),
            },
        })
    } catch (err) {
        console.error('GET /api/dashboard error:', err)
        return NextResponse.json({ success: false, error: 'Failed to load dashboard' }, { status: 500 })
    }
}
