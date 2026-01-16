import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { requireDiscussionOwner } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'intervention')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Verify user is authenticated, is an instructor, and owns this discussion
    try {
      await requireDiscussionOwner(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized'
      const status = message.includes('Forbidden') ? 403 : 401
      return NextResponse.json({ error: message }, { status })
    }

    const body = await request.json()
    const { participantId, content, messageType, isVisibleToStudent } = body
    const supabase = await createSupabaseRouteClient()

    const { data: message, error } = await supabase
      .from('discussion_messages')
      .insert({
        session_id: id,
        participant_id: participantId,
        role: 'instructor',
        content,
        message_type: messageType,
        is_visible_to_student: isVisibleToStudent,
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending intervention:', error)
      return NextResponse.json(
        { error: 'Failed to send intervention' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
