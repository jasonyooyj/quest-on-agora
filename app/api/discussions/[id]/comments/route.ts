'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/discussions/[id]/comments - Get comments for a participant
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'comments')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id: sessionId } = await params

        // Require authentication (any logged-in user can view gallery comments)
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createSupabaseRouteClient()

        const { searchParams } = new URL(request.url)
        const participantId = searchParams.get('participantId')

        if (!participantId) {
            return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
        }

        const { data: comments, error } = await supabase
            .from('discussion_comments')
            .select('id, user_id, user_name, content, created_at')
            .eq('participant_id', participantId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching comments:', error)
            return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
        }

        return NextResponse.json({ comments: comments || [] })
    } catch (error) {
        console.error('Comments API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/discussions/[id]/comments - Add a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'comments')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id: sessionId } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { participantId, content } = body

        if (!participantId || !content?.trim()) {
            return NextResponse.json({ error: 'participantId and content are required' }, { status: 400 })
        }

        // Get user's display name
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single()

        // Verify participant belongs to this session
        const { data: participant } = await supabase
            .from('discussion_participants')
            .select('id, session_id')
            .eq('id', participantId)
            .eq('session_id', sessionId)
            .single()

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Insert comment
        const { data: comment, error } = await supabase
            .from('discussion_comments')
            .insert({
                participant_id: participantId,
                user_id: user.id,
                user_name: profile?.name || '익명',
                content: content.trim()
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding comment:', error)
            return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
        }

        return NextResponse.json({ comment })
    } catch (error) {
        console.error('Comment API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
