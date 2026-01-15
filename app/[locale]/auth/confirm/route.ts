import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

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

    return '이메일 확인에 실패했습니다. 다시 시도해주세요.'
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next') ?? '/login'

    // URL에서 에러 파라미터 확인 (Supabase가 직접 보내는 경우)
    const errorParam = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    if (errorParam || errorDescription) {
        const message = getKoreanErrorMessage(errorDescription || errorParam || '')
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
        const message = getKoreanErrorMessage(error.message)
        return NextResponse.redirect(
            new URL(`/${locale}/auth/error?message=${encodeURIComponent(message)}&canResend=true`, requestUrl.origin)
        )
    }

    // token_hash가 없는 경우
    return NextResponse.redirect(
        new URL(`/${locale}/auth/error?message=` + encodeURIComponent('인증 링크가 잘못되었습니다. 새로운 인증 메일을 요청해주세요.') + '&canResend=true', requestUrl.origin)
    )
}
