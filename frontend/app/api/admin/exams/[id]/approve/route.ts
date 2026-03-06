import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'



export const dynamic = 'force-dynamic'

/** POST /api/admin/exams/[id]/approve */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { id } = await params
        const body = await request.json().catch(() => ({}))
        const { notify = true } = body

        const exam = await examService.approveExam(id)

        let usersQueued = 0
        if (notify) {
            // NOTE: The backend cron or internal background worker handles pushing eligibility updates currently
            // We are bypassing Supabase RPC triggers here in Prisma.
            usersQueued = 0
            console.log(`📣 Exam Approved manually.`)
        }

        return NextResponse.json({
            success: true,
            data: { approved: true, notifications_queued: notify, users_queued: usersQueued, exam },
        })
    } catch (err) {
        console.error('POST /api/admin/exams/[id]/approve error:', err)
        return NextResponse.json({ success: false, error: 'Failed to approve exam' }, { status: 500 })
    }
}
