import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Admin emails for access control (server-side only)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0)

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

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
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes
    const protectedPaths = ['/instructor', '/student']
    const adminPaths = ['/admin']
    const authPaths = ['/login', '/register']
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isAdminPath = adminPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

    // Redirect to login if not authenticated and trying to access protected route
    if (!user && isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    // Admin route protection
    if (isAdminPath) {
        // Not authenticated - redirect to login
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('redirect', request.nextUrl.pathname)
            return NextResponse.redirect(url)
        }
        // Authenticated but not admin - redirect to home
        if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
    }

    // Redirect to dashboard if authenticated and trying to access auth pages
    if (user && isAuthPath) {
        const url = request.nextUrl.clone()
        // Redirect based on user role (we'll check profile in the page)
        url.pathname = '/instructor'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
