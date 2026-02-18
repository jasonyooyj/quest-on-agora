import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'node:crypto'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { createDiscussionSchema } from '@/lib/validations/discussion'
import { checkLimitAccess, incrementUsage, getSubscriptionInfo } from '@/lib/subscription'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser, requireInstructor } from '@/lib/auth'

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
export async function GET(request: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussions')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createSupabaseRouteClient()

        let discussions: unknown[]

        if (user.role === 'instructor') {
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
                id: d.id,
                title: d.title,
                description: d.description,
                status: d.status,
                joinCode: d.join_code,
                settings: d.settings,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
                participantCount: d.discussion_participants?.[0]?.count || 0
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
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussions')
    if (rateLimitResponse) return rateLimitResponse

    try {
        // Verify user is authenticated and is an instructor
        let user
        try {
            user = await requireInstructor()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unauthorized'
            const status = message.includes('Forbidden') ? 403 : 401
            return NextResponse.json({ error: message }, { status })
        }

        const supabase = await createSupabaseRouteClient()

        // Check subscription limits before creating discussion
        // Fetch subscription info once and pass to both limit checks for efficiency
        const subscriptionInfo = await getSubscriptionInfo(user.id)

        const discussionLimit = await checkLimitAccess(user.id, 'discussion', { subscriptionInfo })
        if (!discussionLimit.allowed) {
            return NextResponse.json({
                error: discussionLimit.message || '월간 토론 생성 한도에 도달했습니다.',
                code: 'DISCUSSION_LIMIT_REACHED',
                limit: discussionLimit.limit,
                current: discussionLimit.current,
                upgradeUrl: '/pricing'
            }, { status: 403 })
        }

        const activeLimit = await checkLimitAccess(user.id, 'activeDiscussions', { subscriptionInfo })
        if (!activeLimit.allowed) {
            return NextResponse.json({
                error: activeLimit.message || '동시 진행 가능한 토론 수를 초과했습니다.',
                code: 'ACTIVE_DISCUSSION_LIMIT_REACHED',
                limit: activeLimit.limit,
                current: activeLimit.current,
                upgradeUrl: '/pricing'
            }, { status: 403 })
        }

        const body = await request.json()
        const validation = createDiscussionSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 })
        }

        const { title, description, settings } = validation.data

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

        // Increment usage counters after successful creation
        await incrementUsage(user.id, 'discussions_created')
        // Note: active_discussions is incremented when discussion status changes to 'active'

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
        code += chars.charAt(randomInt(0, chars.length))
    }
    return code
}
