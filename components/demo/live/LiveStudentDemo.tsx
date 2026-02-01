'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, ArrowLeft, ArrowRight, Clock, Loader2,
  MessageSquare, ThumbsUp, ThumbsDown, Minus, AlertCircle, SkipForward
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useDemo } from './DemoContext'
import { useDemoChat } from './useDemoChat'
import { DemoTransitionModal } from './DemoTransitionModal'
import { DEMO_MOCK } from '@/components/demo/mockData'

const MAX_TURNS = 5
const TRANSITION_TURN = 3

interface LiveStudentDemoProps {
  onTransitionToInstructor: () => void
}

const getStanceIcon = (stance: string) => {
  if (stance === 'pro') return <ThumbsUp className="w-5 h-5" />
  if (stance === 'con') return <ThumbsDown className="w-5 h-5" />
  if (stance === 'neutral') return <Minus className="w-5 h-5" />
  return null
}

const getStanceStyle = (stance: string) => {
  if (stance === 'pro') return 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
  if (stance === 'con') return 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
  if (stance === 'neutral') return 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
  return 'border-zinc-200 bg-zinc-50 text-zinc-600'
}

export function LiveStudentDemo({ onTransitionToInstructor }: LiveStudentDemoProps) {
  const t = useTranslations('LiveDemo')
  const tStudent = useTranslations('Student.Dashboard.DiscussionDetail')
  const locale = useLocale()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { selectedStance, setSelectedStance, turnCount, phase, setPhase } = useDemo()
  const [message, setMessage] = useState('')
  const [showStanceSelector, setShowStanceSelector] = useState(!selectedStance)
  const [showTransitionModal, setShowTransitionModal] = useState(false)
  const hasInitializedRef = useRef(false)

  const handleTurnComplete = useCallback((turn: number) => {
    if (turn >= TRANSITION_TURN && !showTransitionModal) {
      setShowTransitionModal(true)
    }
    if (turn >= MAX_TURNS) {
      onTransitionToInstructor()
    }
  }, [showTransitionModal, onTransitionToInstructor])

  const { messages, sending, streamingContent, sendMessage } = useDemoChat({
    onTurnComplete: handleTurnComplete,
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, streamingContent])

  // Auto-start conversation when stance is selected
  useEffect(() => {
    if (selectedStance && !hasInitializedRef.current && messages.length === 0 && !sending) {
      hasInitializedRef.current = true
      sendMessage('')
    }
  }, [selectedStance, messages.length, sending, sendMessage])

  const handleStanceClick = (stance: 'pro' | 'con' | 'neutral') => {
    setSelectedStance(stance)
    setShowStanceSelector(false)
  }

  const handleSendMessage = useCallback(() => {
    if (!message.trim() || sending) return
    sendMessage(message)
    setMessage('')
  }, [message, sending, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleContinueToInstructor = () => {
    setShowTransitionModal(false)
    onTransitionToInstructor()
  }

  const handleSkipToRegister = () => {
    setShowTransitionModal(false)
  }

  const stanceLabels = {
    pro: locale === 'en' ? 'For' : '찬성',
    con: locale === 'en' ? 'Against' : '반대',
    neutral: locale === 'en' ? 'Neutral' : '중립',
  }

  const aiName = locale === 'en' ? 'AI Tutor' : 'AI 튜터'
  const topic = locale === 'en' ? DEMO_MOCK.topic.title : DEMO_MOCK.topic.title

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] pointer-events-none hidden md:block" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] pointer-events-none hidden md:block" />

      {/* Demo Banner */}
      <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-3 flex items-center justify-center gap-3 relative z-50">
        <AlertCircle className="w-5 h-5 text-indigo-600" />
        <span className="text-indigo-800 font-bold text-sm">{t('studentPhase.title')}</span>
        <span className="text-indigo-600 text-sm hidden sm:inline">• {t('studentPhase.description')}</span>
        <button
          onClick={onTransitionToInstructor}
          className="ml-4 px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          <span className="hidden sm:inline">{t('studentPhase.skipToInstructor')}</span>
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Link
              href="/"
              className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-700 transition-all active:scale-90 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xl tracking-tight text-zinc-900 truncate">
                {topic}
              </h1>
            </div>
          </div>

          {/* Turn Counter */}
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full border border-zinc-200">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-bold text-zinc-700">
              {t('studentPhase.turnCounter', { current: turnCount, max: MAX_TURNS })}
            </span>
          </div>
        </div>
      </header>

      {/* Stance Bar */}
      <div className="bg-zinc-50/80 border-b border-zinc-200 backdrop-blur-xl sticky top-16 sm:top-20 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">
              {tStudent('stance.yourStance')}
            </span>
            {selectedStance ? (
              <button
                onClick={() => setShowStanceSelector(true)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border font-bold text-sm transition-all hover:translate-y-[-2px] hover:shadow-lg active:scale-95 ${getStanceStyle(selectedStance)}`}
              >
                <span className="opacity-70">{getStanceIcon(selectedStance)}</span>
                {stanceLabels[selectedStance]}
              </button>
            ) : (
              <button
                onClick={() => setShowStanceSelector(true)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-bold animate-pulse"
              >
                <AlertCircle className="w-4 h-4" />
                {tStudent('stance.select')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-10">
          {/* Intro */}
          <div className="text-center py-12 px-6">
            <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-3">
              {tStudent('intro.title', { name: aiName })}
            </h3>
            <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
              {tStudent('intro.description', { name: aiName })}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-extrabold text-primary uppercase tracking-widest mt-8">
              <Clock className="w-3.5 h-3.5" />
              <span>{tStudent('intro.maxTurns', { count: MAX_TURNS })}</span>
            </div>
          </div>

          {/* Messages */}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 transition-all ${
                msg.role === 'user'
                  ? 'bg-primary text-white shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] rounded-tr-none'
                  : 'bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm'
              }`}>
                <div className={`flex items-center gap-2 mb-2 ${msg.role === 'user' ? 'opacity-60' : 'text-zinc-500'}`}>
                  <span className="text-xs font-extrabold uppercase tracking-widest">
                    {msg.role === 'user' ? tStudent('chat.roles.user') : aiName}
                  </span>
                  <span className="text-[10px] font-bold">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Streaming AI response */}
          {sending && streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-zinc-500">
                  <span className="text-xs font-extrabold uppercase tracking-widest">{aiName}</span>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">
                  {streamingContent}
                  <span className="inline-block w-2 h-5 bg-primary/80 animate-pulse ml-1 rounded-sm align-middle" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Thinking indicator */}
          {sending && !streamingContent && (
            <div className="flex justify-start">
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] rounded-tl-none">
                <div className="flex items-center gap-3 text-sm font-bold text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="animate-pulse">{tStudent('input.thinking', { name: aiName })}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-zinc-200 bg-white/80 backdrop-blur-xl p-4 sm:p-6 sticky bottom-0 z-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 sm:gap-4">
            <div className="relative flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={sending ? tStudent('input.thinking', { name: aiName }) : tStudent('input.placeholder')}
                className="w-full resize-none h-[56px] sm:h-[64px] py-4 pl-4 sm:pl-6 pr-4 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-primary/30 transition-all font-medium text-zinc-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={sending || !selectedStance}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sending || !selectedStance}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] shadow-xl shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Stance Selector Modal */}
      <AnimatePresence>
        {showStanceSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-xl"
              onClick={() => selectedStance && setShowStanceSelector(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white max-w-xl w-full p-6 sm:p-10 shadow-2xl relative z-10 rounded-[2rem] max-h-[90vh] overflow-y-auto"
            >
              {/* Topic */}
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-2xl border border-zinc-200">
                <div className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
                  {t('topic.title')}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 mb-2">{topic}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{DEMO_MOCK.topic.description}</p>
              </div>

              <div className="mb-6 sm:mb-8 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-2">
                  {tStudent('StanceModal.title')}
                </h2>
                <p className="text-zinc-500 font-medium leading-relaxed text-sm">
                  {tStudent('StanceModal.description', { name: aiName })}
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4">
                {(['pro', 'con', 'neutral'] as const).map((stance) => (
                  <button
                    key={stance}
                    onClick={() => handleStanceClick(stance)}
                    className={`group flex items-center gap-4 sm:gap-6 p-4 sm:p-6 border rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${getStanceStyle(stance)}`}
                  >
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center border border-zinc-200 shrink-0">
                      <span className="text-xl sm:text-2xl">{getStanceIcon(stance)}</span>
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base sm:text-lg font-bold mb-1">
                        {stanceLabels[stance]}
                      </div>
                      <div className="text-sm opacity-60 font-medium">
                        {tStudent(`StanceModal.options.${stance}`)}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 hidden sm:block" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transition Modal */}
      <DemoTransitionModal
        isOpen={showTransitionModal}
        onContinue={handleContinueToInstructor}
        onSkip={handleSkipToRegister}
      />
    </div>
  )
}
