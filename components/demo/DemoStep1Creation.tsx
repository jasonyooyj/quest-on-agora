'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Brain, Sparkles, Gauge, UserCircle2, EyeOff, Clock } from 'lucide-react'

const icons = {
  socratic: Brain,
  balanced: Sparkles,
  debate: Gauge,
  minimal: UserCircle2
}

const modeKeys = ['socratic', 'balanced', 'debate', 'minimal'] as const
const modeColors = {
  socratic: 'emerald',
  balanced: 'blue',
  debate: 'rose',
  minimal: 'zinc'
}

export default function DemoStep1Creation() {
  const [selectedMode, setSelectedMode] = useState<typeof modeKeys[number]>('socratic')
  const [anonymous, setAnonymous] = useState(true)
  const [duration, setDuration] = useState(15)
  const t = useTranslations('Demo')

  const maxTurns = Math.max(5, duration)

  return (
    <div className="w-full h-full bg-white p-5 flex flex-col overflow-hidden">
      {/* Topic Preview */}
      <div className="mb-4">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">{t('step1.phase1')}</div>
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
          <div className="text-base font-bold text-zinc-900 leading-snug">{t('mockData.topic.title')}</div>
        </div>
      </div>

      {/* AI Mode Selector */}
      <div className="mb-4">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">{t('step1.phase2')}</div>
        <div className="grid grid-cols-4 gap-2">
          {modeKeys.map((modeKey) => {
            const Icon = icons[modeKey]
            const isSelected = selectedMode === modeKey
            const color = modeColors[modeKey]

            return (
              <motion.button
                key={modeKey}
                onClick={() => setSelectedMode(modeKey)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl border transition-all text-center ${isSelected
                  ? 'bg-primary/10 border-primary/30 shadow-sm'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${isSelected
                  ? color === 'emerald' ? 'bg-emerald-500 text-white'
                    : color === 'blue' ? 'bg-blue-500 text-white'
                      : color === 'rose' ? 'bg-rose-500 text-white'
                        : 'bg-zinc-600 text-white'
                  : 'bg-zinc-200 text-zinc-500'
                  }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`text-sm font-bold ${isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>
                  {t(`mockData.aiModes.${modeKey}.label`)}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* AI Preview */}
      <motion.div
        key={selectedMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 rounded-xl bg-zinc-900 text-zinc-100 mb-4"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${modeColors[selectedMode] === 'emerald' ? 'bg-emerald-500'
            : modeColors[selectedMode] === 'blue' ? 'bg-blue-500'
              : modeColors[selectedMode] === 'rose' ? 'bg-rose-500'
                : 'bg-zinc-700'
            }`}>
            {(() => {
              const Icon = icons[selectedMode]
              return <Icon className="w-5 h-5" />
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wide mb-1">AI Tutor</p>
            <p className="text-sm font-medium leading-relaxed line-clamp-2 text-zinc-200">
              &quot;{t(`mockData.aiModes.${selectedMode}.preview`)}&quot;
            </p>
          </div>
        </div>
      </motion.div>

      {/* Phase 3: Settings */}
      <div className="flex-1 min-h-0">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">{t('step1.phase3')}</div>

        <div className="space-y-3">
          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{t('step1.anonymous')}</p>
                <p className="text-xs text-zinc-500">{t('step1.anonymousDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => setAnonymous(!anonymous)}
              className={`w-12 h-7 rounded-full transition-all relative ${anonymous ? 'bg-primary' : 'bg-zinc-300'
                }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${anonymous ? 'left-6' : 'left-1'
                }`} />
            </button>
          </div>

          {/* Duration */}
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{t('step1.duration')}</p>
                  <p className="text-xs text-zinc-500">{t('step1.durationDesc')}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-zinc-900">{duration}</div>
                <div className="text-xs font-bold text-zinc-400 uppercase">{t('step1.minutes')}</div>
              </div>
            </div>
            <input
              type="range"
              min="3"
              max="60"
              step="3"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between mt-3 gap-3">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-center">
                <p className="text-xs font-bold text-zinc-400 uppercase">{t('step1.expectedTurns')}</p>
                <p className="text-lg font-black text-zinc-900">{maxTurns}</p>
              </div>
              <div className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-center">
                <p className="text-xs font-bold text-zinc-400 uppercase">{t('step1.analysis')}</p>
                <p className="text-lg font-black text-zinc-900">{duration >= 30 ? 'HIGH' : 'MID'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
