import { SubscriptionFeatures, SubscriptionInfo } from '@/types/subscription'
import { getSubscriptionInfo } from './info'

/**
 * Check if a user has access to a specific feature
 * @param subscriptionInfo - Optional pre-fetched subscription info to avoid redundant DB queries
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof SubscriptionFeatures,
  subscriptionInfo?: SubscriptionInfo
): Promise<boolean> {
  const info = subscriptionInfo || await getSubscriptionInfo(userId)
  return info.features[feature] || false
}

/**
 * Check multiple features at once (more efficient)
 * @param subscriptionInfo - Optional pre-fetched subscription info to avoid redundant DB queries
 */
export async function checkFeaturesAccess(
  userId: string,
  features: (keyof SubscriptionFeatures)[],
  subscriptionInfo?: SubscriptionInfo
): Promise<Record<string, boolean>> {
  const info = subscriptionInfo || await getSubscriptionInfo(userId)

  const result: Record<string, boolean> = {}
  for (const feature of features) {
    result[feature] = info.features[feature] || false
  }

  return result
}
