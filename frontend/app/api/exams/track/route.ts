import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { trackExamSchema } from '@/lib/validators/exam.validator'
import * as examService from '@/lib/services/exam.service'

/** POST /api/exams/track */
export async function POST(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const body = await request.json()
        const parsed = trackExamSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }
        const tracked = await examService.trackExam(user.id, parsed.data.exam_id)
        return NextResponse.json({ success: true, data: tracked })
    } catch (err) {
        console.error('POST /api/exams/track error:', err)
        return NextResponse.json({ success: false, error: 'Failed to track exam' }, { status: 500 })
    }
}
