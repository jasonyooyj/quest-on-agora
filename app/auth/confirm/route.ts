import { createSupabaseServerClient } from '@/lib/supabase-server'
import { routing } from '@/i18n/routing'
import { NextRequest, NextResponse } from 'next/server'

const supportedLocales = routing.locales as ReadonlyArray<string>
const defaultLocale = routing.defaultLocale

function getLocaleFromPath(path: string | null): string | null {
    if (!path || !path.startsWith('/')) {
        return null
    }

    return supportedLocales.find(locale => path === `/${locale}` || path.startsWith(`/${locale}/`)) ?? null
}

function getLocaleFromHeader(acceptLanguage: string | null): string | null {
    if (!acceptLanguage) {
        return null
    }

    const parts = acceptLanguage
        .split(',')
        .map(part => part.trim().split(';')[0].toLowerCase())

    for (const part of parts) {
        if (supportedLocales.includes(part)) {
            return part
        }

        const base = part.split('-')[0]
        if (supportedLocales.includes(base)) {
            return base
        }
    }

    return null
}

function resolveLocale(request: NextRequest, nextPath: string | null): string {
    return getLocaleFromPath(nextPath) ?? getLocaleFromHeader(request.headers.get('accept-language')) ?? defaultLocale
}

function ensureLocalePrefix(path: string, locale: string): string {
    const hasLocale = supportedLocales.some(loc => path === `/${loc}` || path.startsWith(`/${loc}/`))
    if (hasLocale) {
        return path
    }

    return `/${locale}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Validates redirect path to prevent open redirect vulnerabilities
 * Only allows relative paths starting with /
 */
function getSafeRedirectPath(redirect: string | null, defaultPath: string): string {
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
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next')
    const locale = resolveLocale(request, next)
    const safeNext = getSafeRedirectPath(next, `/${locale}/login`)
    const nextPath = ensureLocalePrefix(safeNext, locale)

    if (token_hash && type) {
        const supabase = await createSupabaseServerClient()

        const { error } = await supabase.auth.verifyOtp({
            type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'magiclink',
            token_hash,
        })

        if (!error) {
            // Redirect to next (e.g. /update-password) or success page
            return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
        }
    }

    // If verification failed, redirect to error page
    return NextResponse.redirect(
        new URL(`/${locale}/auth/error?message=이메일 확인에 실패했습니다`, requestUrl.origin)
    )
}
