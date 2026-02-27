import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Skip if Supabase isn't configured yet (no .env.local)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // ── Admin protection: redirect to /404 (never confirm /admin exists) ──
    if (pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/404', request.url))
        }
        // Check admin role from app_metadata
        const role = (user.app_metadata as { role?: string })?.role
        if (role !== 'admin' && role !== 'editor') {
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

    return supabaseResponse
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/register',
    ],
}
