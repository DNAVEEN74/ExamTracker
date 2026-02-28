import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'

/** DELETE /api/exams/[id]/untrack */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { id } = await params
        await examService.untrackExam(user.id, id)
        return NextResponse.json({ success: true, data: { untracked: true, exam_id: id } })
    } catch (err) {
        console.error('DELETE /api/exams/[id]/untrack error:', err)
        return NextResponse.json({ success: false, error: 'Failed to untrack exam' }, { status: 500 })
    }
}
