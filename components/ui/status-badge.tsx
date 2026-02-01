import { cn } from '@/lib/utils'

export type DiscussionStatus = 'draft' | 'active' | 'closed'

interface StatusBadgeProps {
  status: DiscussionStatus | string
  labels?: {
    draft?: string
    active?: string
    closed?: string
  }
  variant?: 'default' | 'compact'
  className?: string
}

const statusStyles: Record<DiscussionStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  active: 'bg-primary/10 text-primary border-primary/20',
  closed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const defaultLabels: Record<DiscussionStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
}

export function StatusBadge({
  status,
  labels,
  variant = 'default',
  className,
}: StatusBadgeProps) {
  const validStatus = (status as DiscussionStatus) in statusStyles
    ? (status as DiscussionStatus)
    : 'draft'

  const style = statusStyles[validStatus]
  const label = labels?.[validStatus] ?? defaultLabels[validStatus]

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-tight',
        style,
        variant === 'compact' && 'px-2 py-0.5 text-[10px]',
        className
      )}
    >
      {label}
    </span>
  )
}

interface LiveStatusBadgeProps {
  status: DiscussionStatus | string
  labels?: {
    draft?: string
    active?: string
    closed?: string
  }
  className?: string
}

export function LiveStatusBadge({
  status,
  labels,
  className,
}: LiveStatusBadgeProps) {
  const validStatus = (status as DiscussionStatus) in statusStyles
    ? (status as DiscussionStatus)
    : 'draft'

  if (validStatus === 'active') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-500',
          className
        )}
      >
        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
        {labels?.active ?? 'Live'}
      </div>
    )
  }

  if (validStatus === 'closed') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500',
          className
        )}
      >
        {labels?.closed ?? 'Closed'}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-600',
        className
      )}
    >
      {labels?.draft ?? 'Draft'}
    </div>
  )
}
