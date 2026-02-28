import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'

/** GET /api/dashboard/deadlines */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const deadlines = await examService.getUpcomingDeadlines(user.id)
        return NextResponse.json({ success: true, data: deadlines })
    } catch (err) {
        console.error('GET /api/dashboard/deadlines error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get deadlines' }, { status: 500 })
    }
}
