import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'

/** POST /api/admin/exams/[id]/duplicate */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { id } = await params
        const newExam = await examService.duplicateExam(id, user.id)
        return NextResponse.json({ success: true, data: { new_id: newExam.id, exam: newExam } }, { status: 201 })
    } catch (err) {
        console.error('POST /api/admin/exams/[id]/duplicate error:', err)
        return NextResponse.json({ success: false, error: 'Failed to duplicate exam' }, { status: 500 })
    }
}
