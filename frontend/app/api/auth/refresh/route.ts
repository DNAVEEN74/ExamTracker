import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { applyAuthRateLimit } from '@/lib/rateLimit'

/** POST /api/auth/refresh */
export async function POST(request: NextRequest) {
    const rateLimitRes = await applyAuthRateLimit(request)
    if (rateLimitRes) return rateLimitRes

    try {
        const body = await request.json()
        const { refresh_token } = body
        if (!refresh_token) {
            return NextResponse.json(
                { success: false, error: 'refresh_token is required' },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token })
        if (error || !data.session) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired refresh token' },
                { status: 401 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        })
    } catch {
        return NextResponse.json({ success: false, error: 'Token refresh failed' }, { status: 500 })
    }
}
