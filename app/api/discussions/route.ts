import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

// Types for Supabase responses
interface DiscussionSession {
    id: string
    instructor_id: string
    title: string
    description: string | null
    status: string
    join_code: string
    settings: Record<string, unknown>
    created_at: string
    updated_at: string
    discussion_participants?: { count: number }[]
}

interface Participation {
    id: string
    student_id: string
    stance: string | null
    is_submitted: boolean
    session: DiscussionSession
}

// GET /api/discussions - Get all discussions for current user
export async function GET() {
    try {
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user profile to check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        let discussions: unknown[]

        if (profile.role === 'instructor') {
            // Get discussions created by instructor
            const { data, error } = await supabase
                .from('discussion_sessions')
                .select(`
          *,
          discussion_participants(count)
        `)
                .eq('instructor_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            discussions = (data as DiscussionSession[])?.map((d) => ({
                ...d,
                participant_count: d.discussion_participants?.[0]?.count || 0
            })) || []
        } else {
            // Get discussions student is participating in
            const { data, error } = await supabase
                .from('discussion_participants')
                .select(`
          *,
          session:discussion_sessions(*)
        `)
                .eq('student_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            discussions = (data as Participation[])?.map((p) => ({
                ...p.session,
                my_stance: p.stance,
                is_submitted: p.is_submitted
            })) || []
        }

        return NextResponse.json({ discussions })
    } catch (error) {
        console.error('Error fetching discussions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch discussions' },
            { status: 500 }
        )
    }
}

// POST /api/discussions - Create a new discussion
export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseRouteClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify instructor role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'instructor') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { title, description, settings } = body

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        // Generate unique join code
        const joinCode = generateJoinCode()

        const { data: discussion, error } = await supabase
            .from('discussion_sessions')
            .insert({
                instructor_id: user.id,
                title,
                description: description || null,
                status: 'draft',
                join_code: joinCode,
                settings: settings || {
                    anonymous: false,
                    stanceOptions: ['pro', 'con', 'neutral'],
                    aiMode: 'socratic'
                }
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ discussion }, { status: 201 })
    } catch (error) {
        console.error('Error creating discussion:', error)
        return NextResponse.json(
            { error: 'Failed to create discussion' },
            { status: 500 }
        )
    }
}

function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}
