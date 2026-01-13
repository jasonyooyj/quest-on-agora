import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next') ?? '/login'

    if (token_hash && type) {
        const supabase = await createSupabaseServerClient()

        const { error } = await supabase.auth.verifyOtp({
            type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'magiclink',
            token_hash,
        })

        if (!error) {
            // Redirect to next (e.g. /update-password) or success page
            return NextResponse.redirect(new URL(next, requestUrl.origin))
        }
    }

    // If verification failed, redirect to error page
    return NextResponse.redirect(new URL('/auth/error?message=이메일 확인에 실패했습니다', requestUrl.origin))
}
