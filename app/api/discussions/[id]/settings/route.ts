import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { requireDiscussionOwner } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'discussion-settings')
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

    const settings = await request.json()
    const supabase = await createSupabaseRouteClient()

    const { data: currentSession, error: fetchError } = await supabase
      .from('discussion_sessions')
      .select('settings')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      )
    }

    const newSettings = {
      ...(currentSession?.settings as object),
      ...settings,
    }

    const { error } = await supabase
      .from('discussion_sessions')
      .update({ settings: newSettings })
      .eq('id', id)

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
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
