import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient, createSupabaseAdminClient } from '@/lib/supabase-server'

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
  try {
    const { code } = await params
    const joinCode = code.toUpperCase()

    // Validate join code format
    if (!/^[A-Z0-9]{6}$/.test(joinCode)) {
      return NextResponse.json(
        { error: '유효하지 않은 참여 코드입니다' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseRouteClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다', needsOnboarding: true },
        { status: 403 }
      )
    }

    if (profile.role !== 'student') {
      return NextResponse.json(
        { error: '학생만 토론에 참여할 수 있습니다' },
        { status: 403 }
      )
    }

    // Find discussion by join code
    // Use admin client to bypass RLS (so we can distinguish between "not found" and "not active/draft")
    const supabaseAdmin = await createSupabaseAdminClient()
    const { data: discussion, error: discussionError } = await supabaseAdmin
      .from('discussion_sessions')
      .select('*')
      .eq('join_code', joinCode)
      .single()

    if (discussionError || !discussion) {
      return NextResponse.json(
        { error: '존재하지 않는 참여 코드입니다' },
        { status: 404 }
      )
    }

    if (discussion.status === 'draft') {
      return NextResponse.json(
        {
          error: '이 토론은 아직 시작되지 않았습니다. 강사가 시작할 때까지 기다려주세요.',
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
      : profile.name

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
