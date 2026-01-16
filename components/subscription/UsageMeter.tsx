'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UsageMeterProps {
  label: string
  current: number
  limit: number | null
  unit?: string
  className?: string
  showPercentage?: boolean
}

export function UsageMeter({
  label,
  current,
  limit,
  unit = '',
  className,
  showPercentage = false,
}: UsageMeterProps) {
  const isUnlimited = limit === null
  const percentage = isUnlimited ? 0 : Math.min(Math.round((current / limit) * 100), 100)
  const isNearLimit = !isUnlimited && percentage >= 80
  const isAtLimit = !isUnlimited && percentage >= 100

  const getIndicatorColor = () => {
    if (isUnlimited) return 'bg-emerald-500'
    if (isAtLimit) return 'bg-rose-500'
    if (isNearLimit) return 'bg-amber-500'
    return 'bg-primary'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-600">{label}</span>
        <span className={cn(
          'font-bold tabular-nums',
          isAtLimit ? 'text-rose-600' : isNearLimit ? 'text-amber-600' : 'text-zinc-900'
        )}>
          {current}
          {isUnlimited ? (
            <span className="text-zinc-400 font-normal"> / ∞</span>
          ) : (
            <span className="text-zinc-400 font-normal"> / {limit}{unit}</span>
          )}
          {showPercentage && !isUnlimited && (
            <span className="text-zinc-400 font-normal ml-2">({percentage}%)</span>
          )}
        </span>
      </div>
      <Progress
        value={isUnlimited ? 100 : percentage}
        className={cn('h-2', isUnlimited && 'opacity-50')}
        indicatorClassName={getIndicatorColor()}
      />
    </div>
  )
}
