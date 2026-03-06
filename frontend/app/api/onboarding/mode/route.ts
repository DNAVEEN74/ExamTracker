export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { onboardingModeSchema } from '@/lib/validators/onboarding.validator'
import * as userService from '@/lib/services/user.service'
import db from '@/lib/db'


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
        await db.user.update({
            where: { id: user.id },
            data: { onboarding_mode: mode }
        })

        return NextResponse.json({ success: true, data: { mode } })
    } catch (err) {
        console.error('PUT /api/onboarding/mode error:', err)
        return NextResponse.json({ success: false, error: 'Failed to update mode' }, { status: 500 })
    }
}
