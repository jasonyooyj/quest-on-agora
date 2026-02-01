'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MessageSquare, Eye, Pin, AlertCircle, HelpCircle,
  ThumbsUp, ThumbsDown, Minus, CheckCircle, ArrowLeft, X, Loader2
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useDemo, type MockStudent } from './DemoContext'
import { MOCK_CONVERSATIONS, ADDITIONAL_MOCK_MESSAGES, PINNED_QUOTES } from './mockStudentsData'
import { DEMO_MOCK } from '@/components/demo/mockData'
import { DemoCompletionCTA } from './DemoCompletionCTA'

const SIMULATION_INTERVAL = 15000 // 15 seconds between mock events

interface LiveInstructorDemoProps {
  onComplete: () => void
}

const getStanceIcon = (stance: string) => {
  if (stance === 'pro') return <ThumbsUp className="w-4 h-4" />
  if (stance === 'con') return <ThumbsDown className="w-4 h-4" />
  if (stance === 'neutral') return <Minus className="w-4 h-4" />
  return null
}

const getStanceStyle = (stance: string) => {
  if (stance === 'pro') return 'bg-emerald-50 text-emerald-600 border-emerald-200'
  if (stance === 'con') return 'bg-rose-50 text-rose-600 border-rose-200'
  if (stance === 'neutral') return 'bg-zinc-50 text-zinc-600 border-zinc-200'
  return 'bg-zinc-50 text-zinc-600 border-zinc-200'
}

export function LiveInstructorDemo({ onComplete }: LiveInstructorDemoProps) {
  const t = useTranslations('LiveDemo')
  const tInstructor = useTranslations('Instructor')
  const locale = useLocale()

  const {
    mockStudents,
    userParticipant,
    updateMockStudent,
    addMockStudentMessage,
    phase,
    setPhase,
    resetDemo,
  } = useDemo()

  const [selectedStudent, setSelectedStudent] = useState<MockStudent | null>(null)
  const [pinnedQuotes, setPinnedQuotes] = useState(PINNED_QUOTES.slice(0, 1))
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; message: string; time: string }>>([])
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const simulationTimer = useRef<NodeJS.Timeout | null>(null)
  const activityIndex = useRef(0)

  const topic = locale === 'en' ? 'Can AI Replace Human Creativity?' : DEMO_MOCK.topic.title
  const stanceLabels = {
    pro: locale === 'en' ? 'For' : '찬성',
    con: locale === 'en' ? 'Against' : '반대',
    neutral: locale === 'en' ? 'Neutral' : '중립',
  }

  // Simulate real-time updates
  useEffect(() => {
    const simulateActivity = () => {
      if (activityIndex.current >= ADDITIONAL_MOCK_MESSAGES.length) {
        // After all mock messages, show completion
        setTimeout(() => setShowCompleteModal(true), 5000)
        return
      }

      const mockMessage = ADDITIONAL_MOCK_MESSAGES[activityIndex.current]
      const student = mockStudents.find(s => s.id === mockMessage.studentId)

      if (student) {
        // Add message
        addMockStudentMessage(student.id, mockMessage.content)

        // Add to recent activity
        const activityMessage = locale === 'en'
          ? `${student.name} sent a new message`
          : `${student.name}님이 새 메시지를 보냈습니다`

        setRecentActivity(prev => [
          { id: `activity-${Date.now()}`, message: activityMessage, time: '방금 전' },
          ...prev.slice(0, 4),
        ])

        // Randomly toggle online status
        if (Math.random() > 0.7) {
          const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)]
          updateMockStudent(randomStudent.id, { isOnline: !randomStudent.isOnline })
        }

        // Randomly toggle help request
        if (Math.random() > 0.85) {
          const needsHelpStudent = mockStudents.find(s => !s.needsHelp && !s.isSubmitted)
          if (needsHelpStudent) {
            updateMockStudent(needsHelpStudent.id, { needsHelp: true })
          }
        }

        // Randomly add pin
        if (Math.random() > 0.8 && pinnedQuotes.length < 3) {
          const newPin = PINNED_QUOTES[pinnedQuotes.length]
          if (newPin) {
            setPinnedQuotes(prev => [...prev, newPin])
          }
        }
      }

      activityIndex.current++
    }

    simulationTimer.current = setInterval(simulateActivity, SIMULATION_INTERVAL)

    // Initial activity after 3 seconds
    const initialTimer = setTimeout(simulateActivity, 3000)

    return () => {
      if (simulationTimer.current) clearInterval(simulationTimer.current)
      clearTimeout(initialTimer)
    }
  }, [mockStudents, updateMockStudent, addMockStudentMessage, pinnedQuotes.length, locale])

  const handlePinQuote = useCallback((content: string, author: string, stance: string) => {
    const newPin = { content, author, stance: stance as 'pro' | 'con' | 'neutral' }
    setPinnedQuotes(prev => {
      if (prev.some(p => p.content === content)) return prev
      return [...prev, newPin].slice(0, 5)
    })
  }, [])

  const handleUnpinQuote = useCallback((content: string) => {
    setPinnedQuotes(prev => prev.filter(p => p.content !== content))
  }, [])

  const getStudentConversation = (studentId: string) => {
    return MOCK_CONVERSATIONS.find(c => c.studentId === studentId)?.messages || []
  }

  // Calculate stats
  const stats = {
    total: mockStudents.length + (userParticipant ? 1 : 0),
    online: mockStudents.filter(s => s.isOnline).length + (userParticipant ? 1 : 0),
    submitted: mockStudents.filter(s => s.isSubmitted).length,
    needsHelp: mockStudents.filter(s => s.needsHelp).length,
  }

  const stanceDistribution = {
    pro: mockStudents.filter(s => s.stance === 'pro').length + (userParticipant?.stance === 'pro' ? 1 : 0),
    con: mockStudents.filter(s => s.stance === 'con').length + (userParticipant?.stance === 'con' ? 1 : 0),
    neutral: mockStudents.filter(s => s.stance === 'neutral').length + (userParticipant?.stance === 'neutral' ? 1 : 0),
  }

  if (showCompleteModal) {
    return <DemoCompletionCTA onReset={() => { resetDemo(); window.location.href = '/demo' }} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900">
      {/* Demo Banner */}
      <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 flex items-center justify-center gap-3 relative z-50">
        <Eye className="w-5 h-5 text-purple-600" />
        <span className="text-purple-800 font-bold text-sm">{t('instructorPhase.title')}</span>
        <span className="text-purple-600 text-sm hidden sm:inline">• {t('instructorPhase.description')}</span>
        <button
          onClick={() => setShowCompleteModal(true)}
          className="ml-4 px-4 py-1.5 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 transition-colors"
        >
          {locale === 'en' ? 'Complete Demo' : '데모 완료'}
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-700 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-zinc-900 truncate max-w-[300px]">{topic}</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {stats.total}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {stats.online} {locale === 'en' ? 'online' : '온라인'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-4">
            {stats.needsHelp > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-red-600 text-sm font-bold animate-pulse">
                <HelpCircle className="w-4 h-4" />
                {stats.needsHelp} {locale === 'en' ? 'needs help' : '도움 요청'}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 text-sm font-bold">
              <CheckCircle className="w-4 h-4" />
              {stats.submitted}/{stats.total} {locale === 'en' ? 'submitted' : '제출'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Student List */}
        <div className="w-72 border-r border-zinc-200 bg-white overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-zinc-200">
            <h2 className="font-bold text-sm text-zinc-900 mb-3">
              {locale === 'en' ? 'Participants' : '참가자'} ({stats.total})
            </h2>

            {/* Stance Distribution */}
            <div className="flex gap-2 mb-4">
              {(['pro', 'con', 'neutral'] as const).map(stance => (
                <div
                  key={stance}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-center text-xs font-bold border ${getStanceStyle(stance)}`}
                >
                  {stanceDistribution[stance]}
                </div>
              ))}
            </div>
          </div>

          <div className="p-2">
            {/* Demo User (if they participated) */}
            {userParticipant && (
              <button
                onClick={() => setSelectedStudent(userParticipant)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${
                  selectedStudent?.id === userParticipant.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-zinc-50'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {locale === 'en' ? 'You' : '나'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-sm text-zinc-900">
                    {locale === 'en' ? 'You (Demo)' : '나 (데모)'}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    {getStanceIcon(userParticipant.stance)}
                    {stanceLabels[userParticipant.stance]}
                  </div>
                </div>
              </button>
            )}

            {/* Mock Students */}
            {mockStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${
                  selectedStudent?.id === student.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-zinc-50'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold text-sm">
                    {student.name.slice(0, 2)}
                  </div>
                  {student.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                    {student.name}
                    {student.needsHelp && (
                      <HelpCircle className="w-4 h-4 text-red-500 animate-pulse" />
                    )}
                    {student.isSubmitted && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    {getStanceIcon(student.stance)}
                    {stanceLabels[student.stance]}
                    <span className="mx-1">•</span>
                    {student.messageCount} {locale === 'en' ? 'msgs' : '메시지'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedStudent ? (
            <>
              {/* Selected Student Header */}
              <div className="p-4 border-b border-zinc-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold">
                    {selectedStudent.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900">{selectedStudent.name}</div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getStanceStyle(selectedStudent.stance)}`}>
                      {getStanceIcon(selectedStudent.stance)}
                      {stanceLabels[selectedStudent.stance]}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conversation */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {getStudentConversation(selectedStudent.id).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        msg.role === 'user'
                          ? 'bg-white border border-zinc-200'
                          : 'bg-zinc-100 border border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase">
                          {msg.role === 'user' ? selectedStudent.name : 'AI'}
                        </span>
                        <span className="text-[10px] text-zinc-400">{msg.time}</span>
                      </div>
                      <p className="text-sm text-zinc-900 leading-relaxed">{msg.content}</p>
                      {msg.role === 'user' && (
                        <button
                          onClick={() => handlePinQuote(msg.content, selectedStudent.name, selectedStudent.stance)}
                          className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-primary transition-colors"
                        >
                          <Pin className="w-3 h-3" />
                          {locale === 'en' ? 'Pin' : '핀'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">
                  {locale === 'en' ? 'Select a student to view their conversation' : '학생을 선택하여 대화를 확인하세요'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Overview */}
        <div className="w-80 border-l border-zinc-200 bg-white overflow-y-auto hidden lg:block">
          {/* Pinned Quotes */}
          <div className="p-4 border-b border-zinc-200">
            <h3 className="font-bold text-sm text-zinc-900 mb-3 flex items-center gap-2">
              <Pin className="w-4 h-4 text-primary" />
              {locale === 'en' ? 'Pinned Quotes' : '핀 인용'} ({pinnedQuotes.length})
            </h3>
            <div className="space-y-2">
              {pinnedQuotes.map((quote, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${getStanceStyle(quote.stance)} relative group`}
                >
                  <button
                    onClick={() => handleUnpinQuote(quote.content)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-sm leading-relaxed mb-2 pr-6">&ldquo;{quote.content}&rdquo;</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {getStanceIcon(quote.stance)}
                    {quote.author}
                  </div>
                </div>
              ))}
              {pinnedQuotes.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">
                  {locale === 'en' ? 'No pinned quotes yet' : '핀 인용이 없습니다'}
                </p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-4">
            <h3 className="font-bold text-sm text-zinc-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              {locale === 'en' ? 'Recent Activity' : '최근 활동'}
            </h3>
            <div className="space-y-2">
              {recentActivity.length === 0 && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  <span className="text-sm text-zinc-500">
                    {locale === 'en' ? 'Waiting for activity...' : '활동 대기 중...'}
                  </span>
                </div>
              )}
              {recentActivity.map(activity => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-zinc-50 rounded-xl"
                >
                  <p className="text-sm text-zinc-700">{activity.message}</p>
                  <p className="text-xs text-zinc-400 mt-1">{activity.time}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
