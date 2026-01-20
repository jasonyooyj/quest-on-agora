import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import type { StanceDistribution } from '@/types/discussion'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { requireDiscussionOwner } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'stances')
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

    // Exclude preview participants from stance distribution
    const { data: participants, error } = await supabase
      .from('discussion_participants')
      .select('stance, is_submitted')
      .eq('session_id', id)
      .eq('is_preview', false)

    if (error) {
      console.error('Error fetching participants for stances:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stances' },
        { status: 500 }
      )
    }

    const distribution: StanceDistribution = {
      pro: 0,
      con: 0,
      neutral: 0,
      unsubmitted: 0,
    }

    participants?.forEach((p) => {
      if (!p.is_submitted) {
        distribution.unsubmitted += 1
      } else if (p.stance === 'pro') {
        distribution.pro += 1
      } else if (p.stance === 'con') {
        distribution.con += 1
      } else if (p.stance === 'neutral') {
        distribution.neutral += 1
      }
    })

    return NextResponse.json({ distribution })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
