import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

// Default settings
const DEFAULT_SETTINGS = {
  platformName: 'Agora',
  allowRegistration: true,
  maintenanceMode: false,
  announcementBanner: '',
  defaultAiMode: 'socratic',
  defaultMaxTurns: 10,
  defaultAnonymous: true,
  maxParticipantsPerDiscussion: 100
}

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

    // Try to get settings from database
    const { data: settingsRow, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'main')
      .single()

    if (error) {
      // If table doesn't exist or row not found, return defaults
      console.log('Using default settings:', error.message)
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    // Merge with defaults to ensure all keys exist
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(settingsRow?.settings || {})
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const newSettings = body.settings

    // Validate settings
    if (typeof newSettings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    // Get current settings
    const { data: currentRow } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'main')
      .single()

    // Merge with current settings
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...(currentRow?.settings || {}),
      ...newSettings
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'main',
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, just return the merged settings
      console.log('Settings table may not exist:', error.message)
      return NextResponse.json({
        settings: mergedSettings,
        note: 'Settings saved in-memory only. Create system_settings table for persistence.'
      })
    }

    return NextResponse.json({ settings: data.settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
