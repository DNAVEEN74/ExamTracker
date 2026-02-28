import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** GET /api/admin/analytics */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const now = new Date()
        const sevenDays = new Date(now)
        sevenDays.setDate(now.getDate() + 7)
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)

        const [
            { count: totalUsers },
            { count: onboardingCompleted },
            { count: activeExams },
            { count: examsClosing7d },
        ] = await Promise.all([
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('onboarding_completed', true),
            supabaseAdmin.from('exams').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabaseAdmin.from('exams').select('id', { count: 'exact', head: true })
                .eq('is_active', true)
                .lte('application_end', sevenDays.toISOString().split('T')[0]),
        ])

        const { count: dau7d } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('last_active_at', sevenDaysAgo.toISOString())

        return NextResponse.json({
            success: true,
            data: {
                total_users: totalUsers ?? 0,
                onboarding_completed: onboardingCompleted ?? 0,
                daily_active_7d: dau7d ?? 0,
                active_exams: activeExams ?? 0,
                exams_closing_7d: examsClosing7d ?? 0,
                emails_sent_today: 0,
                notification_failures_24h: 0,
            },
        })
    } catch (err) {
        console.error('GET /api/admin/analytics error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get analytics' }, { status: 500 })
    }
}
