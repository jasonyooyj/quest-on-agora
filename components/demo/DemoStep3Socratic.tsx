'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Send, Loader2, ThumbsDown } from 'lucide-react'

export default function DemoStep3Socratic() {
  const t = useTranslations('Demo')
  const [isTyping, setIsTyping] = useState(true)
  const [displayedText, setDisplayedText] = useState('')
  const [thinkingMessageIdx, setThinkingMessageIdx] = useState(0)

  const aiResponse = t('mockData.conversation.ai')
  const thinkingMessages = [
    t('step3.thinking.1'),
    t('step3.thinking.2'),
    t('step3.thinking.3')
  ]

  // Simulate typing effect
  useEffect(() => {
    if (!isTyping) return

    // First show thinking for 1.5s
    const thinkingTimeout = setTimeout(() => {
      setIsTyping(false)
      // Then animate typing
      let currentIndex = 0
      const typingInterval = setInterval(() => {
        if (currentIndex <= aiResponse.length) {
          setDisplayedText(aiResponse.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(typingInterval)
        }
      }, 15)

      return () => clearInterval(typingInterval)
    }, 1500)

    // Rotate thinking messages
    const messageInterval = setInterval(() => {
      setThinkingMessageIdx((prev) => (prev + 1) % 3)
    }, 500)

    return () => {
      clearTimeout(thinkingTimeout)
      clearInterval(messageInterval)
    }
  }, [isTyping, aiResponse])

  return (
    <div className="w-full h-full min-h-0 bg-white flex flex-col overflow-auto">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-zinc-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-rose-50 border border-rose-200 flex-shrink-0">
            <ThumbsDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
            <span className="text-xs sm:text-sm font-bold text-rose-600">{t('step3.stance')}</span>
          </div>
          <span className="text-xs sm:text-sm text-zinc-500 truncate">{t('step3.debating')}</span>
        </div>
        <div className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wide flex-shrink-0">Turn 2/10</div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5">
        {/* User message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-end"
        >
          <div className="max-w-[85%] p-4 rounded-2xl rounded-tr-none bg-primary text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2 opacity-70">
              <span className="text-xs font-bold uppercase tracking-wide">{t('step3.me')}</span>
              <span className="text-xs">14:32</span>
            </div>
            <p className="text-base leading-relaxed">
              {t('mockData.conversation.user')}
            </p>
          </div>
        </motion.div>

        {/* AI Response or Thinking */}
        {isTyping ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="p-4 rounded-2xl rounded-tl-none bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-base font-bold text-primary animate-pulse">{thinkingMessages[thinkingMessageIdx]}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] p-4 rounded-2xl rounded-tl-none bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-2 mb-2 text-zinc-500">
                <span className="text-xs font-bold uppercase tracking-wide">{t('step3.aiTutor')}</span>
                <span className="text-xs">14:32</span>
              </div>
              <p className="text-base leading-relaxed text-zinc-900">
                {displayedText}
                {displayedText.length < aiResponse.length && (
                  <span className="inline-block w-2 h-5 bg-primary/70 animate-pulse ml-1 rounded-sm align-middle" />
                )}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-zinc-200 bg-zinc-50/50 flex-shrink-0">
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 relative">
            <input
              type="text"
              placeholder={t('step3.inputPlaceholder')}
              disabled
              className="w-full h-12 sm:h-14 px-3 sm:px-5 rounded-lg sm:rounded-xl bg-white border border-zinc-200 text-sm sm:text-base placeholder:text-zinc-400 disabled:opacity-50"
            />
          </div>
          <button
            disabled
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
