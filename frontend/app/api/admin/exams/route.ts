import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'
import { createExamSchema } from '@/lib/validators/exam.validator'

/** GET /api/admin/exams */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { searchParams } = request.nextUrl
        const page = parseInt(searchParams.get('page') ?? '1')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
        const search = searchParams.get('search') ?? undefined
        const status = searchParams.get('status') ?? undefined
        const category = searchParams.get('category') ?? undefined

        const { exams, total } = await examService.getExams({ page, limit, search, status, category })
        return NextResponse.json({
            success: true,
            data: exams,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (err) {
        console.error('GET /api/admin/exams error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get exams' }, { status: 500 })
    }
}

/** POST /api/admin/exams */
export async function POST(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const body = await request.json()
        const parsed = createExamSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }
        const exam = await examService.createExam(parsed.data as Record<string, unknown>, user.id)
        return NextResponse.json({ success: true, data: exam }, { status: 201 })
    } catch (err) {
        console.error('POST /api/admin/exams error:', err)
        return NextResponse.json({ success: false, error: 'Failed to create exam' }, { status: 500 })
    }
}
