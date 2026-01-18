/**
 * Supabase server/client helpers for App Router and API routes.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client wired to Next.js server cookies.
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing user sessions.
                    }
                },
            },
        }
    )
}

/**
 * Create a Supabase client scoped for API route handlers.
 */
export async function createSupabaseRouteClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignore errors in API routes
                    }
                },
            },
        }
    )
}

/**
 * Admin client singleton instance (PERF-003 optimization).
 * The admin client uses service role key and doesn't need per-request state,
 * so we can reuse a single instance across all requests.
 */
let adminClientInstance: Awaited<ReturnType<typeof createAdminClientInternal>> | null = null

function createAdminClientInternal() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}

/**
 * Create an admin Supabase client using the service role key.
 * Uses singleton pattern to avoid creating new clients on every call.
 */
export const createSupabaseAdminClient = async () => {
    if (!adminClientInstance) {
        adminClientInstance = createAdminClientInternal()
    }
    return adminClientInstance
}
