'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Crown, ArrowRight, Lock, Zap, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface UpgradePromptProps {
  type: 'discussion' | 'activeDiscussions' | 'participants' | 'feature'
  featureName?: string
  current?: number
  limit?: number
  variant?: 'inline' | 'modal' | 'banner'
  onDismiss?: () => void
  className?: string
}

export function UpgradePrompt({
  type,
  featureName,
  current,
  limit,
  variant = 'inline',
  onDismiss,
  className,
}: UpgradePromptProps) {
  const t = useTranslations('Subscription.upgradePrompt')

  const getMessage = () => {
    switch (type) {
      case 'discussion':
        return t('discussion', { current: current ?? 0, limit: limit ?? 0 })
      case 'activeDiscussions':
        return t('activeDiscussions', { current: current ?? 0, limit: limit ?? 0 })
      case 'participants':
        return t('participants', { limit: limit ?? 0 })
      case 'feature':
        return t('feature', { feature: featureName ?? '' })
      default:
        return t('default')
    }
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white',
          className
        )}
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">{getMessage()}</p>
              <p className="text-white/80 text-sm">{t('upgradeToUnlock')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white text-indigo-600 font-bold hover:shadow-lg transition-all"
            >
              <Zap className="w-4 h-4" />
              {t('viewPlans')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (variant === 'modal') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'p-8 rounded-3xl bg-white border border-zinc-200 shadow-2xl max-w-md mx-auto text-center',
          className
        )}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 mb-3">{t('limitReached')}</h3>
        <p className="text-zinc-500 mb-6">{getMessage()}</p>
        <div className="space-y-3">
          <Link
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            <Crown className="w-5 h-5" />
            {t('upgradeToPro')}
          </Link>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full px-6 py-3 rounded-full border border-zinc-200 text-zinc-500 font-medium hover:bg-zinc-50 transition-colors"
            >
              {t('maybeLater')}
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  // Default inline variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-4',
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
        <Lock className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-800">{getMessage()}</p>
        <p className="text-xs text-amber-600">{t('upgradeToUnlock')}</p>
      </div>
      <Link
        href="/pricing"
        className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors flex-shrink-0"
      >
        {t('upgrade')}
      </Link>
    </motion.div>
  )
}
