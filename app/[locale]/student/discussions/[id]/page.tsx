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

import { useTranslations, useLocale } from 'next-intl'

const getStanceIcon = (stance: string, index?: number) => {
    if (stance === 'pro') return <ThumbsUp className="w-5 h-5" />
    if (stance === 'con') return <ThumbsDown className="w-5 h-5" />
    if (stance === 'neutral') return <Minus className="w-5 h-5" />
    // Custom stances - use index to differentiate or default to HelpCircle
    return <HelpCircle className="w-5 h-5" />
}

// Color palette for custom stances (cycles through these)
const customStanceStyles = [
    'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100',
    'border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
    'border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100',
]

const getStanceStyle = (stance: string, index?: number) => {
    if (stance === 'pro') return 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
    if (stance === 'con') return 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
    if (stance === 'neutral') return 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
    // Custom stances - use index to get different colors
    if (index !== undefined) {
        return customStanceStyles[index % customStanceStyles.length]
    }
    return customStanceStyles[0]
}

export default function StudentDiscussionPage() {
    const t = useTranslations('Student.Dashboard.DiscussionDetail')
    const locale = useLocale()
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

    // Reset stance selection state when modal closes
    useEffect(() => {
        if (!showStanceSelector) {
            setIsConfirmingStance(false)
        }
    }, [showStanceSelector])

    const handleStanceClick = async (stance: string) => {
        if (!participant || !discussion || isConfirmingStance) return

        setIsConfirmingStance(true)
        try {
            const { error } = await supabase
                .from('discussion_participants')
                .update({
                    stance: stance,
                    stance_statement: null
                })
                .eq('id', participant.id)

            if (error) {
                console.error('Error selecting stance:', error)
                toast.error(t('toasts.stanceError'))
                return
            }

            // Optimistically update participant data to prevent modal from reopening
            queryClient.setQueryData(['discussion-participants', discussionId], (old: any[] = []) => {
                return old.map(p =>
                    p.id === participant.id
                        ? { ...p, stance: stance, stanceStatement: null }
                        : p
                )
            })

            // Close modal on success
            setShowStanceSelector(false)

            const stanceLabel = discussion?.settings?.stanceLabels?.[stance] || stance
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
                    stream: true,
                    locale
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
    }, [discussionId, locale, message, participant, queryClient, sending, t])

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
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply hidden md:block" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply hidden md:block" />
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

    // Use instructor's custom labels from settings, fall back to translated defaults
    const defaultStanceLabels: Record<string, string> = {
        pro: t('stanceLabels.pro'),
        con: t('stanceLabels.con'),
        neutral: t('stanceLabels.neutral')
    }
    const stanceLabels: Record<string, string> = {
        ...defaultStanceLabels,
        ...(discussion.settings?.stanceLabels || {})
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply hidden md:block" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply hidden md:block" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
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

                    <div className="flex items-center gap-2 sm:gap-3">
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
                                className="hidden sm:flex h-11 px-4 rounded-full bg-zinc-100 text-zinc-600 font-bold text-sm items-center gap-2 transition-all hover:bg-zinc-200 active:scale-95 border border-zinc-200"
                                title={t('header.finish')}
                            >
                                <CheckCircle className="w-4 h-4" />
                                {t('header.finish')}
                            </Link>
                        )}
                        <button
                            onClick={requestHelp}
                            className={`h-11 px-3 sm:px-4 rounded-full border transition-all active:scale-95 flex items-center gap-2 ${participant?.needsHelp
                                ? 'border-red-500 bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                                : 'border-red-200 text-red-600 hover:bg-red-50 shadow-sm hover:shadow-md'
                                }`}
                            title={participant?.needsHelp ? t('header.cancelHelp') : t('header.help')}
                        >
                            <HelpCircle className={`w-4 h-4 ${participant?.needsHelp ? 'animate-bounce' : ''}`} />
                            <span className="text-sm font-bold hidden sm:inline">
                                {participant?.needsHelp ? t('header.requesting') : t('header.help')}
                            </span>
                        </button>
                        <ProfileMenuAuto />
                    </div>
                </div>
            </header>

            {/* Stance Bar */}
            <div className="bg-zinc-50 border-b border-zinc-200 backdrop-blur-sm relative z-40">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <span className="text-xs sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stance.yourStance')}</span>
                        {participant?.stance ? (
                            <button
                                onClick={() => setShowStanceSelector(true)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border font-bold text-sm transition-all hover:translate-y-[-2px] hover:shadow-lg active:scale-95 ${getStanceStyle(participant.stance, discussion.settings.stanceOptions?.indexOf(participant.stance))}`}
                            >
                                <span className="opacity-70">{getStanceIcon(participant.stance, discussion.settings.stanceOptions?.indexOf(participant.stance))}</span>
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
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-xs sm:text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('stance.submitted')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth relative z-10 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-10">
                    <div className="text-center py-12 px-6">
                        <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <MessageSquare className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-900 mb-3">{t('intro.title', { name: aiName })}</h3>
                        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
                            {t('intro.description', { name: aiName })}
                        </p>
                        {discussion.settings?.maxTurns && discussion.settings?.duration !== null && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs sm:text-[10px] font-extrabold text-primary uppercase tracking-widest mt-8">
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
                            <div className={`max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 transition-all ${msg.role === 'user'
                                ? 'bg-primary text-white shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] rounded-tr-none'
                                : msg.role === 'instructor'
                                    ? 'glass-panel bg-amber-50 border-amber-200 text-zinc-900 rounded-tl-none shadow-sm'
                                    : 'glass-panel bg-zinc-50 border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm backdrop-blur-xl'
                                }`}>
                                <div className={`flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 ${msg.role === 'user' ? 'opacity-60' : 'text-zinc-500'}`}>
                                    <span className="text-xs sm:text-[10px] font-extrabold uppercase tracking-widest">
                                        {msg.role === 'user' ? t('chat.roles.user') :
                                            msg.role === 'instructor' ? t('chat.roles.instructor') : aiName}
                                    </span>
                                    <span className="text-[10px] sm:text-[9px] font-bold">
                                        {new Date(msg.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`whitespace-pre-wrap leading-relaxed text-[15px] sm:text-[16px] font-medium ${msg.role === 'user' ? 'selection:bg-white/20' : ''}`}>
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
                                <div className="max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 glass-panel bg-zinc-50 border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm backdrop-blur-xl">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 text-zinc-500">
                                        <span className="text-xs sm:text-[10px] font-extrabold uppercase tracking-widest">{aiName}</span>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-[15px] sm:text-[16px] font-medium">
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
            <footer className="border-t border-zinc-200 bg-white/80 backdrop-blur-xl p-4 sm:p-6 sticky bottom-0 z-50">
                <div className="max-w-3xl mx-auto">
                    {participant?.isSubmitted ? (
                        <div className="flex items-center justify-center gap-3 py-4 text-zinc-500">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <p className="font-bold">{t('chat.submitted')}</p>
                        </div>
                    ) : (
                        <div className="flex gap-3 sm:gap-4">
                            <div className="relative flex-1 group">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={sending ? t('input.thinking', { name: aiName }) : t('input.placeholder')}
                                    className="w-full ios-input resize-none h-[56px] sm:h-[64px] py-4 sm:py-4.5 pl-4 sm:pl-6 pr-4 sm:pr-6 leading-relaxed focus:border-primary/30 transition-all font-medium scrollbar-hide text-zinc-900 text-[15px] sm:text-base"
                                    disabled={sending}
                                />
                            </div>
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!message.trim() || sending}
                                className="group relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] shadow-xl shrink-0"
                            >
                                {sending ? (
                                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </footer>

            {/* Stance Selector Modal */}
            <AnimatePresence>
                {showStanceSelector && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
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
                            className="glass-panel bg-white/95 border-zinc-200 max-w-xl w-full p-5 sm:p-8 md:p-10 shadow-2xl relative z-10 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Discussion Topic */}
                            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-2xl sm:rounded-[2rem] border border-zinc-200">
                                <div className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                                    {t('StanceModal.topic')}
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 mb-2">{discussion.title}</h3>
                                {discussion.description && (
                                    <p className="text-sm text-zinc-600 leading-relaxed">{discussion.description}</p>
                                )}
                            </div>

                            <div className="mb-6 sm:mb-8 text-center">
                                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-2">{t('StanceModal.title')}</h2>
                                <p className="text-zinc-500 font-medium leading-relaxed whitespace-pre-line text-sm">
                                    {t('StanceModal.description', { name: aiName })}
                                </p>
                            </div>

                            <div className="grid gap-3 sm:gap-4">
                                {(discussion.settings.stanceOptions || ['pro', 'con', 'neutral']).map((option, index) => {
                                    // Get description for standard stances, empty for custom
                                    const getStanceDescription = (stance: string) => {
                                        if (stance === 'pro') return t('StanceModal.options.pro')
                                        if (stance === 'con') return t('StanceModal.options.con')
                                        if (stance === 'neutral') return t('StanceModal.options.neutral')
                                        return '' // Custom stances don't have predefined descriptions
                                    }
                                    const description = getStanceDescription(option)

                                    return (
                                        <button
                                            key={option}
                                            onClick={() => handleStanceClick(option)}
                                            disabled={isConfirmingStance}
                                            className={`group flex items-center gap-4 sm:gap-6 p-4 sm:p-6 border rounded-2xl sm:rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${getStanceStyle(option, index)}`}
                                        >
                                            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-200 transition-colors group-hover:bg-zinc-200 shrink-0">
                                                <span className="text-xl sm:text-2xl">{getStanceIcon(option, index)}</span>
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <div className="text-base sm:text-lg font-bold mb-1">
                                                    {stanceLabels[option] || option}
                                                </div>
                                                {description && (
                                                    <div className="text-sm opacity-60 font-medium line-clamp-2">
                                                        {description}
                                                    </div>
                                                )}
                                            </div>
                                            {isConfirmingStance ? (
                                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 animate-spin" />
                                            ) : (
                                                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 hidden sm:block" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
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
    const t = useTranslations('Student.Dashboard.DiscussionDetail')
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
                    <div className="text-xs sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest pl-8">
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
