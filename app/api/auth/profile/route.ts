import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

// Create a Supabase admin client with service role key (bypasses RLS)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

export async function POST(request: NextRequest) {
    // Apply rate limiting for auth endpoints
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.auth, 'auth-profile')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const body = await request.json()
        const { id, email, name, role, student_number, school, department } = body

        if (!id || !email || !name || !role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const supabaseAdmin = getSupabaseAdmin()

        // upsert를 사용하여 이미 존재하는 프로필은 업데이트
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id,
                email,
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
            console.error('Profile creation error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
