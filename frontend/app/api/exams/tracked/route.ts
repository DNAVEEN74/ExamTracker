import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'

/** GET /api/exams/tracked */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const tracked = await examService.getTrackedExams(user.id)
        return NextResponse.json({ success: true, data: tracked })
    } catch (err) {
        console.error('GET /api/exams/tracked error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get tracked exams' }, { status: 500 })
    }
}
