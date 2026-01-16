import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { requireDiscussionOwner } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussion-close')
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

    const supabase = await createSupabaseRouteClient()

    const { error } = await supabase
      .from('discussion_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error closing session:', error)
      return NextResponse.json(
        { error: 'Failed to close session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
