'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, MessageSquare, Play, Pause, Clock,
    Copy, ArrowLeft, Settings, BarChart3,
    AlertCircle, CheckCircle, User, Quote, X, Loader2, Link2, Info
} from 'lucide-react'
import { SettingsDialog } from '@/components/instructor/SettingsDialog'
import { DiscussionOnboardingOverlay } from '@/components/instructor/DiscussionOnboardingOverlay'
import { ProfileMenuAuto } from '@/components/profile/ProfileMenuAuto'
import { useTranslations, useFormatter } from 'next-intl'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Discussion {
    id: string
    title: string
    description: string | null
    status: 'draft' | 'active' | 'closed'
    join_code: string
    settings: {
        anonymous: boolean
        stanceOptions: string[]
        aiMode: string
        maxTurns?: number | null
        duration?: number | null
    }
    created_at: string
}

interface Participant {
    id: string
    display_name: string | null
    stance: string | null
    stance_statement: string | null
    final_reflection: string | null
    is_online: boolean
    is_submitted: boolean
    needs_help: boolean
    requested_extension: boolean
    extension_requested_at: string | null
    last_active_at: string
    student_id: string
}

interface Message {
    id: string
    role: 'user' | 'ai' | 'instructor' | 'system'
    content: string
    created_at: string
    participant?: {
        display_name: string | null
    }
}

interface PinnedQuote {
    id: string
    content: string
    context: string | null
    pinned_at: string
    participant: {
        display_name: string | null
        stance: string | null
    } | null
}

// Colors applied based on position in stanceOptions array (first=green, second=red, rest=gray)
const stanceColorsByIndex = [
    'border-emerald-200 bg-emerald-50 text-emerald-600', // First option (e.g., 찬성/Pro)
    'border-rose-200 bg-rose-50 text-rose-600',          // Second option (e.g., 반대/Con)
    'border-zinc-200 bg-zinc-50 text-zinc-600'           // Third+ options (e.g., 중립/Neutral)
]

const dotColorsByIndex = [
    'bg-emerald-500', // First option
    'bg-rose-500',    // Second option
    'bg-zinc-400'     // Third+ options
]

export default function InstructorDiscussionPage() {
    const t = useTranslations('Instructor.DiscussionDetail')
    const tNew = useTranslations('Instructor.NewDiscussion')
    const format = useFormatter()
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string

    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [pinnedQuotes, setPinnedQuotes] = useState<PinnedQuote[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
    const [showSettings, setShowSettings] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [generatingReport, setGeneratingReport] = useState(false)
    const [pinningQuote, setPinningQuote] = useState(false)
    const [sendingInstruction, setSendingInstruction] = useState(false)
    const [mobileTab, setMobileTab] = useState<'chat' | 'participants' | 'info'>('chat')

    const fetchDiscussion = useCallback(async () => {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', discussionId)
            .single()

        if (error) {
            toast.error(t('toasts.loadError'))
            router.push('/instructor')
            return
        }

        setDiscussion(data)
    }, [discussionId, router, t])

    const fetchParticipants = useCallback(async () => {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('discussion_participants')
            .select('*')
            .eq('session_id', discussionId)
            .order('created_at', { ascending: true })

        if (!error && data) {
            setParticipants(data)
        }
    }, [discussionId])

    const fetchMessages = useCallback(async (participantId?: string) => {
        const supabase = getSupabaseClient()

        let query = supabase
            .from('discussion_messages')
            .select(`
        id,
        role,
        content,
        created_at,
        participant:discussion_participants(display_name)
      `)
            .eq('session_id', discussionId)
            .order('created_at', { ascending: true })
            .limit(100)

        if (participantId) {
            query = query.eq('participant_id', participantId)
        }

        const { data, error } = await query

        if (!error && data) {
            setMessages(data.map(m => ({
                ...m,
                participant: m.participant?.[0] || m.participant
            })))
        }
    }, [discussionId])

    const fetchPins = useCallback(async () => {
        try {
            const response = await fetch(`/api/discussions/${discussionId}/pins`)
            if (response.ok) {
                const { pins } = await response.json()
                setPinnedQuotes(pins || [])
            }
        } catch (error) {
            console.error('Error fetching pins:', error)
        }
    }, [discussionId])

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await fetchDiscussion()
            await fetchParticipants()
            await fetchMessages()
            await fetchPins()
            setLoading(false)
        }
        loadData()
    }, [fetchDiscussion, fetchParticipants, fetchMessages, fetchPins])

    // Real-time subscriptions
    useEffect(() => {
        const supabase = getSupabaseClient()

        // Use unique channel names per session to avoid conflicts
        const participantsChannel = supabase
            .channel(`instructor-participants-${discussionId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'discussion_participants',
                filter: `session_id=eq.${discussionId}`
            }, (payload) => {
                console.log('[Realtime] Participant change:', payload.eventType)
                fetchParticipants()
            })
            .subscribe((status) => {
                console.log('[Realtime] Participants channel status:', status)
            })

        const messagesChannel = supabase
            .channel(`instructor-messages-${discussionId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'discussion_messages',
                filter: `session_id=eq.${discussionId}`
            }, (payload) => {
                console.log('[Realtime] New message:', payload.new)
                fetchMessages(selectedParticipant || undefined)
            })
            .subscribe((status) => {
                console.log('[Realtime] Messages channel status:', status)
            })

        // Also subscribe to session changes (status updates)
        const sessionChannel = supabase
            .channel(`instructor-session-${discussionId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'discussion_sessions',
                filter: `id=eq.${discussionId}`
            }, (payload) => {
                console.log('[Realtime] Session update:', payload.new)
                fetchDiscussion()
            })
            .subscribe((status) => {
                console.log('[Realtime] Session channel status:', status)
            })

        return () => {
            supabase.removeChannel(participantsChannel)
            supabase.removeChannel(messagesChannel)
            supabase.removeChannel(sessionChannel)
        }
    }, [discussionId, fetchParticipants, fetchMessages, fetchDiscussion, selectedParticipant])

    // Polling fallback for when realtime connection fails
    useEffect(() => {
        // Poll every 10 seconds as a fallback
        const pollInterval = setInterval(() => {
            fetchParticipants()
            fetchMessages(selectedParticipant || undefined)
        }, 10000)

        return () => clearInterval(pollInterval)
    }, [fetchParticipants, fetchMessages, selectedParticipant])

    const toggleDiscussionStatus = async () => {
        if (!discussion) return

        const newStatus = discussion.status === 'active' ? 'closed' : 'active'
        const supabase = getSupabaseClient()

        const updateData: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'closed') {
            updateData.closed_at = new Date().toISOString()
        }

        const { error } = await supabase
            .from('discussion_sessions')
            .update(updateData)
            .eq('id', discussionId)

        if (error) {
            toast.error(t('toasts.statusChangeFail'))
        } else {
            setDiscussion({ ...discussion, status: newStatus })
            toast.success(newStatus === 'active' ? t('toasts.started') : t('toasts.ended'))

            if (newStatus === 'active') {
                setShowOnboarding(true)
            }
        }
    }

    const copyJoinCode = () => {
        if (discussion) {
            navigator.clipboard.writeText(discussion.join_code)
            toast.success(t('toasts.codeCopied'))
        }
    }

    const copyJoinUrl = () => {
        if (discussion) {
            const url = `${window.location.origin}/join/${discussion.join_code}`
            navigator.clipboard.writeText(url)
            toast.success(t('toasts.urlCopied'))
        }
    }

    const generateReport = async () => {
        setGeneratingReport(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/report`)
            if (!response.ok) throw new Error(t('toasts.reportFail'))

            const { report } = await response.json()

            // Format report as text and copy to clipboard
            const reportText = formatReportText(report)
            await navigator.clipboard.writeText(reportText)

            toast.success(t('toasts.reportCopied'), {
                description: 'Ctrl+V'
            })
        } catch (error) {
            console.error('Error generating report:', error)
            toast.error(t('toasts.reportFail'))
        } finally {
            setGeneratingReport(false)
        }
    }

    const formatReportText = (report: {
        discussion: { title: string; description?: string; status: string; createdAt: string };
        statistics: {
            totalParticipants: number;
            submittedCount: number;
            submissionRate: string;
            stanceDistribution: Record<string, number>;
            totalMessages: number;
            avgMessagesPerParticipant: string;
        };
        aiSummary?: string;
        generatedAt: string;
    }) => {
        const stanceDistStr = Object.entries(report.statistics.stanceDistribution)
            .map(([k, v]) => `${t(`participants.stance.${k}`, { default: k })}: ${v}${t('stats.countUnit')}`)
            .join(', ')

        return `${t('report.title', { title: report.discussion.title })}
========================================

${t('report.generatedDate', { date: format.dateTime(new Date(report.generatedAt), { dateStyle: 'medium' }) })}
${t('report.status', { status: t(`status.${report.discussion.status}`) })}

${t('report.statsTitle')}
${t('report.totalParticipants', { count: report.statistics.totalParticipants })}
${t('report.submitted', { count: report.statistics.submittedCount, rate: report.statistics.submissionRate })}
${t('report.stanceDist', { dist: stanceDistStr || 'N/A' })}
${t('report.totalMessages', { count: report.statistics.totalMessages })}
${t('report.avgMessages', { count: report.statistics.avgMessagesPerParticipant })}

${report.aiSummary ? `${t('report.aiSummary')}
${report.aiSummary}` : ''}

========================================
${t('report.footer')}`
    }

    const pinQuote = async (messageContent: string, participantId: string) => {
        if (!selectedParticipant) return
        setPinningQuote(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/pins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId,
                    quote: messageContent,
                    context: discussion?.title
                })
            })

            if (!response.ok) throw new Error('Failed to pin')

            await fetchPins()
            toast.success(t('toasts.pinSuccess'))
        } catch (error) {
            console.error('Error pinning quote:', error)
            toast.error(t('toasts.pinFail'))
        } finally {
            setPinningQuote(false)
        }
    }

    const unpinQuote = async (pinId: string) => {
        try {
            const response = await fetch(`/api/discussions/${discussionId}/pins?pinId=${pinId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to unpin')

            await fetchPins()
            toast.success(t('toasts.unpinSuccess'))
        } catch (error) {
            console.error('Error unpinning quote:', error)
            toast.error(t('toasts.unpinFail'))
        }
    }

    const sendInstruction = async (participantId: string) => {
        const content = window.prompt(t('prompts.instruction'))
        if (!content || !content.trim()) return

        setSendingInstruction(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId,
                    content,
                    role: 'instructor'
                })
            })

            if (!response.ok) throw new Error('Failed to send')

            toast.success(t('toasts.instructionSent'))
            fetchMessages(selectedParticipant || undefined)
        } catch (error) {
            console.error('Error sending instruction:', error)
            toast.error(t('toasts.instructionFail'))
        } finally {
            setSendingInstruction(false)
        }
    }

    const sendWarning = async (participantId: string) => {
        setSendingInstruction(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId,
                    content: t('prompts.warningContent'),
                    role: 'system'
                })
            })

            if (!response.ok) throw new Error('Failed to send')

            toast.success(t('toasts.warningSent'))
            fetchMessages(selectedParticipant || undefined)
        } catch (error) {
            console.error('Error sending warning:', error)
            toast.error(t('toasts.warningFail'))
        } finally {
            setSendingInstruction(false)
        }
    }

    // Get stance index from stanceOptions array
    const getStanceIndex = (stance: string | null) => {
        if (!stance || !discussion?.settings?.stanceOptions) return -1
        return discussion.settings.stanceOptions.indexOf(stance)
    }

    // Get color class for stance based on its position in stanceOptions
    const getStanceColorClass = (stance: string | null) => {
        const index = getStanceIndex(stance)
        if (index === -1) return stanceColorsByIndex[2] // Default to gray
        return stanceColorsByIndex[Math.min(index, 2)]
    }

    // Get dot color class for stance based on its position in stanceOptions
    const getStanceDotColor = (stance: string | null) => {
        const index = getStanceIndex(stance)
        if (index === -1) return dotColorsByIndex[2] // Default to gray
        return dotColorsByIndex[Math.min(index, 2)]
    }

    // Display stance label directly (it's already the display value from stanceOptions)
    const getStanceLabel = (stance: string | null) => {
        return stance || t('participants.stance.undefined')
    }

    if (loading) {
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

    if (!discussion) return null

    // Stats calculations
    const onlineCount = participants.filter(p => p.is_online).length
    const submittedCount = participants.filter(p => p.is_submitted).length
    const needsHelpCount = participants.filter(p => p.needs_help).length
    const extensionCount = participants.filter(p => p.requested_extension).length
    const stanceCounts = participants.reduce((acc, p) => {
        if (p.stance) acc[p.stance] = (acc[p.stance] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="min-h-screen bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden flex flex-col">
            {/* Bioluminescent background blobs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200 py-5 flex items-center">
                <div className="max-w-[1920px] w-full mx-auto px-10 flex items-center justify-between">
                    <div className="flex items-center gap-5 min-w-0 flex-1">
                        <button
                            onClick={() => router.push('/instructor')}
                            className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all active:scale-90 shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="h-10 w-px bg-zinc-200 shrink-0" />

                        <div className="space-y-2 min-w-0 overflow-hidden">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2 group cursor-default">
                                            <span className="line-clamp-2 sm:truncate text-left">
                                                {discussion.title}
                                            </span>
                                            <Info className="w-4 h-4 text-zinc-300 group-hover:text-primary shrink-0" />
                                        </h1>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-sm">
                                        {discussion.title}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <div className="flex items-center gap-2.5">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${discussion.status === 'active' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                                    discussion.status === 'closed' ? 'bg-zinc-100 text-zinc-500 border border-zinc-200' : 'bg-amber-100 text-amber-600 border border-amber-200'
                                    }`}>
                                    {t(`status.${discussion.status}`)}
                                </span>
                                <button
                                    onClick={copyJoinCode}
                                    className="px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-all flex items-center gap-2"
                                >
                                    <Copy className="w-3.5 h-3.5 opacity-50" />
                                    <span className="font-mono tracking-wider">{discussion.join_code}</span>
                                </button>
                                <button
                                    onClick={copyJoinUrl}
                                    className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center gap-2"
                                    title={t('actions.copyUrl')}
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    URL
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-nowrap shrink-0">
                        <button
                            onClick={toggleDiscussionStatus}
                            className={`h-11 px-5 rounded-full font-bold text-sm flex items-center gap-2.5 transition-all active:scale-95 shadow-lg ${discussion.status === 'active'
                                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                                }`}
                        >
                            {discussion.status === 'active' ? (
                                <>
                                    <Pause className="w-4 h-4 fill-current" />
                                    {t('actions.end')}
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    {t('actions.start')}
                                </>
                            )}
                        </button>
                        <button
                            onClick={generateReport}
                            disabled={generatingReport}
                            className="h-11 px-5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center gap-2.5 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 shadow-xl disabled:opacity-50"
                        >
                            {generatingReport ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('actions.generating')}
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="w-4 h-4" />
                                    {t('actions.report')}
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-11 h-11 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-all active:scale-90"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <ProfileMenuAuto />
                    </div>
                </div>
            </header>

            {/* Draft Status Banner */}
            {discussion.status === 'draft' && (
                <div className="w-full bg-amber-50 border-b border-amber-200 px-10 py-4 flex items-center justify-center gap-2 relative z-40 animate-in slide-in-from-top-2 fade-in duration-300">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-amber-800 font-medium text-sm">
                        {t.rich('draftBanner.text', {
                            strongClass: (chunks) => <span className="font-bold text-amber-900">{chunks}</span>,
                            startBtn: (chunks) => (
                                <span className="font-bold mx-1.5 inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-0.5 rounded-md text-xs shadow-sm">
                                    <Play className="w-3 h-3 fill-current" /> {chunks}
                                </span>
                            )
                        })}
                    </p>
                </div>
            )}

            {/* Stats Bar */}
            <div className="bg-zinc-50 border-b border-zinc-200 backdrop-blur-sm relative z-40">
                <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.participants')}</p>
                            <p className="font-bold flex items-center gap-2 text-zinc-900 text-sm sm:text-base">
                                {participants.length} <span className="text-xs text-emerald-500">({onlineCount} {t('stats.online')})</span>
                            </p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-zinc-200 hidden sm:block" />

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.submissions')}</p>
                            <p className="font-bold mb-0 leading-tight text-zinc-900 text-sm sm:text-base">
                                {submittedCount} <span className="text-xs text-zinc-500 font-medium">/ {participants.length}</span>
                            </p>
                        </div>
                    </div>

                    {needsHelpCount > 0 && (
                        <>
                            <div className="h-8 w-px bg-zinc-200 hidden sm:block" />
                            <div className="flex items-center gap-3 sm:gap-4 animate-pulse">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">{t('stats.helpRequests')}</p>
                                    <p className="font-bold text-amber-500">{needsHelpCount}{t('stats.countUnit')}</p>
                                </div>
                            </div>
                        </>
                    )}

                    {extensionCount > 0 && (
                        <>
                            <div className="h-8 w-px bg-zinc-200 hidden sm:block" />
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500">
                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-[10px] font-extrabold text-orange-600 uppercase tracking-widest">{t('stats.extensionRequests')}</p>
                                    <p className="font-bold text-orange-500">{extensionCount}{t('stats.countUnit')}</p>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="hidden lg:flex ml-auto items-center gap-2.5">
                        {Object.entries(stanceCounts).map(([stance, count]) => (
                            <div key={stance} className={`px-4 py-2 rounded-2xl border font-bold text-xs flex items-center gap-2 transition-all hover:bg-zinc-100 ${getStanceColorClass(stance)}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${getStanceDotColor(stance)}`} />
                                {stance}: {count}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="lg:hidden bg-white border-b border-zinc-200 sticky top-[68px] z-30">
                <div className="flex">
                    <button
                        onClick={() => setMobileTab('chat')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'chat' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-zinc-500'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        {t('chat.allTitle')}
                    </button>
                    <button
                        onClick={() => setMobileTab('participants')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'participants' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-zinc-500'}`}
                    >
                        <Users className="w-4 h-4" />
                        {t('participants.title')}
                        {participants.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-zinc-100 rounded text-xs">{participants.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setMobileTab('info')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'info' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-zinc-500'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        {t('sessionInfo.title')}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 relative z-10 overflow-hidden">
                {/* Participants List */}
                <div className={`lg:col-span-3 h-full flex flex-col min-h-0 ${mobileTab !== 'participants' ? 'hidden lg:flex' : ''}`}>
                    <div className="mb-4 sm:mb-6 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">{t('participants.title')}</h2>
                        <div className="px-2 py-0.5 bg-zinc-100 rounded-md text-[10px] font-bold text-zinc-500">{t('participants.count', { count: participants.length })}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {participants.map((participant, index) => (
                                <motion.button
                                    key={participant.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    onClick={() => {
                                        setSelectedParticipant(
                                            selectedParticipant === participant.id ? null : participant.id
                                        )
                                        fetchMessages(selectedParticipant === participant.id ? undefined : participant.id)
                                    }}
                                    className={`w-full p-4 rounded-[1.5rem] border transition-all relative group overflow-hidden ${selectedParticipant === participant.id
                                        ? 'bg-primary text-white border-primary shadow-[0_10px_30px_rgba(var(--primary-rgb),0.35)]'
                                        : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-900 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedParticipant === participant.id ? 'bg-white/20' : 'bg-zinc-100'}`}>
                                                    {(participant.display_name || '').charAt(0) || index + 1}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${participant.is_online ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-sm leading-tight">
                                                    {participant.display_name || `Student ${index + 1}`}
                                                </div>
                                                <div className={`text-[10px] font-medium mt-0.5 uppercase tracking-widest ${selectedParticipant === participant.id ? 'opacity-60' : 'text-zinc-500'}`}>
                                                    {participant.is_online ? t('participants.online') : t('participants.offline')}
                                                </div>
                                            </div>
                                        </div>
                                        {participant.needs_help && (
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 animate-pulse">
                                                <AlertCircle className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2">
                                            {participant.stance ? (
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border transition-colors ${selectedParticipant === participant.id
                                                    ? 'bg-white/20 border-white/20 text-white'
                                                    : getStanceColorClass(participant.stance)
                                                    }`}>
                                                    {participant.stance}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('participants.stance.undefined')}</span>
                                            )}
                                        </div>
                                        {participant.is_submitted && (
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedParticipant === participant.id ? 'bg-white/20' : 'bg-emerald-100 text-emerald-500'}`}>
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected highlight effect */}
                                    {selectedParticipant === participant.id && (
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl translate-x-16 -translate-y-16 pointer-events-none" />
                                    )}
                                </motion.button>
                            ))}
                        </AnimatePresence>

                        {participants.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center glass-panel border-zinc-200 bg-zinc-50">
                                <Users className="w-12 h-12 text-zinc-300 mb-4" />
                                <p className="text-zinc-500 font-bold">{t('participants.empty')}</p>
                                <p className="text-zinc-400 text-xs mt-2 font-medium">{t('participants.emptyDesc')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat/Messages Area */}
                <div className={`lg:col-span-6 h-full flex flex-col glass-panel bg-white/90 border-zinc-200 shadow-sm overflow-hidden relative backdrop-blur-xl ${mobileTab !== 'chat' ? 'hidden lg:flex' : ''}`}>
                    <div className="p-4 sm:p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                                    {selectedParticipant
                                        ? t('chat.individualTitle', { name: participants.find(p => p.id === selectedParticipant)?.display_name || 'Student' })
                                        : t('chat.allTitle')}
                                </h2>
                                <p className="text-xs text-zinc-500 font-medium">
                                    {selectedParticipant ? t('chat.individualDesc') : t('chat.allDesc')}
                                </p>
                            </div>
                        </div>
                        {selectedParticipant && (
                            <button
                                onClick={() => {
                                    setSelectedParticipant(null)
                                    fetchMessages()
                                }}
                                className="px-4 py-2 rounded-xl bg-zinc-100 text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-all flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                {t('chat.viewAll')}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
                                    <MessageSquare className="w-10 h-10 text-zinc-300" />
                                </div>
                                <p className="text-zinc-500 text-lg font-bold">{t('chat.empty')}</p>
                                <p className="text-zinc-400 text-sm mt-2 max-w-xs mx-auto">{t('chat.emptyDesc')}</p>
                            </div>
                        ) : (
                            messages.map((message, idx) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.05, 1) }}
                                    className={`flex items-start gap-4 ${message.role === 'ai' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-xs ${message.role === 'user' ? 'bg-primary/10 text-primary border border-primary/20' :
                                        message.role === 'ai' ? 'bg-purple-100 text-purple-600 border border-purple-200' :
                                            message.role === 'instructor' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                                        }`}>
                                        {message.role === 'user' ? (message.participant?.display_name || t('chat.roles.user'))[0] :
                                            message.role === 'ai' ? 'AI' :
                                                message.role === 'instructor' ? 'P' : 'S'}
                                    </div>
                                    <div className={`flex-1 max-w-[85%] ${message.role === 'ai' ? 'text-right' : ''}`}>
                                        <div className={`flex items-center gap-3 mb-2 px-1 ${message.role === 'ai' ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                {message.role === 'user'
                                                    ? message.participant?.display_name || t('chat.roles.user')
                                                    : message.role === 'ai'
                                                        ? t('chat.roles.ai')
                                                        : message.role === 'instructor'
                                                            ? t('chat.roles.instructor')
                                                            : t('chat.roles.system')}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400">
                                                <Clock className="w-3 h-3" />
                                                {format.dateTime(new Date(message.created_at), { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className={`p-5 rounded-[1.75rem] border transition-all group relative ${message.role === 'ai'
                                            ? 'bg-zinc-50 border-zinc-200 text-zinc-700 rounded-tr-none'
                                            : message.role === 'instructor'
                                                ? 'bg-amber-50 border-amber-200 text-zinc-900 rounded-tl-none shadow-sm'
                                                : 'bg-primary/10 border-primary/20 text-zinc-900 rounded-tl-none shadow-sm'
                                            }`}>
                                            <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{message.content}</p>

                                            {message.role === 'user' && selectedParticipant && (
                                                <button
                                                    onClick={() => pinQuote(message.content, selectedParticipant)}
                                                    disabled={pinningQuote}
                                                    className="absolute -right-3 top-2 w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl scale-0 group-hover:scale-100 transition-all flex items-center justify-center hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-90"
                                                    title={t('actions.pin')}
                                                >
                                                    <Quote className="w-4 h-4 fill-current" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side - Info & Actions */}
                <div className={`lg:col-span-3 h-full flex flex-col gap-4 sm:gap-6 overflow-hidden ${mobileTab !== 'info' ? 'hidden lg:flex' : ''}`}>
                    {selectedParticipant ? (
                        <>
                            {/* Participant Detail Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-panel border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl"
                            >
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                                        {(participants.find(p => p.id === selectedParticipant)?.display_name || 'H')[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold tracking-tight text-zinc-900">{participants.find(p => p.id === selectedParticipant)?.display_name || t('participants.details.title')}</h3>
                                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">{t('participants.details.selected')}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">{t('participants.details.currentStance')}</span>
                                        {(() => {
                                            const p = participants.find(p => p.id === selectedParticipant)
                                            if (!p) return null
                                            return (
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-sm ${getStanceColorClass(p.stance)}`}>
                                                    <div className={`w-2 h-2 rounded-full ${getStanceDotColor(p.stance)}`} />
                                                    {p.stance || t('participants.details.noSelection')}
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {participants.find(p => p.id === selectedParticipant)?.stance_statement && (
                                        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">{t('participants.details.stanceStatement')}</span>
                                            <p className="text-sm font-medium leading-relaxed text-zinc-600 italic">
                                                &quot;{participants.find(p => p.id === selectedParticipant)?.stance_statement}&quot;
                                            </p>
                                        </div>
                                    )}

                                    {participants.find(p => p.id === selectedParticipant)?.final_reflection && (
                                        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
                                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-2">{t('participants.details.finalReflection')}</span>
                                            <p className="text-sm font-medium leading-relaxed text-purple-700 italic">
                                                &quot;{participants.find(p => p.id === selectedParticipant)?.final_reflection}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Participant Actions */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => selectedParticipant && sendInstruction(selectedParticipant)}
                                    disabled={sendingInstruction}
                                    className="h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 shadow-xl disabled:opacity-50"
                                >
                                    {sendingInstruction ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                                    {t('actions.sendInstruction')}
                                </button>
                                <button
                                    onClick={() => selectedParticipant && sendWarning(selectedParticipant)}
                                    disabled={sendingInstruction}
                                    className="h-14 w-full rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold flex items-center justify-center gap-3 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                    {t('actions.sendWarning')}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Session Overview Card */
                        <div className="glass-panel border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                                    <BarChart3 className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-zinc-900">{t('sessionInfo.title')}</h3>
                                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">{t('sessionInfo.subtitle')}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 max-h-72 overflow-y-auto custom-scrollbar">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-3">{t('sessionInfo.topic')}</span>
                                    <p className="text-[15px] font-medium leading-relaxed text-zinc-600">
                                        {discussion.description || t('sessionInfo.noDescription')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">{t('sessionInfo.aiMode')}</span>
                                        <p className="font-bold text-zinc-900 uppercase text-xs">
                                            {discussion.settings.aiMode === 'socratic' ? tNew('phases.aiTutor.modes.socratic.label') :
                                                discussion.settings.aiMode === 'debate' ? tNew('phases.aiTutor.modes.debate.label') : tNew('phases.aiTutor.modes.balanced.label')}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">{t('sessionInfo.anonymous')}</span>
                                        <p className="font-bold text-zinc-900 uppercase text-xs">
                                            {discussion.settings.anonymous ? t('sessionInfo.on') : t('sessionInfo.off')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pinned Quotes Card - Always visible but styled better */}
                    <div className="flex-1 flex flex-col min-h-0 glass-panel border-zinc-200 bg-white/90 overflow-hidden shadow-sm backdrop-blur-xl">
                        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Quote className="w-5 h-5 text-primary" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">{t('pins.title')}</h3>
                            </div>
                            {pinnedQuotes.length > 0 && (
                                <div className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                                    {pinnedQuotes.length}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {pinnedQuotes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                                    <Quote className="w-10 h-10 mb-4" />
                                    <p className="text-xs font-bold leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('pins.empty') }} />
                                </div>
                            ) : (
                                pinnedQuotes.map((pin) => (
                                    <motion.div
                                        key={pin.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 relative group shadow-sm"
                                    >
                                        <p className="text-sm font-medium leading-relaxed italic pr-6 text-zinc-600">&quot;{pin.content}&quot;</p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getStanceDotColor(pin.participant?.stance || null)}`} />
                                                <span className="text-[10px] font-bold text-zinc-500">
                                                    {pin.participant?.display_name || 'Anonymous'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => unpinQuote(pin.id)}
                                                className="w-7 h-7 rounded-full bg-rose-100 text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-500 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Dialog */}
            {/* Settings Dialog */}
            <SettingsDialog
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                discussionId={discussionId}
                currentSettings={discussion.settings}
                onSettingsUpdated={(newSettings) => {
                    setDiscussion({ ...discussion, settings: newSettings })
                }}
            />

            <AnimatePresence>
                {showOnboarding && discussion && (
                    <DiscussionOnboardingOverlay
                        joinCode={discussion.join_code}
                        title={discussion.title}
                        onClose={() => setShowOnboarding(false)}
                        count={participants.length}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
