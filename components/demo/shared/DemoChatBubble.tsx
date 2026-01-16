'use client'

import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

interface DemoChatBubbleProps {
  role: 'user' | 'ai' | 'instructor'
  content: string
  time?: string
  participantName?: string
  stance?: string
  compact?: boolean
}

const getStanceIcon = (stance: string) => {
  if (stance === 'pro') return <ThumbsUp className="w-3 h-3" />
  if (stance === 'con') return <ThumbsDown className="w-3 h-3" />
  return <Minus className="w-3 h-3" />
}

const getStanceColor = (stance: string) => {
  if (stance === 'pro') return 'text-emerald-600'
  if (stance === 'con') return 'text-rose-600'
  return 'text-zinc-500'
}

export default function DemoChatBubble({
  role,
  content,
  time,
  participantName,
  stance,
  compact = false
}: DemoChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${compact ? 'max-w-[90%] p-3' : 'max-w-[85%] p-4'} rounded-[1.25rem] transition-all ${isUser
          ? 'bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)] rounded-tr-none'
          : role === 'instructor'
            ? 'bg-amber-50 border border-amber-200 text-zinc-900 rounded-tl-none'
            : 'bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-tl-none'
        }`}>
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'opacity-70' : 'text-zinc-500'}`}>
          {participantName && stance && (
            <span className={`flex items-center gap-1 ${getStanceColor(stance)}`}>
              {getStanceIcon(stance)}
            </span>
          )}
          <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-extrabold uppercase tracking-widest`}>
            {isUser ? (participantName || '나') : role === 'instructor' ? '강사님' : 'AI 튜터'}
          </span>
          {time && (
            <span className={`${compact ? 'text-[7px]' : 'text-[8px]'} font-bold opacity-60`}>
              {time}
            </span>
          )}
        </div>
        <div className={`whitespace-pre-wrap leading-relaxed ${compact ? 'text-[11px]' : 'text-[13px]'} font-medium`}>
          {content}
        </div>
      </div>
    </div>
  )
}
