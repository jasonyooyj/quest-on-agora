import { createSupabaseServerClient } from './supabase-server'

// Admin emails are stored in environment variable for security
// Format: ADMIN_EMAILS=admin@school.edu,professor@school.edu
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(e => e.length > 0)

export interface AdminUser {
  id: string
  email: string
  name: string
}

/**
 * Check if an email address has admin privileges
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Get current user if they are an admin (server-side)
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email || '',
    name: profile?.name || 'Admin'
  }
}

/**
 * Require admin access - throws if not authenticated as admin
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) {
    throw new Error('Admin access required')
  }
  return admin
}
