import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminRole } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** GET /api/admin/health/scrapers */
export async function GET(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse
    const adminErr = requireAdminRole(user)
    if (adminErr) return adminErr

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { data, error } = await supabaseAdmin
            .from('scraper_log')
            .select('source_id, status, queued_at, pdf_url')
            .order('queued_at', { ascending: false })
            .limit(50)

        if (error && error.code === '42P01') {
            return NextResponse.json({ success: true, data: [] })
        }
        if (error) throw new Error(error.message)

        return NextResponse.json({ success: true, data: data ?? [] })
    } catch (err) {
        console.error('GET /api/admin/health/scrapers error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get scraper health' }, { status: 500 })
    }
}
