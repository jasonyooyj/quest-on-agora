import { LimitCheckResult, LimitType, SubscriptionInfo } from '@/types/subscription'
import { getSubscriptionInfo } from './info'

/**
 * Check if a user can perform an action based on their subscription limits
 * @param additionalContext.subscriptionInfo - Optional pre-fetched subscription info to avoid redundant DB queries
 */
export async function checkLimitAccess(
  userId: string,
  limitType: LimitType,
  additionalContext?: { currentParticipants?: number; subscriptionInfo?: SubscriptionInfo }
): Promise<LimitCheckResult> {
  const info = additionalContext?.subscriptionInfo || await getSubscriptionInfo(userId)

  switch (limitType) {
    case 'discussion':
      return checkDiscussionLimit(info)

    case 'activeDiscussions':
      return checkActiveDiscussionsLimit(info)

    case 'participants':
      return checkParticipantsLimit(info, additionalContext?.currentParticipants || 0)

    default:
      return { allowed: true, limit: null, current: 0, remaining: null, upgradeRequired: false }
  }
}

function checkDiscussionLimit(info: SubscriptionInfo): LimitCheckResult {
  const limit = info.limits.maxDiscussionsPerMonth
  const current = info.usage.discussionsCreatedThisMonth

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      current,
      remaining: null,
      upgradeRequired: false,
    }
  }

  const remaining = Math.max(0, limit - current)
  const allowed = current < limit

  return {
    allowed,
    limit,
    current,
    remaining,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : '월간 토론 생성 한도에 도달했습니다. 업그레이드하여 더 많은 토론을 만들어 보세요.',
  }
}

function checkActiveDiscussionsLimit(info: SubscriptionInfo): LimitCheckResult {
  const limit = info.limits.maxActiveDiscussions
  const current = info.usage.activeDiscussions

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      current,
      remaining: null,
      upgradeRequired: false,
    }
  }

  const remaining = Math.max(0, limit - current)
  const allowed = current < limit

  return {
    allowed,
    limit,
    current,
    remaining,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : '동시 진행 가능한 토론 수에 도달했습니다. 진행 중인 토론을 종료하거나 업그레이드하세요.',
  }
}

function checkParticipantsLimit(
  info: SubscriptionInfo,
  currentParticipants: number
): LimitCheckResult {
  const limit = info.limits.maxParticipantsPerDiscussion

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      current: currentParticipants,
      remaining: null,
      upgradeRequired: false,
    }
  }

  const remaining = Math.max(0, limit - currentParticipants)
  const allowed = currentParticipants < limit

  return {
    allowed,
    limit,
    current: currentParticipants,
    remaining,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : '이 토론의 참가자 한도에 도달했습니다.',
  }
}
