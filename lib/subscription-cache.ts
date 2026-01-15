/**
 * Subscription Info Cache
 *
 * In-memory cache for subscription information to reduce database queries.
 * Follows the same pattern as rate-limiter.ts.
 *
 * Note: This works for single-server deployments.
 * For production at scale, consider using Redis.
 */

import { SubscriptionInfo } from '@/types/subscription'
import { createSupabaseAdminClient } from './supabase-server'

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_TTL_MS = 30 * 1000 // 30 seconds
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cached subscription info without locale-specific display name.
 * The planDisplayName will be computed on retrieval based on locale.
 */
interface CachedSubscriptionInfo extends Omit<SubscriptionInfo, 'planDisplayName'> {
  // Stored without planDisplayName to allow locale-specific retrieval
}

interface SubscriptionCacheEntry {
  data: CachedSubscriptionInfo
  expiresAt: number
}

// ============================================================================
// CACHE STORE
// ============================================================================

const subscriptionCache = new Map<string, SubscriptionCacheEntry>()
let lastCleanup = Date.now()

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Clean up expired cache entries periodically
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  lastCleanup = now
  for (const [key, entry] of subscriptionCache.entries()) {
    if (entry.expiresAt < now) {
      subscriptionCache.delete(key)
    }
  }
}

/**
 * Get cached subscription info for a user
 * Returns null if cache miss or expired
 */
export function getCachedSubscriptionInfo(
  userId: string,
  locale: 'ko' | 'en' = 'ko'
): SubscriptionInfo | null {
  cleanupExpiredEntries()

  const entry = subscriptionCache.get(userId)
  if (!entry) return null

  const now = Date.now()
  if (entry.expiresAt < now) {
    subscriptionCache.delete(userId)
    return null
  }

  // Add locale-specific display name on retrieval
  const displayNames: Record<string, { ko: string; en: string }> = {
    free: { ko: '무료', en: 'Free' },
    pro: { ko: 'Pro', en: 'Pro' },
    institution: { ko: '기관', en: 'Institution' },
  }

  return {
    ...entry.data,
    planDisplayName: displayNames[entry.data.planName]?.[locale] || entry.data.planName,
  }
}

/**
 * Store subscription info in cache
 * Strips out planDisplayName since it's locale-dependent
 */
export function setCachedSubscriptionInfo(
  userId: string,
  info: SubscriptionInfo
): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { planDisplayName, ...cacheData } = info

  subscriptionCache.set(userId, {
    data: cacheData,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * Invalidate cache for a specific user
 */
export function invalidateSubscriptionCache(userId: string): void {
  subscriptionCache.delete(userId)
}

/**
 * Invalidate cache for all members of an organization
 * Used when organization subscription changes
 */
export async function invalidateOrganizationMembersCache(
  organizationId: string
): Promise<void> {
  const supabase = await createSupabaseAdminClient()

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .not('joined_at', 'is', null)

  if (members) {
    for (const member of members) {
      invalidateSubscriptionCache(member.user_id)
    }
  }
}

/**
 * Clear entire cache (useful for testing)
 */
export function clearSubscriptionCache(): void {
  subscriptionCache.clear()
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getSubscriptionCacheStats(): {
  size: number
  ttlMs: number
  cleanupIntervalMs: number
} {
  return {
    size: subscriptionCache.size,
    ttlMs: CACHE_TTL_MS,
    cleanupIntervalMs: CLEANUP_INTERVAL_MS,
  }
}
