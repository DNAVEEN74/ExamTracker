import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'

/** GET /api/exams/search?q= */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const q = request.nextUrl.searchParams.get('q')
        if (!q || q.trim().length < 2) {
            return NextResponse.json(
                { success: false, error: 'q must be at least 2 characters' },
                { status: 400 }
            )
        }
        const exams = await examService.searchExams(q.trim())
        return NextResponse.json({ success: true, data: exams })
    } catch (err) {
        console.error('GET /api/exams/search error:', err)
        return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
    }
}
