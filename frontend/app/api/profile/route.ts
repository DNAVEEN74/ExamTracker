import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { updateProfileSchema } from '@/lib/validators/onboarding.validator'
import * as userService from '@/lib/services/user.service'
import * as eligibilityService from '@/lib/services/eligibility.service'

/** GET /api/profile */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const data = await userService.getUserWithProfile(user.id)
        if (!data) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('GET /api/profile error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get profile' }, { status: 500 })
    }
}

/** PUT /api/profile */
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
        const updated = await userService.getUserWithProfile(user.id)
        return NextResponse.json({ success: true, data: updated })
    } catch (err) {
        console.error('PUT /api/profile error:', err)
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 })
    }
}
