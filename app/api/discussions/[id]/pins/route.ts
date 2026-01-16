import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/discussions/[id]/pins - Get pinned quotes
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'pins')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()
    const adminClient = await createSupabaseAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify discussion ownership using admin client to bypass RLS
    const { data: discussion } = await adminClient
      .from('discussion_sessions')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (!discussion || discussion.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to bypass RLS for fetching pins with participant data
    const { data: pins, error } = await adminClient
      .from('discussion_pinned_quotes')
      .select(`
        id,
        quote,
        context,
        pinned_at,
        participant:discussion_participants(display_name, stance)
      `)
      .eq('session_id', id)
      .order('pinned_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ pins })
  } catch (error) {
    console.error('Error fetching pins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pins' },
      { status: 500 }
    )
  }
}

// POST /api/discussions/[id]/pins - Pin a quote
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'pins')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()
    const adminClient = await createSupabaseAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify discussion ownership using admin client
    const { data: discussion } = await adminClient
      .from('discussion_sessions')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (!discussion || discussion.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { participantId, quote, context } = body

    if (!quote || !participantId) {
      return NextResponse.json(
        { error: 'Quote and participantId are required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for insert
    const { data: pin, error } = await adminClient
      .from('discussion_pinned_quotes')
      .insert({
        session_id: id,
        participant_id: participantId,
        quote,
        context: context || null,
        pinned_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ pin }, { status: 201 })
  } catch (error) {
    console.error('Error pinning quote:', error)
    return NextResponse.json(
      { error: 'Failed to pin quote' },
      { status: 500 }
    )
  }
}

// DELETE /api/discussions/[id]/pins - Unpin a quote
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'pins')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()
    const adminClient = await createSupabaseAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pinId = searchParams.get('pinId')

    if (!pinId) {
      return NextResponse.json({ error: 'pinId is required' }, { status: 400 })
    }

    // Verify ownership through discussion using admin client
    const { data: pin } = await adminClient
      .from('discussion_pinned_quotes')
      .select('session_id')
      .eq('id', pinId)
      .single()

    if (!pin) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    const { data: discussion } = await adminClient
      .from('discussion_sessions')
      .select('instructor_id')
      .eq('id', pin.session_id)
      .single()

    if (!discussion || discussion.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to bypass RLS for delete
    const { error } = await adminClient
      .from('discussion_pinned_quotes')
      .delete()
      .eq('id', pinId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unpinning quote:', error)
    return NextResponse.json(
      { error: 'Failed to unpin quote' },
      { status: 500 }
    )
  }
}
