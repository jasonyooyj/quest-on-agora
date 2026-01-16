import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ code: string }>
}

interface DiscussionSettings {
  anonymous?: boolean
  stanceOptions?: string[]
  aiMode?: string
}

// POST /api/join/[code] - Join a discussion via join code
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting to prevent brute force attacks on join codes
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.join, 'join')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { code } = await params
    const joinCode = code.toUpperCase()

    // Validate join code format
    if (!/^[A-Z0-9]{6}$/.test(joinCode)) {
      return NextResponse.json(
        { error: 'Invalid join code', code: 'INVALID_CODE' },
        { status: 400 }
      )
    }

    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can join', code: 'STUDENT_ONLY' },
        { status: 403 }
      )
    }

    const supabase = await createSupabaseRouteClient()

    // Find discussion by join code
    // Use admin client to bypass RLS (so we can distinguish between "not found" and "not active/draft")
    const supabaseAdmin = await createSupabaseAdminClient()
    const { data: discussion, error: discussionError } = await supabaseAdmin
      .from('discussion_sessions')
      .select('*')
      .eq('join_code', joinCode)
      .single()

    if (discussionError || !discussion) {
      console.error('Join code lookup failed:', {
        joinCode,
        error: discussionError?.message,
        code: discussionError?.code,
        details: discussionError?.details,
      })
      return NextResponse.json(
        { error: 'Discussion not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (discussion.status === 'draft') {
      return NextResponse.json(
        {
          error: '토론이 아직 시작되지 않았습니다. 강사에게 토론 시작을 요청해주세요.',
          code: 'DRAFT_MODE'
        },
        { status: 403 } // Forbidden
      )
    }

    if (discussion.status === 'closed') {
      return NextResponse.json(
        {
          error: '이 토론은 종료되었습니다.',
          code: 'DISCUSSION_CLOSED'
        },
        { status: 403 } // Forbidden
      )
    }


    // Check if already participating
    const { data: existing } = await supabase
      .from('discussion_participants')
      .select('id')
      .eq('session_id', discussion.id)
      .eq('student_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({
        discussionId: discussion.id,
        alreadyJoined: true,
        message: '이미 참여 중인 토론입니다',
      })
    }

    // Get participant count for anonymous display name
    const { count } = await supabase
      .from('discussion_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', discussion.id)

    const settings = discussion.settings as DiscussionSettings
    const displayName = settings?.anonymous
      ? `학생 ${(count || 0) + 1}`
      : user.name

    // Create participant record
    const { data: participant, error: insertError } = await supabase
      .from('discussion_participants')
      .insert({
        session_id: discussion.id,
        student_id: user.id,
        display_name: displayName,
        is_online: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating participant:', insertError)
      return NextResponse.json(
        { error: '토론 참여 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        discussionId: discussion.id,
        participant,
        alreadyJoined: false,
        message: '토론에 참여했습니다!',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in join route:', error)
    return NextResponse.json(
      { error: '토론 참여 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
