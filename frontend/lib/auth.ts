import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, type AuthUser } from '@/lib/jwt'

export type { AuthUser }

/**
 * Reads the Authorization: Bearer <token> header OR the 'auth-token' HTTP-only cookie,
 * verifies the custom JWT, and returns the authenticated user.
 *
 * Returns { user, errorResponse: null } on success.
 * Returns { user: null, errorResponse: NextResponse<401> } on failure.
 */
export async function requireAuth(
    request: NextRequest
): Promise<{ user: AuthUser; errorResponse: null } | { user: null; errorResponse: NextResponse }> {
    let token = request.cookies.get('auth-token')?.value

    if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '')
        }
    }

    if (!token) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: 'Unauthorized: Missing token' },
                { status: 401 }
            ),
        }
    }

    const user = await verifyJWT(token)

    if (!user) {
        return {
            user: null,
            errorResponse: NextResponse.json(
                { success: false, error: 'Unauthorized: Invalid or expired token' },
                { status: 401 }
            ),
        }
    }

    return {
        user,
        errorResponse: null,
    }
}

/**
 * Checks that the authenticated user has admin or editor role in app_metadata.
 * Returns a 403 NextResponse if not authorized, or null if OK.
 */
export function requireAdminRole(user: AuthUser): NextResponse | null {
    if (user.role !== 'admin' && user.role !== 'editor') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return null
}
