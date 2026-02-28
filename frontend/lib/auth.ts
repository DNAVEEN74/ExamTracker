import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/supabase/admin'

export interface AuthUser {
    id: string
    email?: string
    phone?: string
    app_metadata: Record<string, unknown>
}

/**
 * Reads the Authorization: Bearer <token> header, verifies the Supabase JWT,
 * and returns the authenticated user.
 *
 * Returns { user, errorResponse: null } on success.
 * Returns { user: null, errorResponse: NextResponse<401> } on failure.
 */
export async function requireAuth(
    request: NextRequest
): Promise<{ user: AuthUser; errorResponse: null } | { user: null; errorResponse: NextResponse }> {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: 'Missing or invalid Authorization header' },
                { status: 401 }
            ),
        }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUser = await verifyJWT(token)

    if (!supabaseUser) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: 'Invalid or expired token' },
                { status: 401 }
            ),
        }
    }

    return {
        user: {
            id: supabaseUser.id,
            email: supabaseUser.email,
            phone: supabaseUser.phone,
            app_metadata: supabaseUser.app_metadata as Record<string, unknown>,
        },
        errorResponse: null,
    }
}

/**
 * Checks that the authenticated user has admin or editor role in app_metadata.
 * Returns a 403 NextResponse if not authorized, or null if OK.
 */
export function requireAdminRole(user: AuthUser): NextResponse | null {
    const role = user.app_metadata?.role as string | undefined
    if (role !== 'admin' && role !== 'editor') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return null
}
