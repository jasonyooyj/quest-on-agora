import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'activity')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: messages, error } = await supabase
      .from('discussion_messages')
      .select('created_at')
      .eq('session_id', id)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching activity stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity stats' },
        { status: 500 }
      )
    }

    const now = Date.now()
    const intervalDuration = 30 * 1000
    const messagesPerInterval = new Array(10).fill(0)
    const timestamps: string[] = []

    for (let i = 0; i < 10; i += 1) {
      timestamps.push(
        new Date(now - (9 - i) * intervalDuration).toISOString()
      )
    }

    messages?.forEach((msg) => {
      const msgTime = new Date(msg.created_at).getTime()
      const timeDiff = now - msgTime
      if (timeDiff <= 5 * 60 * 1000 && timeDiff >= 0) {
        const intervalIndex = 9 - Math.floor(timeDiff / intervalDuration)
        if (intervalIndex >= 0 && intervalIndex < 10) {
          messagesPerInterval[intervalIndex] += 1
        }
      }
    })

    const totalMessages = messages?.length || 0

    return NextResponse.json({
      messagesPerInterval,
      timestamps,
      totalMessages,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
