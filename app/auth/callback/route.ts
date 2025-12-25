import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirect = requestUrl.searchParams.get('redirect') || '/instructor'

    if (code) {
        const supabase = await createSupabaseServerClient()

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Successfully authenticated, redirect to the intended page
            return NextResponse.redirect(new URL(redirect, requestUrl.origin))
        }

        // If there was an error, redirect to error page
        return NextResponse.redirect(
            new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, requestUrl.origin)
        )
    }

    // No code present, redirect to login
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
