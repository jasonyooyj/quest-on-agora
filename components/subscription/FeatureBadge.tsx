'use client'

import { Crown, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FeatureBadgeProps {
  plan: 'pro' | 'institution'
  variant?: 'badge' | 'icon' | 'overlay'
  showTooltip?: boolean
  className?: string
}

export function FeatureBadge({
  plan,
  variant = 'badge',
  showTooltip = true,
  className,
}: FeatureBadgeProps) {
  const t = useTranslations('Subscription.featureBadge')

  const content = (
    <>
      {variant === 'badge' && (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
            plan === 'pro'
              ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200'
              : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200',
            className
          )}
        >
          <Crown className="w-2.5 h-2.5" />
          {plan === 'pro' ? 'Pro' : t('institution')}
        </span>
      )}

      {variant === 'icon' && (
        <span
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-md',
            plan === 'pro'
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-amber-100 text-amber-600',
            className
          )}
        >
          <Lock className="w-3 h-3" />
        </span>
      )}

      {variant === 'overlay' && (
        <div
          className={cn(
            'absolute inset-0 bg-zinc-900/5 backdrop-blur-[1px] rounded-inherit flex items-center justify-center',
            className
          )}
        >
          <div className="px-3 py-1.5 rounded-full bg-white/90 border border-zinc-200 shadow-sm flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-bold text-zinc-600">
              {plan === 'pro' ? 'Pro' : t('institution')}
            </span>
          </div>
        </div>
      )}
    </>
  )

  if (!showTooltip) {
    return content
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {plan === 'pro' ? t('proRequired') : t('institutionRequired')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
