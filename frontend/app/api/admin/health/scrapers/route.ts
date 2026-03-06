export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import db from '@/lib/db'


/** GET /api/admin/health/scrapers */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const data = await db.scraperLog.findMany({
            select: { site_id: true, status: true, scraped_at: true },
            orderBy: { scraped_at: 'desc' },
            take: 50
        })

        return NextResponse.json({ success: true, data: data ?? [] })
    } catch (err) {
        console.error('GET /api/admin/health/scrapers error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get scraper health' }, { status: 500 })
    }
}
