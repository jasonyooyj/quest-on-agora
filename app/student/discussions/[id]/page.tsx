'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, ArrowLeft, ArrowRight, Clock, Loader2,
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
    if (stance === 'pro') return 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
    if (stance === 'con') return 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
    return 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
}

export default function StudentDiscussionPage() {
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [message, setMessage] = useState('')
    const [showStanceSelector, setShowStanceSelector] = useState(false)
    const [sending, setSending] = useState(false)
    const [streamingContent, setStreamingContent] = useState('')

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
    }, [messages.length, streamingContent])

    const handleStanceSelect = async (stance: string) => {
        if (!participant) return

        try {
            await supabase
                .from('discussion_participants')
                .update({ stance })
                .eq('id', participant.id)

            // React Query will auto-refetch due to realtime subscription
            setShowStanceSelector(false)
            const stanceLabel = stanceLabels[stance] || stance
            toast.success(`"${stanceLabel}" 입장이 선택되었습니다`, {
                description: 'AI 튜터와 토론을 시작해보세요'
            })
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
                .update({
                    needs_help: newStatus,
                    help_requested_at: newStatus ? new Date().toISOString() : null
                })
                .eq('id', participant.id)

            if (newStatus) {
                toast.success('강사에게 도움 요청이 전달되었습니다', {
                    description: '강사가 확인 후 도움을 드릴 예정입니다'
                })
            } else {
                toast.info('도움 요청이 취소되었습니다')
            }
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
        setStreamingContent('')

        try {
            const response = await fetch(`/api/discussions/${discussionId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId: participant.id,
                    userMessage: currentMessage,
                    stream: true
                })
            })

            if (!response.ok) throw new Error('Failed to send message')

            // Handle streaming response
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('No reader available')

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const text = decoder.decode(value)
                const lines = text.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.chunk) {
                                setStreamingContent(prev => prev + data.chunk)
                            }
                            if (data.done) {
                                // Streaming complete, realtime subscription will update messages
                                setStreamingContent('')
                            }
                            if (data.error) {
                                throw new Error(data.error)
                            }
                        } catch (parseError) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error sending message:', error)
            toast.error('메시지 전송에 실패했습니다')
            setMessage(currentMessage) // Rollback
            setStreamingContent('')
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
            <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply" />
                <div className="text-center relative z-10">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary relative" />
                    </div>
                    <p className="text-zinc-500 text-lg font-bold tracking-tight animate-pulse">토론방 입장 중...</p>
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
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden">
            {/* Bioluminescent background blobs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            href="/student"
                            className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-700 transition-all active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-zinc-900 line-clamp-1">
                                {discussion.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/student/discussions/${discussionId}/gallery`}
                            className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all active:scale-95"
                            title="답변 갤러리"
                        >
                            <Users className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={requestHelp}
                            className={`w-11 h-11 rounded-full border transition-all active:scale-95 flex items-center justify-center ${participant?.needsHelp
                                ? 'border-amber-300 bg-amber-100 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 shadow-none'
                                }`}
                            title={participant?.needsHelp ? '도움 요청 취소' : '도움 요청'}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Stance Bar */}
            <div className="bg-zinc-50 border-b border-zinc-200 backdrop-blur-sm relative z-40">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">내 입장</span>
                        {participant?.stance ? (
                            <button
                                onClick={() => setShowStanceSelector(true)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border font-bold text-sm transition-all hover:translate-y-[-2px] hover:shadow-lg active:scale-95 ${participant.stance === 'pro' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' :
                                    participant.stance === 'con' ? 'border-rose-200 bg-rose-50 text-rose-600' :
                                        'border-zinc-200 bg-zinc-100 text-zinc-600'
                                    }`}
                            >
                                <span className="opacity-70">{getStanceIcon(participant.stance)}</span>
                                {stanceLabels[participant.stance] || participant.stance}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowStanceSelector(true)}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-bold animate-pulse active:scale-95 transition-all"
                            >
                                <AlertCircle className="w-4 h-4" />
                                입장 선택하기
                            </button>
                        )}
                    </div>

                    {participant?.isSubmitted && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
                            <CheckCircle className="w-3.5 h-3.5" />
                            제출 완료
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-6 scroll-smooth relative z-10 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-8 pb-10">
                    <div className="text-center py-12 px-6">
                        <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <MessageSquare className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-900 mb-3">AI 튜터와 토론을 시작하세요</h3>
                        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
                            선택하신 입장을 바탕으로 AI 튜터가 비판적 질문을 던집니다.
                            자신의 주장을 논리적으로 펼쳐보세요.
                        </p>
                        {discussion.settings?.maxTurns && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-extrabold text-primary uppercase tracking-widest mt-8">
                                <Clock className="w-3.5 h-3.5" />
                                <span>최대 {discussion.settings.maxTurns}턴 진행</span>
                            </div>
                        )}
                    </div>

                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] lg:max-w-[75%] rounded-[2rem] p-6 transition-all ${msg.role === 'user'
                                ? 'bg-primary text-white shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] rounded-tr-none'
                                : msg.role === 'instructor'
                                    ? 'glass-panel bg-amber-50 border-amber-200 text-zinc-900 rounded-tl-none shadow-sm'
                                    : 'glass-panel bg-zinc-50 border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm backdrop-blur-xl'
                                }`}>
                                <div className={`flex items-center gap-3 mb-3 ${msg.role === 'user' ? 'opacity-60' : 'text-zinc-500'}`}>
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest">
                                        {msg.role === 'user' ? '나' :
                                            msg.role === 'instructor' ? '교수님' : 'AI 튜터'}
                                    </span>
                                    <span className="text-[9px] font-bold">
                                        {new Date(msg.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`whitespace-pre-wrap leading-relaxed text-[16px] font-medium ${msg.role === 'user' ? 'selection:bg-white/20' : ''}`}>
                                    {msg.content}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Streaming AI response or thinking indicator */}
                    {sending && (
                        streamingContent ? (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                            >
                                <div className="max-w-[85%] lg:max-w-[75%] rounded-[2rem] p-6 glass-panel bg-zinc-50 border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm backdrop-blur-xl">
                                    <div className="flex items-center gap-3 mb-3 text-zinc-500">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest">AI 튜터</span>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-[16px] font-medium">
                                        {streamingContent}
                                        <span className="inline-block w-2 h-5 bg-primary/80 animate-pulse ml-1 rounded-sm align-middle" />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <ThinkingIndicator />
                        )
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="border-t border-zinc-200 bg-white/80 backdrop-blur-xl p-6 sticky bottom-0 z-50">
                <div className="max-w-3xl mx-auto flex gap-4">
                    <div className="relative flex-1 group">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={sending ? "AI 튜터가 고찰 중입니다..." : "자신의 논리를 입력하세요..."}
                            className="w-full ios-input resize-none h-[64px] py-4.5 pl-6 pr-6 leading-relaxed focus:border-primary/30 transition-all font-medium scrollbar-hide text-zinc-900"
                            disabled={sending}
                        />
                        <div className="absolute top-0 right-0 h-full flex items-center pr-2">
                            {/* Optional secondary actions here */}
                        </div>
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || sending}
                        className="group relative w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] shadow-xl"
                    >
                        {sending ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Send className="w-6 h-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                    </button>
                </div>
            </footer>

            {/* Stance Selector Modal */}
            <AnimatePresence>
                {showStanceSelector && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/30 backdrop-blur-xl"
                            onClick={() => setShowStanceSelector(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="glass-panel bg-white/95 border-zinc-200 max-w-xl w-full p-10 shadow-2xl relative z-10 backdrop-blur-xl"
                        >
                            <div className="mb-10 text-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                    <AlertCircle className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-3xl font-bold text-zinc-900 mb-3">입장을 선택하세요</h2>
                                <p className="text-zinc-500 font-medium leading-relaxed">
                                    이번 토론에서 취할 입장을 선택해주세요. <br />
                                    선택한 한 입장에 따라 AI 튜터와 심도 있는 논술을 나눕니다.
                                </p>
                            </div>

                            <div className="grid gap-4">
                                {(discussion.settings.stanceOptions || ['pro', 'con', 'neutral']).map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => handleStanceSelect(option)}
                                        className={`group flex items-center gap-6 p-6 border rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${getStanceStyle(option)
                                            }`}
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-200 transition-colors group-hover:bg-zinc-200">
                                            {getStanceIcon(option)}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-xl tracking-tight">
                                                {stanceLabels[option] || option}
                                            </div>
                                            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-40 mt-1">Select this stance</div>
                                        </div>
                                        <ArrowRight className="w-6 h-6 ml-auto opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
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

function ThinkingIndicator() {
    const [message, setMessage] = useState('AI 튜터가 답변을 작성 중입니다...')
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    useEffect(() => {
        const messages = [
            '답변을 꼼꼼히 읽고 있어요...',
            '논리적인 답변을 구상 중입니다...',
            '반론을 생각하고 있습니다...',
            '적절한 질문을 고르고 있어요...',
            '답변을 다듬는 중입니다...'
        ]
        let index = 0

        const messageInterval = setInterval(() => {
            index = (index + 1) % messages.length
            setMessage(messages[index])
        }, 3000)

        const timerInterval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1)
        }, 1000)

        return () => {
            clearInterval(messageInterval)
            clearInterval(timerInterval)
        }
    }, [])

    return (
        <div className="flex justify-start">
            <div className="p-6 glass-panel bg-primary/5 border-primary/20 rounded-[2rem] rounded-tl-none shadow-sm">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-sm font-bold text-primary">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="animate-pulse tracking-tight">{message}</span>
                    </div>
                    <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest pl-8">
                        {elapsedSeconds < 5
                            ? `잠시만 기다려주세요... (약 3-5초 소요)`
                            : `${elapsedSeconds}초 경과 - 심층 분석 중...`
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}
