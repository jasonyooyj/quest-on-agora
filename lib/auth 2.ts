/**
 * Auth helpers for Supabase-backed sessions and role checks.
 */

import { createSupabaseServerClient } from './supabase-server'

export type UserRole = 'instructor' | 'student'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  studentNumber?: string
  school?: string
  avatarUrl?: string
}

/**
 * Fetch the current authenticated user and profile, or null if signed out.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get profile from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Profile doesn't exist yet - user needs to complete registration
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || '',
      role: 'student',
    }
  }

  return {
    id: user.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as UserRole,
    studentNumber: profile.student_number,
    school: profile.school,
    avatarUrl: profile.avatar_url,
  }
}

/**
 * Require an authenticated user or throw an Unauthorized error.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require the current user to have a specific role.
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error(`Forbidden: requires ${role} role`)
  }
  return user
}
