'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/discussions/[id]/gallery - Get all submitted participants with likes and comments
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'gallery')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id: sessionId } = await params
        const supabase = await createSupabaseRouteClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get discussion info
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('id, title, settings, status')
            .eq('id', sessionId)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        // Get all submitted participants
        const { data: participants, error } = await supabase
            .from('discussion_participants')
            .select(`
                id,
                display_name,
                stance,
                stance_statement,
                final_reflection,
                is_submitted,
                created_at
            `)
            .eq('session_id', sessionId)
            .eq('is_submitted', true)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching participants:', error)
            return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
        }

        // Get likes count for each participant
        const participantIds = participants?.map(p => p.id) || []

        const { data: likesData } = await supabase
            .from('discussion_likes')
            .select('participant_id, user_id')
            .in('participant_id', participantIds)

        // Get comments for each participant
        const { data: commentsData } = await supabase
            .from('discussion_comments')
            .select('id, participant_id, user_id, user_name, content, created_at')
            .in('participant_id', participantIds)
            .order('created_at', { ascending: true })

        // Build response with aggregated data
        const submissions = participants?.map(p => {
            const likes = likesData?.filter(l => l.participant_id === p.id) || []
            const comments = commentsData?.filter(c => c.participant_id === p.id) || []
            const hasLiked = likes.some(l => l.user_id === user.id)

            return {
                ...p,
                likeCount: likes.length,
                hasLiked,
                commentCount: comments.length,
                comments
            }
        }) || []

        return NextResponse.json({
            discussion: {
                id: discussion.id,
                title: discussion.title,
                settings: discussion.settings,
                status: discussion.status
            },
            submissions
        })
    } catch (error) {
        console.error('Gallery API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
