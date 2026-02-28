import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as userService from '@/lib/services/user.service'
import * as eligibilityService from '@/lib/services/eligibility.service'

/** POST /api/onboarding/complete */
export async function POST(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        await userService.markOnboardingComplete(user.id)
        const summary = await eligibilityService.getEligibilitySummary(user.id)

        return NextResponse.json({
            success: true,
            data: {
                onboarding_completed: true,
                matched_exams: summary.total_eligible,
                closing_soon: summary.closing_soon,
                newly_opened: summary.newly_opened,
            },
        })
    } catch (err) {
        console.error('POST /api/onboarding/complete error:', err)
        return NextResponse.json({ success: false, error: 'Failed to complete onboarding' }, { status: 500 })
    }
}
