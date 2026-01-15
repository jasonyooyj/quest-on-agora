import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

export type Role = 'instructor' | 'student'

interface AuthenticatedUser {
  id: string
  email: string
  role: Role
  name: string | null
}

interface AuthResult {
  user: AuthenticatedUser | null
  error: NextResponse | null
}

/**
 * Authenticate user and optionally check role
 */
export async function authenticateUser(
  requiredRole?: Role
): Promise<AuthResult> {
  const supabase = await createSupabaseRouteClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Get profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
  }

  // Check role if required
  if (requiredRole && profile.role !== requiredRole) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: profile.role as Role,
      name: profile.name
    },
    error: null
  }
}

/**
 * Require instructor role
 */
export async function requireInstructor(): Promise<AuthResult> {
  return authenticateUser('instructor')
}

/**
 * Require student role
 */
export async function requireStudent(): Promise<AuthResult> {
  return authenticateUser('student')
}

/**
 * Require any authenticated user
 */
export async function requireAuth(): Promise<AuthResult> {
  return authenticateUser()
}

/**
 * Higher-order function to wrap API handler with role check
 */
export function withRole(role: Role) {
  return function<T extends (req: NextRequest, context: { params: Promise<Record<string, string>>; user: AuthenticatedUser }) => Promise<NextResponse>>(
    handler: T
  ) {
    return async (req: NextRequest, context: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
      const { user, error } = await authenticateUser(role)

      if (error) return error
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return handler(req, { ...context, user })
    }
  }
}

/**
 * Check if user is discussion owner
 */
export async function isDiscussionOwner(
  discussionId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseRouteClient()

  const { data } = await supabase
    .from('discussion_sessions')
    .select('instructor_id')
    .eq('id', discussionId)
    .single()

  return data?.instructor_id === userId
}

/**
 * Check if user is discussion participant
 */
export async function isDiscussionParticipant(
  discussionId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseRouteClient()

  const { data } = await supabase
    .from('discussion_participants')
    .select('id')
    .eq('session_id', discussionId)
    .eq('student_id', userId)
    .single()

  return !!data
}
