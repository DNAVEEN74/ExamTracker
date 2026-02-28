import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

/** POST /api/auth/logout */
export async function POST(request: NextRequest) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    try {
        const token = request.headers.get('authorization')!.replace('Bearer ', '')
        await supabaseAdmin.auth.admin.signOut(token)
        return NextResponse.json({ success: true, data: { message: 'Logged out successfully' } })
    } catch {
        // Non-blocking: even if signout fails server-side, client should clear tokens
        return NextResponse.json({ success: true, data: { message: 'Logged out' } })
    }
}
