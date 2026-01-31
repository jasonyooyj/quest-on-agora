'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Crown,
  Sparkles,
  Building2,
  ArrowRight,
  Clock,
  AlertTriangle,
  Check,
  Zap,
} from 'lucide-react'
import { useTranslations, useFormatter } from 'next-intl'
import { UsageMeter } from './UsageMeter'
import type { PlanName, SubscriptionInfo, SubscriptionPlan } from '@/types/subscription'
import { cn } from '@/lib/utils'

interface SubscriptionCardProps {
  subscription: SubscriptionInfo
  plans?: SubscriptionPlan[]
  compact?: boolean
  showUpgrade?: boolean
  className?: string
}

const planIcons: Record<PlanName, typeof Sparkles> = {
  free: Sparkles,
  pro: Zap,
  max: Crown,
  institution: Building2,
}

const planColors: Record<PlanName, string> = {
  free: 'from-zinc-500 to-zinc-600',
  pro: 'from-indigo-500 to-purple-600',
  max: 'from-rose-500 to-pink-600',
  institution: 'from-amber-500 to-orange-600',
}

export function SubscriptionCard({
  subscription,
  plans,
  compact = false,
  showUpgrade = true,
  className,
}: SubscriptionCardProps) {
  const t = useTranslations('Subscription')
  const format = useFormatter()

  const Icon = planIcons[subscription.planName] || Sparkles

  const isFreePlan = subscription.planName === 'free'
  const showTrialBadge = subscription.isTrial && subscription.trialEndsAt
  const showPastDueBadge = subscription.isPastDue

  const trialDaysRemaining = showTrialBadge
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  if (compact) {
    return (
      <div className={cn(
        'p-4 rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur-sm',
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
              planColors[subscription.planName]
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-900">{subscription.planDisplayName}</p>
              {showTrialBadge && (
                <p className="text-xs text-amber-600 font-medium">
                  {t('trial.daysRemaining', { days: trialDaysRemaining })}
                </p>
              )}
            </div>
          </div>
          {showUpgrade && isFreePlan && (
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              {t('upgrade')}
            </Link>
          )}
        </div>

        <div className="space-y-3">
          <UsageMeter
            label={t('usage.discussions')}
            current={subscription.usage.discussionsCreatedThisMonth}
            limit={subscription.limits.maxDiscussionsPerMonth}
          />
          <UsageMeter
            label={t('usage.activeDiscussions')}
            current={subscription.usage.activeDiscussions}
            limit={subscription.limits.maxActiveDiscussions}
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-panel p-8 border-zinc-200 shadow-sm bg-white/90 backdrop-blur-xl relative overflow-hidden',
        className
      )}
    >
      {/* Background gradient */}
      <div className={cn(
        'absolute top-0 right-0 w-60 h-60 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none opacity-20',
        subscription.planName === 'pro' && 'bg-indigo-500',
        subscription.planName === 'institution' && 'bg-amber-500',
        subscription.planName === 'free' && 'bg-zinc-400'
      )} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br shadow-lg',
              planColors[subscription.planName]
            )}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-zinc-900">{subscription.planDisplayName}</h3>
                {showTrialBadge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                    {t('trial.badge')}
                  </span>
                )}
                {showPastDueBadge && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t('status.pastDue')}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                {subscription.organizationName
                  ? t('organization', { name: subscription.organizationName })
                  : t('individualPlan')
                }
              </p>
            </div>
          </div>

          {showUpgrade && isFreePlan && (
            <Link
              href="/pricing"
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all"
            >
              <Crown className="w-4 h-4" />
              {t('upgradeToPro')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {/* Trial warning */}
        {showTrialBadge && trialDaysRemaining <= 3 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                {t('trial.expiringSoon', { days: trialDaysRemaining })}
              </p>
              <p className="text-xs text-amber-600">
                {t('trial.expiresOn', { date: format.dateTime(new Date(subscription.trialEndsAt!), { month: 'long', day: 'numeric' }) })}
              </p>
            </div>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
            >
              {t('trial.subscribe')}
            </Link>
          </div>
        )}

        {/* Usage Section */}
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">
              {t('usageThisMonth')}
            </h4>
            <div className="space-y-4">
              <UsageMeter
                label={t('usage.discussions')}
                current={subscription.usage.discussionsCreatedThisMonth}
                limit={subscription.limits.maxDiscussionsPerMonth}
                showPercentage
              />
              <UsageMeter
                label={t('usage.activeDiscussions')}
                current={subscription.usage.activeDiscussions}
                limit={subscription.limits.maxActiveDiscussions}
                showPercentage
              />
              <UsageMeter
                label={t('usage.maxParticipants')}
                current={subscription.usage.totalParticipants}
                limit={subscription.limits.maxParticipantsPerDiscussion}
                unit={t('usage.perDiscussion')}
              />
            </div>
          </div>

          {/* Features */}
          {!isFreePlan && (
            <div className="pt-6 border-t border-zinc-200">
              <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">
                {t('includedFeatures')}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {subscription.features.analytics && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {t('features.analytics')}
                  </div>
                )}
                {subscription.features.export && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {t('features.export')}
                  </div>
                )}
                {subscription.features.reports && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {t('features.reports')}
                  </div>
                )}
                {subscription.features.customAiModes && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {t('features.customAiModes')}
                  </div>
                )}
                {subscription.features.prioritySupport && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {t('features.prioritySupport')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing Info */}
          {subscription.currentPeriodEnd && !isFreePlan && (
            <div className="pt-6 border-t border-zinc-200 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                {subscription.cancelAtPeriodEnd
                  ? t('billing.cancelsOn', {
                      date: format.dateTime(new Date(subscription.currentPeriodEnd), { month: 'long', day: 'numeric' })
                    })
                  : t('billing.renewsOn', {
                      date: format.dateTime(new Date(subscription.currentPeriodEnd), { month: 'long', day: 'numeric' })
                    })
                }
              </div>
              <Link
                href="/api/billing/portal"
                className="text-sm font-bold text-primary hover:underline"
              >
                {t('billing.manage')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
