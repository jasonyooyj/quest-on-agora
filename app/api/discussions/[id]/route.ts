import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/discussions/[id] - Get a specific discussion
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: discussion, error } = await supabase
            .from('discussion_sessions')
            .select(`
        *,
        discussion_participants(
          id,
          student_id,
          display_name,
          stance,
          stance_statement,
          is_online,
          is_submitted,
          needs_help,
          last_active_at
        )
      `)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        // Check access: either instructor or participant
        const isInstructor = discussion.instructor_id === user.id
        const isParticipant = discussion.discussion_participants?.some(
            (p: { student_id: string }) => p.student_id === user.id
        )

        if (!isInstructor && !isParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json({ discussion })
    } catch (error) {
        console.error('Error fetching discussion:', error)
        return NextResponse.json(
            { error: 'Failed to fetch discussion' },
            { status: 500 }
        )
    }
}

// PATCH /api/discussions/[id] - Update a discussion
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('discussion_sessions')
            .select('instructor_id')
            .eq('id', id)
            .single()

        if (!existing || existing.instructor_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { title, description, status, settings } = body

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (status !== undefined) {
            updateData.status = status
            if (status === 'closed') {
                updateData.closed_at = new Date().toISOString()
            }
        }
        if (settings !== undefined) updateData.settings = settings

        const { data: discussion, error } = await supabase
            .from('discussion_sessions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ discussion })
    } catch (error) {
        console.error('Error updating discussion:', error)
        return NextResponse.json(
            { error: 'Failed to update discussion' },
            { status: 500 }
        )
    }
}

// DELETE /api/discussions/[id] - Delete a discussion
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('discussion_sessions')
            .select('instructor_id')
            .eq('id', id)
            .single()

        if (!existing || existing.instructor_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { error } = await supabase
            .from('discussion_sessions')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting discussion:', error)
        return NextResponse.json(
            { error: 'Failed to delete discussion' },
            { status: 500 }
        )
    }
}
