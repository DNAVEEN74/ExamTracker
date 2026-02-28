import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'

/** GET /api/admin/queue */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const category = request.nextUrl.searchParams.get('category') ?? undefined
        const queue = await examService.getReviewQueue({ category })
        return NextResponse.json({ success: true, data: queue })
    } catch (err) {
        console.error('GET /api/admin/queue error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get queue' }, { status: 500 })
    }
}
