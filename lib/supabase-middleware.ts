/**
 * Middleware helper to refresh sessions and enforce route access rules.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Admin emails for access control (server-side only)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0)

/**
 * Refresh Supabase auth cookies and enforce route access policies.
 */
export async function updateSession(request: NextRequest, response?: NextResponse) {
    let supabaseResponse = response || NextResponse.next({
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

    // Helper to preserve cookies for redirects
    const withCookies = (res: NextResponse) => {
        supabaseResponse.cookies.getAll().forEach(cookie => {
            res.cookies.set(cookie)
        })
        return res
    }

    // Normalize path by removing locale
    let pathname = request.nextUrl.pathname
    const locales = ['ko', 'en']
    for (const locale of locales) {
        if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
            pathname = pathname.replace(`/${locale}`, '') || '/'
            break
        }
    }

    // Protected routes (dashboard = 로딩 후 역할별 리다이렉트)
    const protectedPaths = ['/instructor', '/student', '/dashboard']
    const adminPaths = ['/admin']
    const authPaths = ['/login', '/register', '/forgot-password', '/update-password', '/confirm-email']
    const onboardingPath = '/onboarding'
    
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path))
    const isAuthPath = authPaths.some(path => pathname.startsWith(path))
    const isOnboardingPath = pathname.startsWith(onboardingPath)

    // Redirect to login if not authenticated and trying to access protected route
    if (!user && isProtectedPath) {
        const url = request.nextUrl.clone()
        // Ensure we keep the locale in the redirect URL
        // But request.nextUrl.pathname already has the locale if it was present
        // We just need to change the path segment
        // If the original path was /en/instructor, we want /en/login
        // We can use Next-Intl's Link or just construct it manually
        // But since we are in middleware, we don't have access to routing context easily
        // We can just construct the URL.
        
        // Simple approach: construct /login, and let next-intl middleware handle locale on next request?
        // No, we are AFTER next-intl middleware here.
        // We should try to preserve the locale if possible.
        
        const currentLocale = request.nextUrl.pathname.split('/')[1]
        const localePrefix = locales.includes(currentLocale) ? `/${currentLocale}` : ''
        
        url.pathname = `${localePrefix}/login`
        url.searchParams.set('redirect', pathname) // Store the clean path as redirect
        return withCookies(NextResponse.redirect(url))
    }

    // Check if authenticated user has completed onboarding (has profile)
    if (user && (isProtectedPath || isAdminPath) && !isOnboardingPath) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            // User hasn't completed onboarding - redirect to onboarding
            const url = request.nextUrl.clone()
            const currentLocale = request.nextUrl.pathname.split('/')[1]
            const localePrefix = locales.includes(currentLocale) ? `/${currentLocale}` : ''
            
            url.pathname = `${localePrefix}/onboarding`
            return withCookies(NextResponse.redirect(url))
        }
    }

    // Admin route protection
    if (isAdminPath) {
        // Not authenticated - redirect to login
        if (!user) {
            console.log('[Admin] No user, redirecting to login')
            const url = request.nextUrl.clone()
            const currentLocale = request.nextUrl.pathname.split('/')[1]
            const localePrefix = locales.includes(currentLocale) ? `/${currentLocale}` : ''
            
            url.pathname = `${localePrefix}/login`
            url.searchParams.set('redirect', pathname)
            return NextResponse.redirect(url)
        }
        // Authenticated but not admin - redirect to home
        const userEmail = user.email?.toLowerCase() || ''
        
        if (!ADMIN_EMAILS.includes(userEmail)) {
            console.log('[Admin] Not admin, redirecting to home')
            const url = request.nextUrl.clone()
            const currentLocale = request.nextUrl.pathname.split('/')[1]
            const localePrefix = locales.includes(currentLocale) ? `/${currentLocale}` : ''
            
            url.pathname = `${localePrefix}/`
            return NextResponse.redirect(url)
        }
    }

    // Redirect to dashboard loading page if authenticated and trying to access auth pages
    if (user && isAuthPath) {
        const url = request.nextUrl.clone()
        const currentLocale = request.nextUrl.pathname.split('/')[1]
        const localePrefix = locales.includes(currentLocale) ? `/${currentLocale}` : ''
        
        url.pathname = `${localePrefix}/dashboard`
        return withCookies(NextResponse.redirect(url))
    }

    return supabaseResponse
}
