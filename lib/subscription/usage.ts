import { createSupabaseAdminClient } from '../supabase-server'

/**
 * Increment usage counter after an action
 */
export async function incrementUsage(
  userId: string,
  type: 'discussions_created' | 'active_discussions' | 'total_participants',
  amount: number = 1
): Promise<void> {
  const supabase = await createSupabaseAdminClient()

  const { data: orgMember } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  const organizationId = orgMember?.organization_id || null

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: organizationId ? null : userId,
    p_organization_id: organizationId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_field: type,
    p_amount: amount,
  })

  if (error?.code === '42883') {
    await manualIncrementUsage(
      organizationId ? null : userId,
      organizationId,
      periodStart,
      periodEnd,
      type,
      amount
    )
  }
}

/**
 * Manual usage increment (fallback if RPC not available)
 */
async function manualIncrementUsage(
  userId: string | null,
  organizationId: string | null,
  periodStart: string,
  periodEnd: string,
  field: string,
  amount: number
): Promise<void> {
  const supabase = await createSupabaseAdminClient()

  let query = supabase
    .from('usage_records')
    .select('*')
    .eq('period_start', periodStart)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  } else if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: existing } = await query.single()

  if (existing) {
    const updateData: Record<string, number> = {}
    updateData[field] = (existing[field as keyof typeof existing] as number || 0) + amount

    await supabase
      .from('usage_records')
      .update(updateData)
      .eq('id', existing.id)
  } else {
    const insertData: Record<string, unknown> = {
      user_id: userId,
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      discussions_created: 0,
      active_discussions: 0,
      total_participants: 0,
      total_messages: 0,
    }
    insertData[field] = amount

    await supabase.from('usage_records').insert(insertData)
  }
}

/**
 * Decrement usage counter (e.g., when closing a discussion)
 */
export async function decrementUsage(
  userId: string,
  type: 'active_discussions',
  amount: number = 1
): Promise<void> {
  await incrementUsage(userId, type, -amount)
}
