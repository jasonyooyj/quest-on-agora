import { createSupabaseAdminClient } from '../supabase-server'
import { PlanName, SubscriptionPlanRow, transformPlanRow } from '@/types/subscription'

/**
 * Get all available subscription plans
 */
export async function getAvailablePlans(locale: 'ko' | 'en' = 'ko') {
  const supabase = await createSupabaseAdminClient()

  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('tier', { ascending: true })

  if (error) {
    console.error('Error fetching plans:', error)
    return []
  }

  return (plans as SubscriptionPlanRow[]).map(transformPlanRow)
}

/**
 * Get a specific plan by ID
 */
export async function getPlanById(planId: string) {
  const supabase = await createSupabaseAdminClient()

  const { data: plan, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (error || !plan) {
    if (error) {
      console.error('[getPlanById] planId=', planId, 'error=', error.message, error.code)
    }
    return null
  }

  return transformPlanRow(plan as SubscriptionPlanRow)
}

/**
 * Get a plan by name
 */
export async function getPlanByName(name: PlanName) {
  const supabase = await createSupabaseAdminClient()

  const { data: plan, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single()

  if (error || !plan) {
    return null
  }

  return transformPlanRow(plan as SubscriptionPlanRow)
}
