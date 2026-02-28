import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'
import { updateExamSchema } from '@/lib/validators/exam.validator'

/** GET /api/admin/exams/[id] */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { id } = await params
        const exam = await examService.getExamById(id)
        if (!exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
        return NextResponse.json({ success: true, data: exam })
    } catch (err) {
        console.error('GET /api/admin/exams/[id] error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get exam' }, { status: 500 })
    }
}

/** PUT /api/admin/exams/[id] */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { id } = await params
        const body = await request.json()
        const parsed = updateExamSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }
        const exam = await examService.updateExam(id, parsed.data as Record<string, unknown>)
        return NextResponse.json({ success: true, data: exam })
    } catch (err) {
        console.error('PUT /api/admin/exams/[id] error:', err)
        return NextResponse.json({ success: false, error: 'Failed to update exam' }, { status: 500 })
    }
}
