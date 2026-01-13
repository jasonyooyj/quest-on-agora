'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, Minus, ArrowRight, MessageSquare, AlertCircle, Plus } from 'lucide-react'
import { DEMO_MOCK } from './mockData'

const stanceConfig = [
  { value: 'pro', label: '찬성', icon: ThumbsUp, color: 'emerald' },
  { value: 'con', label: '반대', icon: ThumbsDown, color: 'rose' },
  { value: 'neutral', label: '중립', icon: Minus, color: 'zinc' },
  { value: 'custom', label: '입장 추가', icon: Plus, color: 'purple' }
]

export default function DemoStep2Participation() {
  const [showModal, setShowModal] = useState(true)
  const [hoveredStance, setHoveredStance] = useState<string | null>(null)

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
            <div className="text-base font-bold text-zinc-900 line-clamp-1">{DEMO_MOCK.topic.title}</div>
            <div className="text-sm text-zinc-500">토론에 참여하세요</div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <p className="text-xl font-bold text-zinc-900 mb-3">AI 튜터와 토론을 시작하세요</p>
          <p className="text-base text-zinc-500 leading-relaxed max-w-[280px]">
            선택하신 입장을 바탕으로 AI 튜터가 비판적 질문을 던집니다.
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
                <h2 className="text-lg font-bold text-zinc-900">입장을 선택하세요</h2>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {stanceConfig.map((stance) => {
                  const Icon = stance.icon
                  const isHovered = hoveredStance === stance.value

                  return (
                    <motion.button
                      key={stance.value}
                      onMouseEnter={() => setHoveredStance(stance.value)}
                      onMouseLeave={() => setHoveredStance(null)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-all ${
                        stance.color === 'emerald'
                          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:shadow-lg hover:shadow-emerald-100'
                          : stance.color === 'rose'
                            ? 'border-rose-200 bg-rose-50/80 text-rose-700 hover:shadow-lg hover:shadow-rose-100'
                            : stance.color === 'purple'
                              ? 'border-purple-200 bg-purple-50/80 text-purple-700 hover:shadow-lg hover:shadow-purple-100'
                              : 'border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:shadow-lg hover:shadow-zinc-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                        stance.color === 'emerald'
                          ? 'bg-emerald-100 border-emerald-200'
                          : stance.color === 'rose'
                            ? 'bg-rose-100 border-rose-200'
                            : stance.color === 'purple'
                              ? 'bg-purple-100 border-purple-200'
                              : 'bg-zinc-100 border-zinc-200'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold text-base">{stance.label}</div>
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
