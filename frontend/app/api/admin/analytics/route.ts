import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import db from '@/lib/db'

export const dynamic = 'force-dynamic'

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
            totalUsers,
            onboardingCompleted,
            activeExams,
            examsClosing7d,
            dau7d
        ] = await Promise.all([
            db.user.count({ where: { is_deleted: false } }),
            db.user.count({ where: { onboarding_completed: true } }),
            db.exam.count({ where: { is_active: true } }),
            db.exam.count({
                where: {
                    is_active: true,
                    application_end: { lte: sevenDays }
                }
            }),
            db.user.count({
                where: { last_active_at: { gte: sevenDaysAgo } }
            })
        ])

        return NextResponse.json({
            success: true,
            data: {
                total_users: totalUsers,
                onboarding_completed: onboardingCompleted,
                daily_active_7d: dau7d,
                active_exams: activeExams,
                exams_closing_7d: examsClosing7d,
                emails_sent_today: 0,
                notification_failures_24h: 0,
            },
        })
    } catch (err) {
        console.error('GET /api/admin/analytics error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get analytics' }, { status: 500 })
    }
}
