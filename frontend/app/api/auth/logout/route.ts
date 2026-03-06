export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'


/** POST /api/auth/logout */
export async function POST(request: NextRequest) {
    const { errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const response = NextResponse.json({ success: true, data: { message: 'Logged out successfully' } })

    // Clear the auth cookie safely
    response.cookies.delete('auth-token')

    return response
}
