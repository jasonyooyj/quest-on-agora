import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

export async function GET() {
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

    // Get user statistics
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, created_at')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const totalUsers = profiles?.length || 0
    const instructors = profiles?.filter(p => p.role === 'instructor').length || 0
    const students = profiles?.filter(p => p.role === 'student').length || 0
    const todaySignups = profiles?.filter(p => new Date(p.created_at) >= today).length || 0
    const weekSignups = profiles?.filter(p => new Date(p.created_at) >= weekAgo).length || 0

    // Get discussion statistics
    const { data: discussions, error: discussionsError } = await supabase
      .from('discussion_sessions')
      .select('id, status, created_at')

    if (discussionsError) {
      console.error('Error fetching discussions:', discussionsError)
      throw discussionsError
    }

    const totalDiscussions = discussions?.length || 0
    const activeDiscussions = discussions?.filter(d => d.status === 'active').length || 0
    const closedDiscussions = discussions?.filter(d => d.status === 'closed').length || 0

    // Get message count
    const { count: totalMessages } = await supabase
      .from('discussion_messages')
      .select('*', { count: 'exact', head: true })

    // Get recent users (last 5)
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent discussions (last 5) with instructor info
    const { data: recentDiscussionsRaw } = await supabase
      .from('discussion_sessions')
      .select(`
        id,
        title,
        status,
        created_at,
        instructor_id,
        discussion_participants(count)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get instructor names for recent discussions
    const instructorIds = [...new Set(recentDiscussionsRaw?.map(d => d.instructor_id) || [])]
    const { data: instructorProfiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', instructorIds)

    const instructorMap = new Map(instructorProfiles?.map(p => [p.id, p.name]) || [])

    const recentDiscussions = recentDiscussionsRaw?.map(d => ({
      id: d.id,
      title: d.title,
      status: d.status,
      instructor_name: instructorMap.get(d.instructor_id) || 'Unknown',
      created_at: d.created_at,
      participant_count: d.discussion_participants?.[0]?.count || 0
    })) || []

    return NextResponse.json({
      stats: {
        totalUsers,
        instructors,
        students,
        todaySignups,
        weekSignups,
        totalDiscussions,
        activeDiscussions,
        closedDiscussions,
        totalMessages: totalMessages || 0
      },
      recentUsers: recentUsers || [],
      recentDiscussions
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
