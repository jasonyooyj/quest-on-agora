import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'

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

// Translate Supabase error messages
function getLocalizedErrorMessage(errorMessage: string, t: any): string {
    const msg = errorMessage.toLowerCase()

    if (msg.includes('expired') || msg.includes('invalid')) {
        return t('invalidLink')
    }
    if (msg.includes('already been used') || msg.includes('already confirmed')) {
        return t('alreadyVerified')
    }
    if (msg.includes('token')) {
        return t('invalidToken')
    }
    if (msg.includes('access_denied')) {
        return t('accessDenied')
    }

    return t('generalError')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'Auth.Errors' })
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next')
    const errorParam = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    // Handle errors from Supabase (e.g. invalid link, expired link)
    if (errorParam || errorDescription) {
        const message = getLocalizedErrorMessage(errorDescription || errorParam || '', t)
        return NextResponse.redirect(
            new URL(`/${locale}/auth/error?message=${encodeURIComponent(message)}&canResend=true`, requestUrl.origin)
        )
    }

    if (code) {
        const supabase = await createSupabaseServerClient()

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // 1. Check for specific redirect content (e.g. password recovery)
            if (next && next.startsWith('/')) {
                // Ensure next path includes locale if not present
                // Avoid double prefixing if next already contains the locale
                let nextPath = next
                if (!next.startsWith(`/${locale}`)) {
                    nextPath = `/${locale}${next.startsWith('/') ? next : '/' + next}`
                }
                return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
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
                        return NextResponse.redirect(new URL(`/${locale}/instructor`, requestUrl.origin))
                    } else if (profile.role === 'student') {
                        return NextResponse.redirect(new URL(`/${locale}/student`, requestUrl.origin))
                    }
                } else {
                    // No profile found (first time OAuth), redirect to onboarding
                    return NextResponse.redirect(new URL(`/${locale}/onboarding`, requestUrl.origin))
                }
            }

            // Fallback default
            return NextResponse.redirect(new URL(`/${locale}/instructor`, requestUrl.origin))
        }

        // If there was an error, redirect to error page with Korean message
        const message = getLocalizedErrorMessage(error.message, t)
        return NextResponse.redirect(
            new URL(`/${locale}/auth/error?message=${encodeURIComponent(message)}&canResend=true`, requestUrl.origin)
        )
    }

    // No code present, redirect to login
    return NextResponse.redirect(new URL(`/${locale}/login`, requestUrl.origin))
}
