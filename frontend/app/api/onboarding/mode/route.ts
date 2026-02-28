import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { onboardingModeSchema } from '@/lib/validators/onboarding.validator'
import * as userService from '@/lib/services/user.service'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** PUT /api/onboarding/mode */
export async function PUT(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const body = await request.json()
        const parsed = onboardingModeSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }
        const { mode } = parsed.data

        await userService.upsertProfile(user.id, { onboarding_step: 2 })
        await supabaseAdmin
            .from('users')
            .update({ onboarding_mode: mode, updated_at: new Date().toISOString() })
            .eq('id', user.id)

        return NextResponse.json({ success: true, data: { mode } })
    } catch (err) {
        console.error('PUT /api/onboarding/mode error:', err)
        return NextResponse.json({ success: false, error: 'Failed to update mode' }, { status: 500 })
    }
}
