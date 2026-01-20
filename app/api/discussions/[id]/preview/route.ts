import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface DiscussionSettings {
    anonymous?: boolean
    stanceOptions?: string[]
    aiMode?: string
}

// Helper to check if user is the discussion owner
async function verifyOwnership(supabase: any, discussionId: string, userId: string) {
    const { data: discussion, error } = await supabase
        .from('discussion_sessions')
        .select('id, instructor_id, settings, title')
        .eq('id', discussionId)
        .single()

    if (error || !discussion) {
        return { isOwner: false, discussion: null }
    }

    return {
        isOwner: discussion.instructor_id === userId,
        discussion
    }
}

// GET /api/discussions/[id]/preview - Check if preview participant exists
export async function GET(request: NextRequest, { params }: RouteParams) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'preview')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params

        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createSupabaseRouteClient()

        const { isOwner, discussion } = await verifyOwnership(supabase, id, user.id)
        if (!isOwner) {
            return NextResponse.json({ error: 'Only the discussion owner can access preview' }, { status: 403 })
        }

        // Check if preview participant exists
        const { data: preview } = await supabase
            .from('discussion_participants')
            .select('id, stance, is_submitted, created_at')
            .eq('session_id', id)
            .eq('student_id', user.id)
            .eq('is_preview', true)
            .single()

        return NextResponse.json({
            exists: !!preview,
            preview: preview || null,
            discussion: {
                id: discussion.id,
                title: discussion.title
            }
        })
    } catch (error) {
        console.error('Error checking preview:', error)
        return NextResponse.json(
            { error: 'Failed to check preview status' },
            { status: 500 }
        )
    }
}

// POST /api/discussions/[id]/preview - Create preview participant
export async function POST(request: NextRequest, { params }: RouteParams) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'preview')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params

        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createSupabaseRouteClient()

        const { isOwner, discussion } = await verifyOwnership(supabase, id, user.id)
        if (!isOwner) {
            return NextResponse.json({ error: 'Only the discussion owner can create preview' }, { status: 403 })
        }

        // Check if preview participant already exists
        const { data: existing } = await supabase
            .from('discussion_participants')
            .select('id')
            .eq('session_id', id)
            .eq('student_id', user.id)
            .eq('is_preview', true)
            .single()

        if (existing) {
            return NextResponse.json({
                participant: existing,
                message: 'Preview already exists'
            })
        }

        const settings = discussion.settings as DiscussionSettings
        const displayName = settings?.anonymous
            ? '미리보기 학생'
            : `${user.name || '교수'} (미리보기)`

        // Create preview participant
        const { data: participant, error } = await supabase
            .from('discussion_participants')
            .insert({
                session_id: id,
                student_id: user.id,
                display_name: displayName,
                is_online: true,
                is_preview: true
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ participant }, { status: 201 })
    } catch (error) {
        console.error('Error creating preview:', error)
        return NextResponse.json(
            { error: 'Failed to create preview' },
            { status: 500 }
        )
    }
}

// DELETE /api/discussions/[id]/preview - Delete preview participant and messages
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'preview')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params

        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createSupabaseRouteClient()

        const { isOwner } = await verifyOwnership(supabase, id, user.id)
        if (!isOwner) {
            return NextResponse.json({ error: 'Only the discussion owner can delete preview' }, { status: 403 })
        }

        // Find preview participant
        const { data: preview } = await supabase
            .from('discussion_participants')
            .select('id')
            .eq('session_id', id)
            .eq('student_id', user.id)
            .eq('is_preview', true)
            .single()

        if (!preview) {
            return NextResponse.json({ message: 'No preview to delete' })
        }

        // Delete messages first (foreign key constraint)
        const { error: messagesError } = await supabase
            .from('discussion_messages')
            .delete()
            .eq('participant_id', preview.id)

        if (messagesError) {
            console.error('Error deleting preview messages:', messagesError)
        }

        // Delete preview participant
        const { error } = await supabase
            .from('discussion_participants')
            .delete()
            .eq('id', preview.id)

        if (error) throw error

        return NextResponse.json({ message: 'Preview deleted successfully' })
    } catch (error) {
        console.error('Error deleting preview:', error)
        return NextResponse.json(
            { error: 'Failed to delete preview' },
            { status: 500 }
        )
    }
}
