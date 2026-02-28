import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as notificationService from '@/lib/services/notification.service'

/** GET /api/notifications/history */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { searchParams } = request.nextUrl
        const page = parseInt(searchParams.get('page') ?? '1')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)

        const { logs, total } = await notificationService.getNotificationHistory(user.id, page, limit)
        return NextResponse.json({
            success: true,
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (err) {
        console.error('GET /api/notifications/history error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get notification history' }, { status: 500 })
    }
}
