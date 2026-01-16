import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'admin-user')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Verify user is authenticated and has admin access
    try {
      await requireAdmin()
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = await createSupabaseRouteClient()

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's discussions (as instructor)
    const { data: createdDiscussions } = await supabase
      .from('discussion_sessions')
      .select('id, title, status, created_at')
      .eq('instructor_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get user's participations (as student)
    const { data: participations } = await supabase
      .from('discussion_participants')
      .select(`
        id,
        stance,
        created_at,
        discussion_sessions (
          id,
          title,
          status
        )
      `)
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      user: profile,
      createdDiscussions: createdDiscussions || [],
      participations: participations || []
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'admin-user')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Verify user is authenticated and has admin access
    try {
      await requireAdmin()
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = await createSupabaseRouteClient()
    const body = await request.json()
    const { role } = body

    // Validate role
    if (role && !['instructor', 'student'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "instructor" or "student"' },
        { status: 400 }
      )
    }

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }

    return NextResponse.json({ user: updatedProfile })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'admin-user')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Verify user is authenticated and has admin access
    let admin
    try {
      admin = await requireAdmin()
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Prevent self-deletion
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseRouteClient()

    // Delete profile (this will cascade to related data if configured)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
