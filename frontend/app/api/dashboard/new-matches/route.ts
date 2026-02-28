import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as eligibilityService from '@/lib/services/eligibility.service'
import * as userService from '@/lib/services/user.service'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** GET /api/dashboard/new-matches */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('last_active_at')
            .eq('id', user.id)
            .single()

        const { exams } = await eligibilityService.getEligibleExams(user.id, { limit: 50 })
        const lastActive = userData?.last_active_at ? new Date(userData.last_active_at) : new Date(0)

        const newMatches = exams.filter((e) => new Date(e.created_at!) >= lastActive)

        userService.updateLastActive(user.id).catch(() => { })

        return NextResponse.json({ success: true, data: newMatches })
    } catch (err) {
        console.error('GET /api/dashboard/new-matches error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get new matches' }, { status: 500 })
    }
}
