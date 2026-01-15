import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get discussion
    const { data: discussion, error } = await supabase
      .from('discussion_sessions')
      .select(`
        *,
        discussion_participants(count)
      `)
      .eq('id', id)
      .single()

    if (error || !discussion) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
    }

    // Get instructor info
    const { data: instructor } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', discussion.instructor_id)
      .single()

    // Get participants
    const { data: participants } = await supabase
      .from('discussion_participants')
      .select(`
        id,
        student_id,
        stance,
        created_at,
        profiles:student_id (
          name,
          email,
          student_number
        )
      `)
      .eq('session_id', id)
      .order('created_at', { ascending: false })

    // Get message count
    const { count: messageCount } = await supabase
      .from('discussion_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id)

    // Define profile type
    type ProfileData = { name: string; email: string; student_number: string | null } | null

    return NextResponse.json({
      discussion: {
        ...discussion,
        participant_count: discussion.discussion_participants?.[0]?.count || 0,
        message_count: messageCount || 0
      },
      instructor,
      participants: participants?.map(p => {
        const profile = p.profiles as unknown as ProfileData
        return {
          id: p.id,
          student_id: p.student_id,
          stance: p.stance,
          created_at: p.created_at,
          name: profile?.name || 'Unknown',
          email: profile?.email || '',
          student_number: profile?.student_number || null
        }
      }) || []
    })
  } catch (error) {
    console.error('Error fetching discussion:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discussion' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    // Validate status
    if (status && !['draft', 'active', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update discussion
    const { data: updated, error } = await supabase
      .from('discussion_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating discussion:', error)
      throw error
    }

    return NextResponse.json({ discussion: updated })
  } catch (error) {
    console.error('Error updating discussion:', error)
    return NextResponse.json(
      { error: 'Failed to update discussion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete discussion (cascades to messages, participants)
    const { error } = await supabase
      .from('discussion_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting discussion:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting discussion:', error)
    return NextResponse.json(
      { error: 'Failed to delete discussion' },
      { status: 500 }
    )
  }
}
