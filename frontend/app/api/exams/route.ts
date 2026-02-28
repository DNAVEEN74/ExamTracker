import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as eligibilityService from '@/lib/services/eligibility.service'

/** GET /api/exams — All eligible exams for the user (paginated) */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { searchParams } = request.nextUrl
        const page = parseInt(searchParams.get('page') ?? '1')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
        const category = searchParams.get('category') ?? undefined
        const closing_in_days = searchParams.get('closing_in_days') ?? undefined

        const { exams, total } = await eligibilityService.getEligibleExams(user.id, {
            page, limit, category, closing_in_days,
        })

        return NextResponse.json({
            success: true,
            data: exams,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (err) {
        console.error('GET /api/exams error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get exams' }, { status: 500 })
    }
}
