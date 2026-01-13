'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'

interface DemoParticipantItemProps {
  name: string
  stance?: string
  isOnline?: boolean
  isSubmitted?: boolean
  needsHelp?: boolean
  selected?: boolean
  compact?: boolean
}

const getStanceStyle = (stance: string) => {
  if (stance === 'pro') return 'border-emerald-200 bg-emerald-50 text-emerald-600'
  if (stance === 'con') return 'border-rose-200 bg-rose-50 text-rose-600'
  return 'border-zinc-200 bg-zinc-50 text-zinc-500'
}

const getStanceLabel = (stance: string) => {
  if (stance === 'pro') return '찬성'
  if (stance === 'con') return '반대'
  if (stance === 'neutral') return '중립'
  return stance
}

export default function DemoParticipantItem({
  name,
  stance,
  isOnline = false,
  isSubmitted = false,
  needsHelp = false,
  selected = false,
  compact = false
}: DemoParticipantItemProps) {
  return (
    <div className={`${compact ? 'p-2.5' : 'p-3'} rounded-xl border transition-all ${
      selected
        ? 'bg-primary text-white border-primary shadow-lg'
        : 'border-zinc-200 bg-white hover:bg-zinc-50'
    }`}>
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className="relative">
          <div className={`${compact ? 'w-8 h-8 text-[10px]' : 'w-9 h-9 text-xs'} rounded-full flex items-center justify-center font-bold ${
            selected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
          }`}>
            {name[0]}
          </div>
          {/* Online indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full border-2 ${
            selected ? 'border-primary' : 'border-white'
          } ${isOnline ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold truncate ${
              selected ? 'text-white' : 'text-zinc-900'
            }`}>
              {name}
            </span>
            {needsHelp && (
              <AlertCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-500 animate-pulse`} />
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {stance && (
              <span className={`${compact ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[8px]'} rounded-full font-bold border ${
                selected ? 'bg-white/20 border-white/30 text-white' : getStanceStyle(stance)
              }`}>
                {getStanceLabel(stance)}
              </span>
            )}
            {isSubmitted && (
              <CheckCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${
                selected ? 'text-white/80' : 'text-emerald-500'
              }`} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
