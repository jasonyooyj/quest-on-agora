import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { sanitizeOrFilter } from '@/lib/utils'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'admin-users')
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Verify user is authenticated and has admin access
    try {
      await requireAdmin()
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = await createSupabaseRouteClient()

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters with sanitized input to prevent SQL injection
    if (search) {
      const sanitized = sanitizeOrFilter(search)
      query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,student_number.ilike.%${sanitized}%`)
    }
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, count, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
