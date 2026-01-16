import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'

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

    return t('emailVerificationFailed')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'Auth.Errors' })
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next') ?? '/login'

    // URL에서 에러 파라미터 확인 (Supabase가 직접 보내는 경우)
    const errorParam = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    if (errorParam || errorDescription) {
        const message = getLocalizedErrorMessage(errorDescription || errorParam || '', t)
        return NextResponse.redirect(
            new URL(`/${locale}/auth/error?message=${encodeURIComponent(message)}&canResend=true`, requestUrl.origin)
        )
    }

    if (token_hash && type) {
        const supabase = await createSupabaseServerClient()

        const { error } = await supabase.auth.verifyOtp({
            type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'magiclink',
            token_hash,
        })

        if (!error) {
            // Redirect to next (e.g. /update-password) or success page
            // Ensure next path includes locale
            let nextPath = next
            if (!next.startsWith(`/${locale}`)) {
                nextPath = `/${locale}${next.startsWith('/') ? next : '/' + next}`
            }
            return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
        }

        // 에러 발생 시 한글 메시지로 변환
        const message = getLocalizedErrorMessage(error.message, t)
        return NextResponse.redirect(
            new URL(`/${locale}/auth/error?message=${encodeURIComponent(message)}&canResend=true`, requestUrl.origin)
        )
    }

    // token_hash가 없는 경우
    return NextResponse.redirect(
        new URL(`/${locale}/auth/error?message=` + encodeURIComponent(t('malformedLink')) + '&canResend=true', requestUrl.origin)
    )
}
