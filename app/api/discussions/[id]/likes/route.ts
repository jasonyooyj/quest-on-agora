'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

interface RouteParams {
    params: Promise<{ id: string }>
}

// POST /api/discussions/[id]/likes - Add a like
export async function POST(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'likes')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id: sessionId } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { participantId } = body

        if (!participantId) {
            return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
        }

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

        // Insert like (upsert to handle duplicates gracefully)
        const { error } = await supabase
            .from('discussion_likes')
            .upsert({
                participant_id: participantId,
                user_id: user.id
            }, {
                onConflict: 'participant_id,user_id'
            })

        if (error) {
            console.error('Error adding like:', error)
            return NextResponse.json({ error: 'Failed to add like' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Like API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/discussions/[id]/likes - Remove a like
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'likes')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id: sessionId } = await params
        const supabase = await createSupabaseRouteClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const participantId = searchParams.get('participantId')

        if (!participantId) {
            return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
        }

        // Delete like
        const { error } = await supabase
            .from('discussion_likes')
            .delete()
            .eq('participant_id', participantId)
            .eq('user_id', user.id)

        if (error) {
            console.error('Error removing like:', error)
            return NextResponse.json({ error: 'Failed to remove like' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Unlike API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
