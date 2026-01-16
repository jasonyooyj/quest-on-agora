'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface LimitWarningProps {
  type: 'discussion' | 'activeDiscussions'
  current: number
  limit: number | null
  className?: string
}

export function LimitWarning({ type, current, limit, className }: LimitWarningProps) {
  const t = useTranslations('Subscription.limitWarning')

  if (limit === null) {
    // Unlimited - show info badge
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700',
          className
        )}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs font-bold">{t('unlimited')}</span>
      </motion.div>
    )
  }

  const remaining = limit - current
  const percentage = Math.round((current / limit) * 100)
  const isAtLimit = remaining <= 0
  const isNearLimit = remaining <= 1 && !isAtLimit
  const isWarning = percentage >= 70 && !isNearLimit && !isAtLimit

  if (isAtLimit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200',
          className
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-rose-800">
            {type === 'discussion' ? t('discussionLimitReached') : t('activeLimitReached')}
          </p>
          <p className="text-xs text-rose-600">
            {t('usedAll', { current, limit })}
          </p>
        </div>
      </motion.div>
    )
  }

  if (isNearLimit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200',
          className
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-800">
            {type === 'discussion' ? t('oneDiscussionLeft') : t('oneActiveLeft')}
          </p>
          <p className="text-xs text-amber-600">
            {t('used', { current, limit })}
          </p>
        </div>
      </motion.div>
    )
  }

  if (isWarning) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700',
          className
        )}
      >
        <Info className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">
          {t('remaining', { remaining })}
        </span>
      </motion.div>
    )
  }

  // Normal state - show remaining
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600',
        className
      )}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      <span className="text-xs font-bold">
        {t('available', { current, limit })}
      </span>
    </motion.div>
  )
}
