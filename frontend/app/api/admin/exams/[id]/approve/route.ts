import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
            const { data, error: rpcError } = await supabaseAdmin.rpc(
                'queue_new_exam_notification',
                { p_exam_id: id }
            )
            if (rpcError) {
                console.error(`⚠️  queue_new_exam_notification failed for ${exam.name}:`, rpcError.message)
            } else {
                usersQueued = (data as number) ?? 0
                console.log(`📣 Queued NEW_EXAM notifications for ${usersQueued} eligible users → ${exam.name}`)
            }
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
