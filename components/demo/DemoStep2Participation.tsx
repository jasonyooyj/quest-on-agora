'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ThumbsUp, ThumbsDown, Minus, ArrowRight, MessageSquare, AlertCircle, Plus } from 'lucide-react'

const stanceKeys = ['pro', 'con', 'neutral', 'custom'] as const
const stanceIcons = {
  pro: ThumbsUp,
  con: ThumbsDown,
  neutral: Minus,
  custom: Plus
}
const stanceColors = {
  pro: 'emerald',
  con: 'rose',
  neutral: 'zinc',
  custom: 'purple'
}

export default function DemoStep2Participation() {
  const [showModal, setShowModal] = useState(true)
  const [hoveredStance, setHoveredStance] = useState<string | null>(null)
  const t = useTranslations('Demo')

  return (
    <div className="w-full h-full bg-white relative overflow-hidden">
      {/* Background: Chat Interface Preview */}
      <div className={`absolute inset-0 p-6 flex flex-col transition-all duration-300 ${showModal ? 'blur-sm scale-[0.98] opacity-50' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-zinc-200">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-900 line-clamp-1">{t('mockData.topic.title')}</div>
            <div className="text-sm text-zinc-500">{t('step2.joinDiscussion')}</div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <p className="text-xl font-bold text-zinc-900 mb-3">{t('step2.startAiDiscussion')}</p>
          <p className="text-base text-zinc-500 leading-relaxed max-w-[280px]">
            {t('step2.aiTutorIntro')}
          </p>
        </div>
      </div>

      {/* Stance Selector Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-6 bg-white/98 border border-zinc-200 rounded-2xl p-5 shadow-2xl z-20 flex flex-col overflow-hidden"
            >
              <div className="text-center mb-3 flex-shrink-0">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-primary/20">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900">{t('step2.selectStance')}</h2>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {stanceKeys.map((stanceKey) => {
                  const Icon = stanceIcons[stanceKey]
                  const color = stanceColors[stanceKey]
                  const isHovered = hoveredStance === stanceKey

                  return (
                    <motion.button
                      key={stanceKey}
                      onMouseEnter={() => setHoveredStance(stanceKey)}
                      onMouseLeave={() => setHoveredStance(null)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-all ${
                        color === 'emerald'
                          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:shadow-lg hover:shadow-emerald-100'
                          : color === 'rose'
                            ? 'border-rose-200 bg-rose-50/80 text-rose-700 hover:shadow-lg hover:shadow-rose-100'
                            : color === 'purple'
                              ? 'border-purple-200 bg-purple-50/80 text-purple-700 hover:shadow-lg hover:shadow-purple-100'
                              : 'border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:shadow-lg hover:shadow-zinc-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                        color === 'emerald'
                          ? 'bg-emerald-100 border-emerald-200'
                          : color === 'rose'
                            ? 'bg-rose-100 border-rose-200'
                            : color === 'purple'
                              ? 'bg-purple-100 border-purple-200'
                              : 'bg-zinc-100 border-zinc-200'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold text-base">{t(`step2.stances.${stanceKey}`)}</div>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
