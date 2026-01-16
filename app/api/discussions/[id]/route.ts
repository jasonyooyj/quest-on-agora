import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser, requireDiscussionOwner } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/discussions/[id] - Get a specific discussion
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussion')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params

        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createSupabaseRouteClient()

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
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussion')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params

        // Verify user is authenticated, is an instructor, and owns this discussion
        try {
            await requireDiscussionOwner(id)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unauthorized'
            const status = message.includes('Forbidden') ? 403 : 401
            return NextResponse.json({ error: message }, { status })
        }

        const supabase = await createSupabaseRouteClient()
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
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussion')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params

        // Verify user is authenticated, is an instructor, and owns this discussion
        try {
            await requireDiscussionOwner(id)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unauthorized'
            const status = message.includes('Forbidden') ? 403 : 401
            return NextResponse.json({ error: message }, { status })
        }

        const supabase = await createSupabaseRouteClient()

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
