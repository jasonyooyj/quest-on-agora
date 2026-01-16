import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { updateParticipantSchema } from '@/lib/validations/discussion'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface DiscussionSettings {
    anonymous?: boolean
    stanceOptions?: string[]
    aiMode?: string
}

// GET /api/discussions/[id]/participants - Get participants
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'participants')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify instructor access
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('instructor_id')
            .eq('id', id)
            .single()

        if (!discussion || discussion.instructor_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: participants, error } = await supabase
            .from('discussion_participants')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json({ participants })
    } catch (error) {
        console.error('Error fetching participants:', error)
        return NextResponse.json(
            { error: 'Failed to fetch participants' },
            { status: 500 }
        )
    }
}

// POST /api/discussions/[id]/participants - Join a discussion
export async function POST(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'participants')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'student') {
            return NextResponse.json({ error: 'Only students can join discussions' }, { status: 403 })
        }

        // Verify discussion exists and is joinable
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', id)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        if (discussion.status !== 'active') {
            return NextResponse.json({ error: 'Discussion is not accepting participants' }, { status: 400 })
        }

        // Check if already participating
        const { data: existing } = await supabase
            .from('discussion_participants')
            .select('id')
            .eq('session_id', id)
            .eq('student_id', user.id)
            .single()

        if (existing) {
            return NextResponse.json({
                participant: existing,
                message: 'Already participating'
            })
        }

        // Get participant count for display name
        const { count } = await supabase
            .from('discussion_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', id)

        const settings = discussion.settings as DiscussionSettings
        const displayName = settings?.anonymous
            ? `학생 ${(count || 0) + 1}`
            : profile.name

        const { data: participant, error } = await supabase
            .from('discussion_participants')
            .insert({
                session_id: id,
                student_id: user.id,
                display_name: displayName,
                is_online: true
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ participant }, { status: 201 })
    } catch (error) {
        console.error('Error joining discussion:', error)
        return NextResponse.json(
            { error: 'Failed to join discussion' },
            { status: 500 }
        )
    }
}

// PATCH /api/discussions/[id]/participants - Update participant status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'participants')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validation = updateParticipantSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 })
        }

        const { stance, stance_statement, final_reflection, is_submitted, needs_help, is_online, requested_extension } = validation.data

        // Get participant record
        const { data: participant } = await supabase
            .from('discussion_participants')
            .select('id')
            .eq('session_id', id)
            .eq('student_id', user.id)
            .single()

        if (!participant) {
            return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
            last_active_at: new Date().toISOString()
        }

        if (stance !== undefined) updateData.stance = stance
        if (stance_statement !== undefined) updateData.stance_statement = stance_statement
        if (final_reflection !== undefined) updateData.final_reflection = final_reflection
        if (is_submitted !== undefined) updateData.is_submitted = is_submitted
        if (needs_help !== undefined) {
            updateData.needs_help = needs_help
            if (needs_help) {
                updateData.help_requested_at = new Date().toISOString()
            }
        }
        if (is_online !== undefined) updateData.is_online = is_online
        if (requested_extension !== undefined) {
            updateData.requested_extension = requested_extension
            if (requested_extension) {
                updateData.extension_requested_at = new Date().toISOString()
            }
        }

        const { data: updated, error } = await supabase
            .from('discussion_participants')
            .update(updateData)
            .eq('id', participant.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ participant: updated })
    } catch (error) {
        console.error('Error updating participant:', error)
        return NextResponse.json(
            { error: 'Failed to update participant' },
            { status: 500 }
        )
    }
}
