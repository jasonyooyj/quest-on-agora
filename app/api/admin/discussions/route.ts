import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('discussion_sessions')
      .select(`
        *,
        discussion_participants(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: discussions, count, error } = await query

    if (error) {
      console.error('Error fetching discussions:', error)
      throw error
    }

    // Get instructor names
    const instructorIds = [...new Set(discussions?.map(d => d.instructor_id) || [])]
    const { data: instructors } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', instructorIds)

    const instructorMap = new Map(instructors?.map(i => [i.id, i]) || [])

    const formattedDiscussions = discussions?.map(d => ({
      ...d,
      participant_count: d.discussion_participants?.[0]?.count || 0,
      instructor: instructorMap.get(d.instructor_id) || null
    })) || []

    return NextResponse.json({
      discussions: formattedDiscussions,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error fetching discussions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discussions' },
      { status: 500 }
    )
  }
}
