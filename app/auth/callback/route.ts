import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates redirect path to prevent open redirect vulnerabilities
 * Only allows relative paths starting with /
 */
function getSafeRedirectPath(redirect: string | null): string {
    const defaultPath = '/instructor'

    if (!redirect) {
        return defaultPath
    }

    // Only allow relative paths starting with /
    // Reject absolute URLs, protocol-relative URLs, and other schemes
    if (!redirect.startsWith('/') || redirect.startsWith('//')) {
        return defaultPath
    }

    return redirect
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next')
    const errorParam = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    // Handle errors from Supabase (e.g. invalid link, expired link)
    if (errorParam) {
        return NextResponse.redirect(
            new URL(`/auth/error?message=${encodeURIComponent(errorDescription || '인증 과정에서 오류가 발생했습니다')}`, requestUrl.origin)
        )
    }

    if (code) {
        const supabase = await createSupabaseServerClient()

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // 1. Check for specific redirect content (e.g. password recovery)
            if (next && next.startsWith('/')) {
                return NextResponse.redirect(new URL(next, requestUrl.origin))
            }

            // 2. Fallback to role-based redirect
            // Check if user has a profile
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    // User has a profile, redirect based on role
                    if (profile.role === 'instructor') {
                        return NextResponse.redirect(new URL('/instructor', requestUrl.origin))
                    } else if (profile.role === 'student') {
                        return NextResponse.redirect(new URL('/student', requestUrl.origin))
                    }
                } else {
                    // No profile found (first time OAuth), redirect to onboarding
                    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
                }
            }

            // Fallback default
            return NextResponse.redirect(new URL('/instructor', requestUrl.origin))
        }

        // If there was an error, redirect to error page
        return NextResponse.redirect(
            new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, requestUrl.origin)
        )
    }

    // No code present, redirect to login
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
