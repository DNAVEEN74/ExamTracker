import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as eligibilityService from '@/lib/services/eligibility.service'

/** GET /api/profile/eligibility-summary */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const summary = await eligibilityService.getEligibilitySummary(user.id)
        return NextResponse.json({ success: true, data: summary })
    } catch (err) {
        console.error('GET /api/profile/eligibility-summary error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get eligibility summary' }, { status: 500 })
    }
}
