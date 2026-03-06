import { NextResponse, type NextRequest } from 'next/server'
import { verifyJWT } from './lib/jwt'

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value
    let user = null

    if (token) {
        // We verify the token locally on the edge
        user = await verifyJWT(token)
    }

    const pathname = request.nextUrl.pathname

    // ── Admin protection: redirect to /404 (never confirm /admin exists) ──
    if (pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/404', request.url))
        }
        if (user.role !== 'admin' && user.role !== 'editor') {
            return NextResponse.redirect(new URL('/404', request.url))
        }
    }

    // ── Dashboard protection: redirect to register if not logged in ──
    if (pathname.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/register', request.url))
        }
    }

    // ── If logged in and trying to access /register, redirect to dashboard ──
    if (pathname === '/register' && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/register',
    ],
}
