'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, ArrowLeft, Clock, Loader2,
    HelpCircle, CheckCircle, AlertCircle,
    MessageSquare, ThumbsUp, ThumbsDown, Minus
} from 'lucide-react'

interface Discussion {
    id: string
    title: string
    description: string | null
    status: 'draft' | 'active' | 'closed'
    settings: {
        anonymous: boolean
        stanceOptions: string[]
        aiMode: string
    }
}

interface Participant {
    id: string
    display_name: string | null
    stance: string | null
    stance_statement: string | null
    is_submitted: boolean
    needs_help: boolean
}

interface Message {
    id: string
    role: 'user' | 'ai' | 'instructor' | 'system'
    content: string
    created_at: string
}

const stanceLabels: Record<string, string> = {
    pro: '찬성',
    con: '반대',
    neutral: '중립'
}

const stanceIcons: Record<string, React.ReactNode> = {
    pro: <ThumbsUp className="w-5 h-5" />,
    con: <ThumbsDown className="w-5 h-5" />,
    neutral: <Minus className="w-5 h-5" />
}

export default function StudentDiscussionPage() {
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [participant, setParticipant] = useState<Participant | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState('')
    const [showStanceSelector, setShowStanceSelector] = useState(false)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchData = useCallback(async () => {
        const supabase = getSupabaseClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login?redirect=/student')
            return
        }

        // Fetch discussion
        const { data: discussionData, error: discussionError } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', discussionId)
            .single()

        if (discussionError) {
            toast.error('토론을 찾을 수 없습니다')
            router.push('/student')
            return
        }

        setDiscussion(discussionData)

        // Fetch participant data
        const { data: participantData } = await supabase
            .from('discussion_participants')
            .select('*')
            .eq('session_id', discussionId)
            .eq('student_id', user.id)
            .single()

        if (participantData) {
            setParticipant(participantData)

            // Fetch messages for this participant
            const { data: messagesData } = await supabase
                .from('discussion_messages')
                .select('id, role, content, created_at')
                .eq('session_id', discussionId)
                .eq('participant_id', participantData.id)
                .order('created_at', { ascending: true })

            if (messagesData) {
                setMessages(messagesData)
            }
        }

        setLoading(false)
    }, [discussionId, router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Real-time message subscription
    useEffect(() => {
        if (!participant) return

        const supabase = getSupabaseClient()

        const channel = supabase
            .channel('student-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'discussion_messages',
                filter: `participant_id=eq.${participant.id}`
            }, (payload) => {
                const newMessage = payload.new as Message
                setMessages(prev => [...prev, newMessage])
            })
            .subscribe()

        // Update online status
        supabase
            .from('discussion_participants')
            .update({ is_online: true, last_active_at: new Date().toISOString() })
            .eq('id', participant.id)
            .then()

        // Set offline on unmount
        return () => {
            supabase.removeChannel(channel)
            supabase
                .from('discussion_participants')
                .update({ is_online: false })
                .eq('id', participant.id)
                .then()
        }
    }, [participant])

    const sendMessage = async (content?: string) => {
        const userMessageContent = typeof content === 'string' ? content : message.trim()
        if (!userMessageContent || !participant || sending) return

        setSending(true)
        const supabase = getSupabaseClient()

        // Insert user message
        const { error } = await supabase
            .from('discussion_messages')
            .insert({
                session_id: discussionId,
                participant_id: participant.id,
                role: 'user',
                content: userMessageContent
            })

        if (error) {
            toast.error('메시지 전송 실패')
            setSending(false)
            return
        }

        if (typeof content !== 'string') {
            setMessage('')
        }

        // Call AI chat API
        try {
            await fetch(`/api/discussions/${discussionId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId: participant.id,
                    userMessage: userMessageContent,
                    discussionId
                })
            })
            // AI response will be received via real-time subscription
        } catch (aiError) {
            console.error('AI response error:', aiError)
            // Don't fail if AI response fails - the subscription will handle it
        }

        setSending(false)
    }

    const selectStance = async (stance: string) => {
        if (!participant) return

        const supabase = getSupabaseClient()

        const { error } = await supabase
            .from('discussion_participants')
            .update({ stance })
            .eq('id', participant.id)

        if (error) {
            toast.error('입장 선택 실패')
        } else {
            setParticipant({ ...participant, stance })
            setShowStanceSelector(false)
            toast.success(`${stanceLabels[stance]} 입장을 선택했습니다`)
        }
    }

    const requestHelp = async () => {
        if (!participant) return

        const supabase = getSupabaseClient()

        const { error } = await supabase
            .from('discussion_participants')
            .update({
                needs_help: !participant.needs_help,
                help_requested_at: participant.needs_help ? null : new Date().toISOString()
            })
            .eq('id', participant.id)

        if (error) {
            toast.error('요청 실패')
        } else {
            setParticipant({ ...participant, needs_help: !participant.needs_help })
            toast.success(participant.needs_help ? '도움 요청을 취소했습니다' : '교수님께 도움을 요청했습니다')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">토론에 연결하는 중...</p>
                </div>
            </div>
        )
    }

    if (!discussion) return null

    // Discussion is not active
    if (discussion.status === 'draft') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="brutal-box p-8 max-w-md text-center">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                        토론 대기 중
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        교수님이 토론을 시작하면 참여할 수 있습니다
                    </p>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{discussion.title}</p>
                </div>
            </div>
        )
    }

    if (discussion.status === 'closed') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="brutal-box p-8 max-w-md text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                    <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                        토론 종료
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        이 토론은 종료되었습니다
                    </p>
                    <button
                        onClick={() => router.push('/student')}
                        className="btn-brutal-fill"
                    >
                        대시보드로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/student')}
                            className="p-2 border-2 border-border hover:border-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                                {discussion.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={requestHelp}
                            className={`p-2 border-2 transition-colors ${participant?.needs_help
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-border hover:border-foreground'
                                }`}
                            title={participant?.needs_help ? '도움 요청 취소' : '도움 요청'}
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
                                className={`flex items-center gap-2 px-3 py-1.5 border-2 font-medium ${participant.stance === 'pro'
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : participant.stance === 'con'
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-400 bg-gray-50 text-gray-700'
                                    }`}
                            >
                                {stanceIcons[participant.stance]}
                                {stanceLabels[participant.stance]}
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

                    {participant?.is_submitted && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            제출 완료
                        </span>
                    )}
                </div>
            </div>

            {/* Stance Selector Modal */}
            <AnimatePresence>
                {showStanceSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowStanceSelector(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background border-2 border-foreground p-6 max-w-sm w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                                입장 선택
                            </h2>
                            <p className="text-muted-foreground text-sm mb-6">
                                토론 주제에 대한 당신의 입장을 선택하세요
                            </p>

                            <div className="space-y-3">
                                {(discussion.settings.stanceOptions || ['pro', 'con', 'neutral']).map(stance => (
                                    <button
                                        key={stance}
                                        onClick={() => selectStance(stance)}
                                        className={`w-full p-4 border-2 flex items-center gap-3 transition-all ${participant?.stance === stance
                                            ? 'border-foreground bg-foreground text-background'
                                            : 'border-border hover:border-foreground'
                                            }`}
                                    >
                                        {stanceIcons[stance]}
                                        <span className="font-semibold">{stanceLabels[stance]}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                    {/* Welcome Message */}
                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h2 className="text-lg font-semibold mb-2">토론을 시작하세요</h2>
                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                {discussion.description || '주제에 대한 당신의 생각을 자유롭게 나눠보세요. AI 튜터가 함께합니다.'}
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg, index) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''
                                }`}>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                                    <span>
                                        {msg.role === 'user' ? '나' : msg.role === 'ai' ? 'AI 튜터' : '교수'}
                                    </span>
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className={`p-4 border-2 ${msg.role === 'user'
                                    ? 'border-foreground bg-foreground text-background ml-auto'
                                    : msg.role === 'ai'
                                        ? 'border-sage bg-sage/10'
                                        : 'border-coral bg-coral/10'
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Sending indicator */}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="p-4 border-2 border-sage bg-sage/10">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    AI 튜터가 생각하는 중...
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="sticky bottom-0 border-t-2 border-foreground bg-background">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                        <button
                            onClick={() => sendMessage('더 알려줘')}
                            disabled={sending}
                            className="whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            더 알려줘
                        </button>
                        <button
                            onClick={() => sendMessage('설명해줘')}
                            disabled={sending}
                            className="whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            설명해줘
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="생각을 입력하세요..."
                            className="input-editorial flex-1"
                            disabled={sending}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!message.trim() || sending}
                            className="btn-brutal-fill px-5 disabled:opacity-50"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
