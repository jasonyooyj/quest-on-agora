import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/discussions/[id]/messages - Get messages for a discussion
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'messages')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const participantId = searchParams.get('participant_id') ?? searchParams.get('participantId')
        const limit = parseInt(searchParams.get('limit') || '100')

        // Verify access
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('instructor_id')
            .eq('id', id)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        const isInstructor = discussion.instructor_id === user.id

        // If student, only get their own messages
        let query = supabase
            .from('discussion_messages')
            .select(`
        *,
        participant:discussion_participants(display_name)
      `)
            .eq('session_id', id)
            .order('created_at', { ascending: true })
            .limit(limit)

        if (!isInstructor) {
            // Get participant ID for this student
            const { data: participant } = await supabase
                .from('discussion_participants')
                .select('id')
                .eq('session_id', id)
                .eq('student_id', user.id)
                .single()

            if (!participant) {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
            }

            query = query.eq('participant_id', participant.id)
        } else if (participantId) {
            // Instructor filtering by specific participant
            query = query.eq('participant_id', participantId)
        }

        const { data: messages, error } = await query

        if (error) throw error

        return NextResponse.json({ messages })
    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        )
    }
}

// POST /api/discussions/[id]/messages - Send a message
export async function POST(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'messages')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { content, role = 'user' } = body

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        // Verify discussion exists and is active
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', id)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        if (discussion.status !== 'active') {
            return NextResponse.json({ error: 'Discussion is not active' }, { status: 400 })
        }

        const isInstructor = discussion.instructor_id === user.id
        let participantId = body.participantId || null

        if (!isInstructor) {
            // Get participant record for the student
            const { data: participant } = await supabase
                .from('discussion_participants')
                .select('id')
                .eq('session_id', id)
                .eq('student_id', user.id)
                .single()

            if (!participant) {
                return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
            }

            participantId = participant.id
        } else if (participantId) {
            // If instructor is sending to a specific participant, verify participant exists in this session
            const { data: participantExists } = await supabase
                .from('discussion_participants')
                .select('id')
                .eq('id', participantId)
                .eq('session_id', id)
                .single()

            if (!participantExists) {
                return NextResponse.json({ error: 'Participant not found in this session' }, { status: 404 })
            }
        }

        // Insert message
        const { data: message, error } = await supabase
            .from('discussion_messages')
            .insert({
                session_id: id,
                participant_id: participantId,
                role: isInstructor ? (body.role || 'instructor') : role,
                content
            })
            .select()
            .single()

        if (error) throw error

        // If student message, trigger AI response
        if (!isInstructor && role === 'user') {
            // Call AI chat endpoint (will be implemented separately)
            try {
                await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/discussions/${id}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        participantId,
                        userMessage: content,
                        discussionId: id
                    })
                })
            } catch (aiError) {
                console.error('AI response error:', aiError)
                // Don't fail the request if AI fails
            }
        }

        return NextResponse.json({ message }, { status: 201 })
    } catch (error) {
        console.error('Error sending message:', error)
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}
