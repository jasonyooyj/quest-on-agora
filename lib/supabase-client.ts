/**
 * Supabase browser client helpers for client-side usage.
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a new Supabase browser client.
 */
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for client-side usage
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

/**
 * Get or initialize the singleton Supabase client.
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient()
  }
  return supabaseClient
}
