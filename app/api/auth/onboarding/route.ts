import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

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
    try {
        const supabase = await createSupabaseRouteClient()

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('Auth error:', authError)
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
        const supabaseAdmin = getSupabaseAdmin()

        // Upsert profile with onboarding data
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
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
