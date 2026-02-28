import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { updateProfileSchema } from '@/lib/validators/onboarding.validator'
import * as userService from '@/lib/services/user.service'

/** PUT /api/onboarding/profile */
export async function PUT(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const body = await request.json()
        const parsed = updateProfileSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }

        await userService.upsertProfile(user.id, parsed.data)
        return NextResponse.json({ success: true, data: { updated: true } })
    } catch (err) {
        console.error('PUT /api/onboarding/profile error:', err)
        return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 })
    }
}
