'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, ArrowLeft, ArrowRight, Clock, Loader2,
    HelpCircle, MessageSquare, ThumbsUp, ThumbsDown, Minus, Users,
    AlertCircle, CheckCircle, FileCheck
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDiscussionSession, useDiscussionParticipants, useParticipantMessages } from '@/hooks/useDiscussion'
import { ProfileMenuAuto } from '@/components/profile/ProfileMenuAuto'

import { useTranslations } from 'next-intl'

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
    const t = useTranslations('Student.DiscussionDetail')
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const discussionId = params.id as string
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [message, setMessage] = useState('')
    const [showStanceSelector, setShowStanceSelector] = useState(false)
    const [sending, setSending] = useState(false)
    const [streamingContent, setStreamingContent] = useState('')
    const [showSubmitDialog, setShowSubmitDialog] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showExtensionDialog, setShowExtensionDialog] = useState(false)
    const [requestingExtension, setRequestingExtension] = useState(false)

    // Stance Selection State
    const [tempStance, setTempStance] = useState<string | null>(null)
    const [stanceStatement, setStanceStatement] = useState('')
    const [isConfirmingStance, setIsConfirmingStance] = useState(false)

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

    // Reset stance selection state when modal opens
    useEffect(() => {
        if (!showStanceSelector) {
            setTempStance(null)
            setStanceStatement('')
            setIsConfirmingStance(false)
        }
    }, [showStanceSelector])

    const handleStanceClick = (stance: string) => {
        setTempStance(stance)
    }

    const handleConfirmStance = async () => {
        if (!participant || !tempStance || !discussion) return

        setIsConfirmingStance(true)
        try {
            await supabase
                .from('discussion_participants')
                .update({
                    stance: tempStance,
                    stance_statement: stanceStatement || null
                })
                .eq('id', participant.id)

            // React Query will auto-refetch due to realtime subscription
            setShowStanceSelector(false)

            const stanceLabel = discussion?.settings?.stanceLabels?.[tempStance] || tempStance
            toast.success(t('toasts.stanceSelected', { stance: stanceLabel }), {
                description: t('toasts.stanceDescription')
            })
        } catch (error) {
            console.error('Error selecting stance:', error)
            toast.error(t('toasts.stanceError'))
        } finally {
            setIsConfirmingStance(false)
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
                toast.success(t('toasts.helpRequested'), {
                    description: t('toasts.helpRequestedDesc')
                })
            } else {
                toast.info(t('toasts.helpCancelled'))
            }
        } catch (error) {
            console.error('Error toggling help:', error)
            toast.error(t('toasts.helpError'))
        }
    }

    const handleSubmitDiscussion = async () => {
        if (!participant || isSubmitting) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/participants`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_submitted: true })
            })

            if (!response.ok) throw new Error('Failed to submit')

            toast.success(t('toasts.submitSuccess'), {
                description: t('toasts.submitSuccessDesc')
            })
            setShowSubmitDialog(false)
        } catch (error) {
            console.error('Error submitting discussion:', error)
            toast.error(t('toasts.submitError'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSendMessage = useCallback(async (forceMessage?: string) => {
        const isAutoStart = forceMessage === ''
        const textToSend = isAutoStart ? '' : (forceMessage || message).trim()

        if (!isAutoStart && !textToSend) return
        if (!participant || sending) return

        if (!isAutoStart) setMessage('')
        setSending(true)
        setStreamingContent('')

        // Optimistic update for user message
        const optimisticUserMsgId = `temp-${Date.now()}`
        if (!isAutoStart) {
            queryClient.setQueryData(['discussion-messages', discussionId, participant.id], (old: any[] = []) => {
                return [...old, {
                    id: optimisticUserMsgId,
                    sessionId: discussionId,
                    participantId: participant.id,
                    role: 'user',
                    content: textToSend,
                    createdAt: new Date().toISOString(),
                    isVisibleToStudent: true
                }]
            })
        }

        try {
            const response = await fetch(`/api/discussions/${discussionId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId: participant.id,
                    userMessage: textToSend,
                    stream: true
                })
            })

            if (!response.ok) throw new Error('Failed to send message')

            // Handle streaming response
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('No reader available')

            let fullContent = ''

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
                                fullContent += data.chunk
                                setStreamingContent(prev => prev + data.chunk)
                            }
                            if (data.done) {
                                // Check if this was a wrap-up message
                                if (data.isClosing) {
                                    // Show extension dialog after a short delay
                                    setTimeout(() => setShowExtensionDialog(true), 1500)
                                }
                                // Streaming complete
                                // Optimistically add AI message to cache to prevent flicker
                                queryClient.setQueryData(['discussion-messages', discussionId, participant.id], (old: any[] = []) => {
                                    // Remove the optimistic user message if it was replaced by real one (optional, but good practice)
                                    // Actually, we just append the AI message. The user message might be duplicated if Realtime arrives later,
                                    // but useParticipantMessages handles deduplication by ID. Our temp ID won't match real ID.
                                    // However, we should keep it simple. Realtime will eventually handle everything.
                                    // But to stop flickering, we need the AI message HERE.

                                    const exists = old.some((msg: any) => msg.role === 'ai' && msg.content === fullContent)
                                    if (exists) return old

                                    return [...old, {
                                        id: `ai-temp-${Date.now()}`,
                                        sessionId: discussionId,
                                        participantId: participant.id,
                                        role: 'ai',
                                        content: fullContent,
                                        createdAt: new Date().toISOString(),
                                        isVisibleToStudent: true
                                    }]
                                })
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
            toast.error(t('toasts.messageSendError'))
            if (!isAutoStart) {
                setMessage(textToSend) // Rollback input
                // Rollback optimistic update
                queryClient.setQueryData(['discussion-messages', discussionId, participant.id], (old: any[] = []) => {
                    return old.filter((msg: any) => !msg.id.startsWith('temp-'))
                })
            }
            setStreamingContent('')
        } finally {
            setSending(false)
        }
    }, [discussionId, message, participant, queryClient, sending, t])

    // Auto-start discussion if stance is selected but no messages
    useEffect(() => {
        if (!isMessagesLoading && participant?.stance && messages.length === 0 && !sending && !streamingContent) {
            handleSendMessage('')
        }
    }, [handleSendMessage, isMessagesLoading, messages.length, participant?.stance, sending, streamingContent])

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
                    <p className="text-zinc-500 text-lg font-bold tracking-tight animate-pulse">{t('loading')}</p>
                </div>
            </div>
        )
    }

    if (!discussion) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="brutal-box p-8 max-w-md text-center">
                    <p>{t('notFound.title')}</p>
                    <button onClick={() => router.push('/student')} className="btn-brutal-fill mt-4">
                        {t('notFound.button')}
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
        pro: t('stanceLabels.pro'),
        con: t('stanceLabels.con'),
        neutral: t('stanceLabels.neutral')
    }

    const getAiName = (mode?: string) => {
        switch (mode) {
            case 'debate': return t('aiNames.debate')
            case 'socratic': return t('aiNames.socratic')
            case 'balanced': return t('aiNames.balanced')
            case 'minimal': return t('aiNames.minimal')
            default: return t('aiNames.default')
        }
    }

    const aiName = getAiName(discussion.settings?.aiMode)

    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden">
            {/* Bioluminescent background blobs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
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
                            title={t('header.gallery')}
                        >
                            <Users className="w-5 h-5" />
                        </Link>
                        {!participant?.isSubmitted && participant?.stance && (
                            <Link
                                href={`/student/discussions/${discussionId}/submit`}
                                className="h-11 px-4 rounded-full bg-zinc-100 text-zinc-600 font-bold text-sm flex items-center gap-2 transition-all hover:bg-zinc-200 active:scale-95 border border-zinc-200"
                                title={t('header.finish')}
                            >
                                <CheckCircle className="w-4 h-4" />
                                {t('header.finish')}
                            </Link>
                        )}
                        <button
                            onClick={requestHelp}
                            className={`h-11 px-4 rounded-full border transition-all active:scale-95 flex items-center gap-2 ${participant?.needsHelp
                                ? 'border-red-500 bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                                : 'border-red-200 text-red-600 hover:bg-red-50 shadow-sm hover:shadow-md'
                                }`}
                            title={participant?.needsHelp ? t('header.cancelHelp') : t('header.help')}
                        >
                            <HelpCircle className={`w-4 h-4 ${participant?.needsHelp ? 'animate-bounce' : ''}`} />
                            <span className="text-sm font-bold">
                                {participant?.needsHelp ? t('header.requesting') : t('header.help')}
                            </span>
                        </button>
                        <ProfileMenuAuto />
                    </div>
                </div>
            </header>

            {/* Stance Bar */}
            <div className="bg-zinc-50 border-b border-zinc-200 backdrop-blur-sm relative z-40">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stance.yourStance')}</span>
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
                                {t('stance.select')}
                            </button>
                        )}
                    </div>

                    {participant?.isSubmitted && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t('stance.submitted')}
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
                        <h3 className="text-2xl font-bold text-zinc-900 mb-3">{t('intro.title', { name: aiName })}</h3>
                        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
                            {t('intro.description', { name: aiName })}
                        </p>
                        {discussion.settings?.maxTurns && discussion.settings?.duration !== null && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-extrabold text-primary uppercase tracking-widest mt-8">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{t('intro.maxTurns', { count: discussion.settings.maxTurns })}</span>
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
                                        {msg.role === 'user' ? t('chat.roles.user') :
                                            msg.role === 'instructor' ? t('chat.roles.instructor') : aiName}
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
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{aiName}</span>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-[16px] font-medium">
                                        {streamingContent}
                                        <span className="inline-block w-2 h-5 bg-primary/80 animate-pulse ml-1 rounded-sm align-middle" />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <ThinkingIndicator aiName={aiName} />
                        )
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="border-t border-zinc-200 bg-white/80 backdrop-blur-xl p-6 sticky bottom-0 z-50">
                <div className="max-w-3xl mx-auto">
                    {participant?.isSubmitted ? (
                        <div className="flex items-center justify-center gap-3 py-4 text-zinc-500">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <p className="font-bold">{t('chat.submitted')}</p>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <div className="relative flex-1 group">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={sending ? t('input.thinking', { name: aiName }) : t('input.placeholder')}
                                    className="w-full ios-input resize-none h-[64px] py-4.5 pl-6 pr-6 leading-relaxed focus:border-primary/30 transition-all font-medium scrollbar-hide text-zinc-900"
                                    disabled={sending}
                                />
                                <div className="absolute top-0 right-0 h-full flex items-center pr-2">
                                    {/* Optional secondary actions here */}
                                </div>
                            </div>
                            <button
                                onClick={() => handleSendMessage()}
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
                    )}
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
                            {!tempStance ? (
                                // Phase 1: Select Stance
                                <>
                                    <div className="mb-10 text-center">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                            <AlertCircle className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-zinc-900 mb-3">입장을 선택하세요</h2>
                                        <p className="text-zinc-500 font-medium leading-relaxed">
                                            이번 토론에서 취할 입장을 선택해주세요. <br />
                                            선택한 한 입장에 따라 {aiName}와 심도 있는 논술을 나눕니다.
                                        </p>
                                    </div>

                                    <div className="grid gap-4">
                                        {(discussion.settings.stanceOptions || ['pro', 'con', 'neutral']).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => handleStanceClick(option)}
                                                className={`group flex items-center gap-6 p-6 border rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${getStanceStyle(option)}`}
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-200 transition-colors group-hover:bg-zinc-200">
                                                    <span className="text-2xl">{getStanceIcon(option)}</span>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-lg font-bold mb-1">
                                                        {stanceLabels[option] || option}
                                                    </div>
                                                    <div className="text-sm opacity-60 font-medium">
                                                        {option === 'pro' ? '찬성 입장에서 논리를 펼칩니다' :
                                                            option === 'con' ? '반대 입장에서 비판합니다' :
                                                                '중립적인 입장에서 탐구합니다'}
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-6 h-6 ml-auto opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                // Phase 2: Stance Statement
                                <>
                                    <div className="mb-8">
                                        <button
                                            onClick={() => setTempStance(null)}
                                            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-bold mb-6 transition-colors"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            다른 입장 선택하기
                                        </button>
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-4 font-bold text-sm ${tempStance === 'pro' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                tempStance === 'con' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                    'bg-zinc-100 text-zinc-600 border-zinc-200'
                                            }`}>
                                            <span>{getStanceIcon(tempStance)}</span>
                                            <span>{stanceLabels[tempStance] || tempStance}</span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-zinc-900 mb-2">입장 설명 작성</h2>
                                        <p className="text-zinc-500">
                                            이 입장을 선택한 이유나 주요 근거를 간단히 적어주세요.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <textarea
                                            value={stanceStatement}
                                            onChange={(e) => setStanceStatement(e.target.value)}
                                            placeholder="예: 이 안건은 장기적으로 볼 때 긍정적인 효과가 더 크기 때문에 찬성합니다..."
                                            className="w-full h-32 p-4 rounded-2xl border border-zinc-200 bg-zinc-50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-zinc-900 placeholder:text-zinc-400 ios-input"
                                            autoFocus
                                        />

                                        <button
                                            onClick={handleConfirmStance}
                                            disabled={isConfirmingStance}
                                            className="w-full h-14 bg-primary text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                                        >
                                            {isConfirmingStance ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    시작하는 중...
                                                </>
                                            ) : (
                                                <>
                                                    <span>토론 시작하기</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent className="rounded-[2rem] border-zinc-200 max-w-md">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileCheck className="w-8 h-8 text-white" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-center">
                            {t('submitDialog.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 leading-relaxed">
                            {t.rich('submitDialog.description', {
                                br: () => <br />
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-3 sm:gap-3 mt-4">
                        <AlertDialogCancel
                            className="flex-1 h-12 rounded-full border-zinc-200 font-bold"
                            disabled={isSubmitting}
                        >
                            {t('submitDialog.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSubmitDiscussion}
                            disabled={isSubmitting}
                            className="flex-1 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 font-bold"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('submitDialog.submitting')}
                                </>
                            ) : (
                                t('submitDialog.confirm')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Extension Request Dialog */}
            <AlertDialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
                <AlertDialogContent className="rounded-[2rem] border-zinc-200 max-w-md">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-white" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-center">
                            {t('extensionDialog.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 leading-relaxed">
                            {t.rich('extensionDialog.description', {
                                br: () => <br />
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 flex-col sm:flex-row">
                        <AlertDialogCancel
                            className="flex-1 h-12 rounded-full border-zinc-200 font-bold"
                            onClick={async () => {
                                setRequestingExtension(true)
                                try {
                                    await fetch(`/api/discussions/${discussionId}/participants`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ requested_extension: true })
                                    })
                                    toast.success(t('toasts.extensionSuccess'), {
                                        description: t('toasts.extensionSuccessDesc')
                                    })
                                } catch (error) {
                                    console.error('Error requesting extension:', error)
                                    toast.error(t('toasts.extensionError'))
                                } finally {
                                    setRequestingExtension(false)
                                    setShowExtensionDialog(false)
                                }
                            }}
                            disabled={requestingExtension}
                        >
                            {requestingExtension ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('extensionDialog.processing')}
                                </>
                            ) : (
                                t('extensionDialog.continue')
                            )}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowExtensionDialog(false)
                                router.push(`/student/discussions/${discussionId}/submit`)
                            }}
                            className="flex-1 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 font-bold"
                        >
                            {t('extensionDialog.submit')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function ThinkingIndicator({ aiName = 'AI 튜터' }: { aiName?: string }) {
    const t = useTranslations('Student.DiscussionDetail')
    const [message, setMessage] = useState(t('thinking.default', { name: aiName }))
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    useEffect(() => {
        const resetTimer = setTimeout(() => {
            setMessage(t('thinking.default', { name: aiName }))
        }, 0)

        return () => clearTimeout(resetTimer)
    }, [aiName, t])

    useEffect(() => {
        const messages = [
            t('thinking.messages.0'),
            t('thinking.messages.1'),
            t('thinking.messages.2'),
            t('thinking.messages.3'),
            t('thinking.messages.4')
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
    }, [t])

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
                            ? t('thinking.analyzing.short')
                            : t('thinking.analyzing.long', { seconds: elapsedSeconds })
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}
