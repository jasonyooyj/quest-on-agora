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

// Supabase 에러 메시지를 한글로 변환
function getKoreanErrorMessage(errorMessage: string): string {
    const msg = errorMessage.toLowerCase()

    if (msg.includes('expired') || msg.includes('invalid')) {
        return '인증 링크가 만료되었거나 유효하지 않습니다. 새로운 인증 메일을 요청해주세요.'
    }
    if (msg.includes('already been used') || msg.includes('already confirmed')) {
        return '이미 인증이 완료된 이메일입니다. 로그인해주세요.'
    }
    if (msg.includes('token')) {
        return '인증 토큰이 유효하지 않습니다. 새로운 인증 메일을 요청해주세요.'
    }
    if (msg.includes('access_denied')) {
        return '접근이 거부되었습니다.'
    }

    return '인증 과정에서 오류가 발생했습니다.'
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next')
    const errorParam = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    // Handle errors from Supabase (e.g. invalid link, expired link)
    if (errorParam || errorDescription) {
        const message = getKoreanErrorMessage(errorDescription || errorParam || '')
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
        const message = getKoreanErrorMessage(error.message)
        return NextResponse.redirect(
            new URL(`/${locale}/auth/error?message=${encodeURIComponent(message)}&canResend=true`, requestUrl.origin)
        )
    }

    // No code present, redirect to login
    return NextResponse.redirect(new URL(`/${locale}/login`, requestUrl.origin))
}
