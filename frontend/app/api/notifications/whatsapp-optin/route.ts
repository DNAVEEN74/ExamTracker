import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as notificationService from '@/lib/services/notification.service'

/** POST /api/notifications/whatsapp-optin */
export async function POST(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
        const result = await notificationService.recordWhatsAppConsent(user.id, ip)
        return NextResponse.json({ success: true, data: result })
    } catch (err) {
        console.error('POST /api/notifications/whatsapp-optin error:', err)
        return NextResponse.json({ success: false, error: 'Failed to record WhatsApp opt-in' }, { status: 500 })
    }
}
