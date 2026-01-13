'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader2, ThumbsDown } from 'lucide-react'
import { DEMO_MOCK } from './mockData'

export default function DemoStep3Socratic() {
  const [isTyping, setIsTyping] = useState(true)
  const [displayedText, setDisplayedText] = useState('')
  const [thinkingMessage, setThinkingMessage] = useState('답변을 분석하고 있어요...')

  const aiResponse = DEMO_MOCK.conversation[1].content

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
    const messages = [
      '답변을 분석하고 있어요...',
      '논리적 허점을 찾고 있습니다...',
      '적절한 질문을 고르고 있어요...'
    ]
    let msgIndex = 0
    const messageInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length
      setThinkingMessage(messages[msgIndex])
    }, 500)

    return () => {
      clearTimeout(thinkingTimeout)
      clearInterval(messageInterval)
    }
  }, [isTyping, aiResponse])

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200">
            <ThumbsDown className="w-5 h-5 text-rose-500" />
            <span className="text-sm font-bold text-rose-600">반대</span>
          </div>
          <span className="text-sm text-zinc-500">입장으로 토론 중</span>
        </div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Turn 2/10</div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* User message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-end"
        >
          <div className="max-w-[85%] p-4 rounded-2xl rounded-tr-none bg-primary text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2 opacity-70">
              <span className="text-xs font-bold uppercase tracking-wide">나</span>
              <span className="text-xs">{DEMO_MOCK.conversation[0].time}</span>
            </div>
            <p className="text-base leading-relaxed">
              {DEMO_MOCK.conversation[0].content}
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
                <span className="text-base font-bold text-primary animate-pulse">{thinkingMessage}</span>
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
                <span className="text-xs font-bold uppercase tracking-wide">AI 튜터</span>
                <span className="text-xs">{DEMO_MOCK.conversation[1].time}</span>
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
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/50">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="자신의 논리를 입력하세요..."
              disabled
              className="w-full h-14 px-5 rounded-xl bg-white border border-zinc-200 text-base placeholder:text-zinc-400 disabled:opacity-50"
            />
          </div>
          <button
            disabled
            className="w-14 h-14 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
