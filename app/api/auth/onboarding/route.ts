import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
    // Apply rate limiting for auth endpoints
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.auth, 'auth-onboarding')
    if (rateLimitResponse) return rateLimitResponse

    try {
        // Get current authenticated user
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { role, name, student_number, school, department } = body

        if (!role || !name) {
            return NextResponse.json(
                { error: 'Missing required fields: role and name are required' },
                { status: 400 }
            )
        }

        // Use admin client to bypass RLS for profile creation
        const supabaseAdmin = await createSupabaseAdminClient()

        // Upsert profile with onboarding data
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email || '',
                name,
                role,
                student_number: student_number || null,
                school: school || null,
                department: department || null,
            }, {
                onConflict: 'id',
            })
            .select()
            .single()

        if (error) {
            console.error('Profile upsert error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Onboarding API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
