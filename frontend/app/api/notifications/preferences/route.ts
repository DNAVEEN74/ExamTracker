import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { updateNotificationPreferencesSchema } from '@/lib/validators/notification.validator'
import * as notificationService from '@/lib/services/notification.service'

/** GET /api/notifications/preferences */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const prefs = await notificationService.getPreferences(user.id)
        return NextResponse.json({ success: true, data: prefs })
    } catch (err) {
        console.error('GET /api/notifications/preferences error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get preferences' }, { status: 500 })
    }
}

/** PUT /api/notifications/preferences */
export async function PUT(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const body = await request.json()
        const parsed = updateNotificationPreferencesSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }
        const updated = await notificationService.upsertPreferences(user.id, parsed.data as any)
        return NextResponse.json({ success: true, data: updated })
    } catch (err) {
        console.error('PUT /api/notifications/preferences error:', err)
        return NextResponse.json({ success: false, error: 'Failed to update preferences' }, { status: 500 })
    }
}
