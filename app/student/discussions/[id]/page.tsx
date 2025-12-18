'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, ArrowLeft, Clock, Loader2,
    HelpCircle, MessageSquare, ThumbsUp, ThumbsDown, Minus, Users,
    AlertCircle, CheckCircle
} from 'lucide-react'
import { useDiscussionSession, useDiscussionParticipants, useParticipantMessages } from '@/hooks/useDiscussion'

const getStanceIcon = (stance: string) => {
    if (stance === 'pro') return <ThumbsUp className="w-5 h-5" />
    if (stance === 'con') return <ThumbsDown className="w-5 h-5" />
    return <Minus className="w-5 h-5" />
}

const getStanceStyle = (stance: string) => {
    if (stance === 'pro') return 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300'
    if (stance === 'con') return 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'
    return 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
}

export default function StudentDiscussionPage() {
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [message, setMessage] = useState('')
    const [showStanceSelector, setShowStanceSelector] = useState(false)
    const [sending, setSending] = useState(false)

    // Using React Query hooks
    const {
        data: discussion,
        isLoading: isDiscussionLoading
    } = useDiscussionSession(discussionId)

    const {
        data: participants,
        isLoading: isParticipantsLoading
    } = useDiscussionParticipants(discussionId)

    const supabase = getSupabaseClient()
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id)
            else router.push('/login?redirect=/student')
        })
    }, [router, supabase])

    const participant = participants?.find(p => p.studentId === userId)

    const {
        data: messages = [],
        isLoading: isMessagesLoading
    } = useParticipantMessages(discussionId, participant?.id || null)

    const isLoading = isDiscussionLoading || isParticipantsLoading || !userId

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages.length])

    const handleStanceSelect = async (stance: string) => {
        if (!participant) return

        try {
            await supabase
                .from('discussion_participants')
                .update({ stance })
                .eq('id', participant.id)

            // React Query will auto-refetch due to realtime subscription
            setShowStanceSelector(false)
            toast.success('입장이 선택되었습니다')
        } catch (error) {
            console.error('Error selecting stance:', error)
            toast.error('입장 선택 중 오류가 발생했습니다')
        }
    }

    const requestHelp = async () => {
        if (!participant) return

        try {
            const newStatus = !participant.needsHelp
            await supabase
                .from('discussion_participants')
                .update({ needs_help: newStatus })
                .eq('id', participant.id)

            toast.success(newStatus ? '도움이 요청되었습니다' : '도움 요청이 취소되었습니다')
        } catch (error) {
            console.error('Error toggling help:', error)
            toast.error('오류가 발생했습니다')
        }
    }

    const handleSendMessage = async () => {
        if (!message.trim() || !participant || sending) return

        const currentMessage = message.trim()
        setMessage('')
        setSending(true)

        try {
            const response = await fetch(`/api/discussions/${discussionId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId: participant.id,
                    content: currentMessage
                })
            })

            if (!response.ok) throw new Error('Failed to send message')

            // The hook's realtime subscription will catch the new message
        } catch (error) {
            console.error('Error sending message:', error)
            toast.error('메시지 전송에 실패했습니다')
            setMessage(currentMessage) // Rollback
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">토론방 입장 중...</p>
                </div>
            </div>
        )
    }

    if (!discussion) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="brutal-box p-8 max-w-md text-center">
                    <p>토론을 찾을 수 없습니다.</p>
                    <button onClick={() => router.push('/student')} className="btn-brutal-fill mt-4">
                        돌아가기
                    </button>
                </div>
            </div>
        )
    }

    // Check if stance needs to be selected
    const needsStanceSelection = !participant?.stance && !showStanceSelector

    // Auto-show stance selector if needed
    if (needsStanceSelection && !showStanceSelector) {
        // Use timeout to avoid bad setState during render
        setTimeout(() => setShowStanceSelector(true), 0)
    }

    const stanceLabels = discussion.settings?.stanceLabels || {
        pro: '찬성',
        con: '반대',
        neutral: '중립'
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/student"
                            className="p-2 border-2 border-border hover:border-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                                {discussion.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={`/student/discussions/${discussionId}/gallery`}
                            className="p-2 border-2 border-border hover:border-foreground transition-colors"
                            title="답변 갤러리"
                        >
                            <Users className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={requestHelp}
                            className={`p-2 border-2 transition-colors ${participant?.needsHelp
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-border hover:border-foreground'
                                }`}
                            title={participant?.needsHelp ? '도움 요청 취소' : '도움 요청'}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Stance Bar */}
            <div className="border-b-2 border-border bg-muted/30">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">내 입장:</span>
                        {participant?.stance ? (
                            <button
                                onClick={() => setShowStanceSelector(true)}
                                className={`flex items-center gap-2 px-3 py-1.5 border-2 font-medium ${participant.stance === 'pro' ? 'border-green-500 bg-green-50 text-green-700' :
                                        participant.stance === 'con' ? 'border-red-500 bg-red-50 text-red-700' :
                                            'border-gray-400 bg-gray-50 text-gray-700'
                                    }`}
                            >
                                {getStanceIcon(participant.stance)}
                                {stanceLabels[participant.stance] || participant.stance}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowStanceSelector(true)}
                                className="flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-foreground text-sm"
                            >
                                <AlertCircle className="w-4 h-4" />
                                입장 선택하기
                            </button>
                        )}
                    </div>

                    {participant?.isSubmitted && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            제출 완료
                        </span>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                <div className="max-w-3xl mx-auto space-y-6 pb-4">
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold">AI 튜터와 토론을 시작하세요</h3>
                        <p className="text-sm max-w-sm mx-auto">
                            선택하신 입장을 바탕으로 AI 튜터가 질문을 던집니다.
                            자신의 주장을 논리적으로 펼쳐보세요.
                        </p>
                        {discussion.settings?.maxTurns && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full text-xs mt-2">
                                <Clock className="w-3 h-3" />
                                <span>최대 {discussion.settings.maxTurns}턴 진행 예정</span>
                            </div>
                        )}
                    </div>

                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-4 shadow-sm border-2 ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                                    : msg.role === 'instructor'
                                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                                        : 'bg-card border-border rounded-tl-none'
                                }`}>
                                <div className="flex items-center gap-2 mb-1.5 opacity-80">
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {msg.role === 'user' ? '나' :
                                            msg.role === 'instructor' ? '교수님' : 'AI 튜터'}
                                    </span>
                                    <span className="text-[10px]">
                                        {new Date(msg.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                                    {msg.content}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Sending indicator */}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="p-4 border-2 border-sage bg-sage/10 rounded-2xl rounded-tl-none">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    AI 튜터가 생각하는 중...
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="border-t-2 border-foreground bg-background p-4 sticky bottom-0">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={sending ? "AI 튜터가 답변을 작성 중입니다..." : "메시지를 입력하세요..."}
                        className="flex-1 input-editorial resize-none h-[52px] py-3 leading-relaxed"
                        disabled={sending}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || sending}
                        className="btn-brutal-fill px-6 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </footer>

            {/* Stance Selector Modal */}
            <AnimatePresence>
                {showStanceSelector && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="brutal-box bg-background max-w-lg w-full p-6 shadow-2xl"
                        >
                            <h2 className="text-2xl font-bold mb-2">입장을 선택하세요</h2>
                            <p className="text-muted-foreground mb-6">
                                이번 토론에서 취할 입장을 선택해주세요.
                                선택한 입장에 따라 AI 튜터가 맞춤형 질문을 던집니다.
                            </p>

                            <div className="grid gap-3">
                                {(discussion.settings.stanceOptions || ['pro', 'con', 'neutral']).map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => handleStanceSelect(option)}
                                        className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all hover:translate-x-1 ${getStanceStyle(option)
                                            }`}
                                    >
                                        <div className="p-2 bg-white/50 rounded-lg">
                                            {getStanceIcon(option)}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">
                                                {stanceLabels[option] || option}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
