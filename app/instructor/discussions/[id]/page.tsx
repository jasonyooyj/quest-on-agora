'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, MessageSquare, Play, Pause, Clock,
    Copy, ArrowLeft, Settings, BarChart3,
    AlertCircle, CheckCircle, User, Quote, X, Loader2
} from 'lucide-react'
import { SettingsDialog } from '@/components/instructor/SettingsDialog'

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
    }
    created_at: string
}

interface Participant {
    id: string
    display_name: string | null
    stance: string | null
    stance_statement: string | null
    is_online: boolean
    is_submitted: boolean
    needs_help: boolean
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
    quote: string
    context: string | null
    pinned_at: string
    participant: {
        display_name: string | null
        stance: string | null
    } | null
}

const stanceLabels: Record<string, string> = {
    pro: '찬성',
    con: '반대',
    neutral: '중립'
}

const stanceColors: Record<string, string> = {
    pro: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    con: 'border-rose-200 bg-rose-50 text-rose-600',
    neutral: 'border-zinc-200 bg-zinc-50 text-zinc-600'
}

export default function InstructorDiscussionPage() {
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
    const [generatingReport, setGeneratingReport] = useState(false)
    const [pinningQuote, setPinningQuote] = useState(false)
    const [sendingInstruction, setSendingInstruction] = useState(false)

    const fetchDiscussion = useCallback(async () => {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', discussionId)
            .single()

        if (error) {
            toast.error('토론을 불러오는데 실패했습니다')
            router.push('/instructor')
            return
        }

        setDiscussion(data)
    }, [discussionId, router])

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

        const participantsChannel = supabase
            .channel('participants-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'discussion_participants',
                filter: `session_id=eq.${discussionId}`
            }, () => {
                fetchParticipants()
            })
            .subscribe()

        const messagesChannel = supabase
            .channel('messages-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'discussion_messages',
                filter: `session_id=eq.${discussionId}`
            }, () => {
                fetchMessages(selectedParticipant || undefined)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(participantsChannel)
            supabase.removeChannel(messagesChannel)
        }
    }, [discussionId, fetchParticipants, fetchMessages, selectedParticipant])

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
            toast.error('상태 변경 실패')
        } else {
            setDiscussion({ ...discussion, status: newStatus })
            toast.success(newStatus === 'active' ? '토론이 시작되었습니다!' : '토론이 종료되었습니다.')
        }
    }

    const copyJoinCode = () => {
        if (discussion) {
            navigator.clipboard.writeText(discussion.join_code)
            toast.success('참여 코드가 복사되었습니다!')
        }
    }

    const generateReport = async () => {
        setGeneratingReport(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/report`)
            if (!response.ok) throw new Error('리포트 생성 실패')

            const { report } = await response.json()

            // Format report as text and copy to clipboard
            const reportText = formatReportText(report)
            await navigator.clipboard.writeText(reportText)

            toast.success('리포트가 클립보드에 복사되었습니다!', {
                description: 'Ctrl+V로 붙여넣기 하세요'
            })
        } catch (error) {
            console.error('Error generating report:', error)
            toast.error('리포트 생성에 실패했습니다')
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
        const stanceLabelsMap: Record<string, string> = { pro: '찬성', con: '반대', neutral: '중립' }
        const stanceDistStr = Object.entries(report.statistics.stanceDistribution)
            .map(([k, v]) => `${stanceLabelsMap[k] || k}: ${v}명`)
            .join(', ')

        return `📊 토론 리포트: ${report.discussion.title}
========================================

📅 생성일: ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}
📝 상태: ${report.discussion.status === 'active' ? '진행 중' : report.discussion.status === 'closed' ? '종료' : '대기'}

📈 통계
- 총 참가자: ${report.statistics.totalParticipants}명
- 제출 완료: ${report.statistics.submittedCount}명 (${report.statistics.submissionRate}%)
- 입장 분포: ${stanceDistStr || '없음'}
- 총 메시지: ${report.statistics.totalMessages}개
- 참가자당 평균 메시지: ${report.statistics.avgMessagesPerParticipant}개

${report.aiSummary ? `🤖 AI 분석
${report.aiSummary}` : ''}

========================================
Agora 토론 플랫폼에서 생성됨`
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

            if (!response.ok) throw new Error('핀 실패')

            await fetchPins()
            toast.success('발언이 핀되었습니다!')
        } catch (error) {
            console.error('Error pinning quote:', error)
            toast.error('발언 핀에 실패했습니다')
        } finally {
            setPinningQuote(false)
        }
    }

    const unpinQuote = async (pinId: string) => {
        try {
            const response = await fetch(`/api/discussions/${discussionId}/pins?pinId=${pinId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('핀 해제 실패')

            await fetchPins()
            toast.success('핀이 해제되었습니다')
        } catch (error) {
            console.error('Error unpinning quote:', error)
            toast.error('핀 해제에 실패했습니다')
        }
    }

    const sendInstruction = async (participantId: string) => {
        const content = window.prompt('학생에게 보낼 개별 지시 내용을 입력하세요:')
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

            if (!response.ok) throw new Error('발송 실패')

            toast.success('지시가 성공적으로 전송되었습니다')
            fetchMessages(selectedParticipant || undefined)
        } catch (error) {
            console.error('Error sending instruction:', error)
            toast.error('지시 전송에 실패했습니다')
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
                    content: '⚠️ 주의: 현재 토론 태도가 불성실하거나 부적절한 언행이 감지되었습니다. 원활한 토론을 위해 협조 부탁드립니다.',
                    role: 'system'
                })
            })

            if (!response.ok) throw new Error('발송 실패')

            toast.success('경고가 전송되었습니다')
            fetchMessages(selectedParticipant || undefined)
        } catch (error) {
            console.error('Error sending warning:', error)
            toast.error('경고 전송에 실패했습니다')
        } finally {
            setSendingInstruction(false)
        }
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
                    <p className="text-zinc-500 text-lg font-bold tracking-tight animate-pulse">관리자 대시보드 로딩 중...</p>
                </div>
            </div>
        )
    }

    if (!discussion) return null

    // Stats calculations
    const onlineCount = participants.filter(p => p.is_online).length
    const submittedCount = participants.filter(p => p.is_submitted).length
    const needsHelpCount = participants.filter(p => p.needs_help).length
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
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200 h-20 flex items-center">
                <div className="max-w-[1920px] w-full mx-auto px-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/instructor')}
                            className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-700 transition-all active:scale-90"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">
                                {discussion.title}
                            </h1>
                            <div className="flex items-center gap-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${discussion.status === 'active' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                                    discussion.status === 'closed' ? 'bg-zinc-100 text-zinc-500 border border-zinc-200' : 'bg-amber-100 text-amber-600 border border-amber-200'
                                    }`}>
                                    {discussion.status === 'active' ? '토론 진행중' :
                                        discussion.status === 'closed' ? '토론 종료됨' : '토론 대기중'}
                                </span>
                                <button
                                    onClick={copyJoinCode}
                                    className="px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[xs] font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-all flex items-center gap-2"
                                >
                                    <span className="opacity-60"><Copy className="w-3 h-3" /></span>
                                    {discussion.join_code}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleDiscussionStatus}
                            className={`h-12 px-6 rounded-full font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg ${discussion.status === 'active'
                                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                                }`}
                        >
                            {discussion.status === 'active' ? (
                                <>
                                    <Pause className="w-5 h-5 fill-current" />
                                    토론 종료
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 fill-current" />
                                    토론 시작
                                </>
                            )}
                        </button>
                        <button
                            onClick={generateReport}
                            disabled={generatingReport}
                            className="h-12 px-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold flex items-center gap-3 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 shadow-xl disabled:opacity-50"
                        >
                            {generatingReport ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="w-5 h-5" />
                                    AI 리포트
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center hover:bg-zinc-200 text-zinc-700 transition-all active:scale-90"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="bg-zinc-50 border-b border-zinc-200 backdrop-blur-sm relative z-40">
                <div className="max-w-[1920px] w-full mx-auto px-8 py-5 flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">참여자</p>
                            <p className="font-bold flex items-center gap-2 text-zinc-900">
                                {participants.length} <span className="text-xs text-emerald-500">({onlineCount} 온라인)</span>
                            </p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-zinc-200" />

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">제출 현황</p>
                            <p className="font-bold mb-0 leading-tight text-zinc-900">
                                {submittedCount} <span className="text-xs text-zinc-500 font-medium">/ {participants.length}</span>
                            </p>
                        </div>
                    </div>

                    {needsHelpCount > 0 && (
                        <>
                            <div className="h-8 w-px bg-zinc-200" />
                            <div className="flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">도움 요청</p>
                                    <p className="font-bold text-amber-500">{needsHelpCount}명</p>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="ml-auto flex items-center gap-3">
                        {Object.entries(stanceCounts).map(([stance, count]) => (
                            <div key={stance} className={`px-4 py-2 rounded-2xl border font-bold text-xs flex items-center gap-2 transition-all hover:bg-zinc-100 ${stance === 'pro' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : stance === 'con' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${stance === 'pro' ? 'bg-emerald-500' :
                                    stance === 'con' ? 'bg-rose-500' : 'bg-zinc-400'
                                    }`} />
                                {stanceLabels[stance] || stance}: {count}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-[1920px] w-full mx-auto px-8 py-8 grid grid-cols-12 gap-8 relative z-10 overflow-hidden">
                {/* Participants List */}
                <div className="col-span-3 h-full flex flex-col min-h-0">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">참여자 리스트</h2>
                        <div className="px-2 py-0.5 bg-zinc-100 rounded-md text-[10px] font-bold text-zinc-500">{participants.length}명</div>
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
                                                    {participant.display_name || `학생 ${index + 1}`}
                                                </div>
                                                <div className={`text-[10px] font-medium mt-0.5 uppercase tracking-widest ${selectedParticipant === participant.id ? 'opacity-60' : 'text-zinc-500'}`}>
                                                    {participant.is_online ? '온라인' : '오프라인'}
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
                                                    : participant.stance === 'pro' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : participant.stance === 'con' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                                                    }`}>
                                                    {stanceLabels[participant.stance] || participant.stance}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">입장 미정</span>
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
                                <p className="text-zinc-500 font-bold">아직 참여자가 없습니다</p>
                                <p className="text-zinc-400 text-xs mt-2 font-medium">참여 코드를 공유하여 학생들을 초대하세요</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat/Messages Area */}
                <div className="col-span-6 h-full flex flex-col glass-panel bg-white/90 border-zinc-200 shadow-sm overflow-hidden relative backdrop-blur-xl">
                    <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                                    {selectedParticipant
                                        ? `${participants.find(p => p.id === selectedParticipant)?.display_name || '학생'} 실시간 대화`
                                        : '전체 참여자 대화 (모니터링)'}
                                </h2>
                                <p className="text-xs text-zinc-500 font-medium">
                                    {selectedParticipant ? '선택한 학생의 개별 채팅 내용을 확인합니다.' : '모든 학생과 AI의 대화 내용을 실시간으로 확인합니다.'}
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
                                전체 보기
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
                                    <MessageSquare className="w-10 h-10 text-zinc-300" />
                                </div>
                                <p className="text-zinc-500 text-lg font-bold">아직 감지된 대화가 없습니다</p>
                                <p className="text-zinc-400 text-sm mt-2 max-w-xs mx-auto">학생들이 입장을 선택하고 AI 튜터와 토론을 시작하면 이곳에 실시간으로 표시됩니다.</p>
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
                                        {message.role === 'user' ? (message.participant?.display_name || '나')[0] :
                                            message.role === 'ai' ? 'AI' :
                                                message.role === 'instructor' ? '교' : 'S'}
                                    </div>
                                    <div className={`flex-1 max-w-[85%] ${message.role === 'ai' ? 'text-right' : ''}`}>
                                        <div className={`flex items-center gap-3 mb-2 px-1 ${message.role === 'ai' ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                {message.role === 'user'
                                                    ? message.participant?.display_name || '학생'
                                                    : message.role === 'ai'
                                                        ? 'AI 튜터'
                                                        : message.role === 'instructor'
                                                            ? '교수 (나)'
                                                            : '시스템'}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400">
                                                <Clock className="w-3 h-3" />
                                                {new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
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
                                                    title="이 발언을 핀하기"
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
                <div className="col-span-3 h-full flex flex-col gap-6 overflow-hidden">
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
                                        <h3 className="text-xl font-bold tracking-tight text-zinc-900">{participants.find(p => p.id === selectedParticipant)?.display_name || '학생 정보'}</h3>
                                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">SELECTED PARTICIPANT</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">현재 선택 입장</span>
                                        {(() => {
                                            const p = participants.find(p => p.id === selectedParticipant)
                                            if (!p) return null
                                            return (
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-sm ${p.stance === 'pro' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : p.stance === 'con' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-zinc-200 bg-zinc-100 text-zinc-600'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${p.stance === 'pro' ? 'bg-emerald-500' : p.stance === 'con' ? 'bg-rose-500' : 'bg-zinc-400'}`} />
                                                    {stanceLabels[p.stance || ''] || '미선택'}
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {participants.find(p => p.id === selectedParticipant)?.stance_statement && (
                                        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">최종 입장문</span>
                                            <p className="text-sm font-medium leading-relaxed text-zinc-600 italic">
                                                "{participants.find(p => p.id === selectedParticipant)?.stance_statement}"
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
                                    개별 지시 보내기
                                </button>
                                <button
                                    onClick={() => selectedParticipant && sendWarning(selectedParticipant)}
                                    disabled={sendingInstruction}
                                    className="h-14 w-full rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold flex items-center justify-center gap-3 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                    경고/알람 발송
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
                                    <h3 className="text-xl font-bold tracking-tight text-zinc-900">세션 개요</h3>
                                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">SESSION OVERVIEW</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-3">토론 주제 및 설명</span>
                                    <p className="text-[15px] font-medium leading-relaxed text-zinc-600 line-clamp-4">
                                        {discussion.description || '설명이 작성되지 않은 토론 세션입니다.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">AI 튜터링</span>
                                        <p className="font-bold text-zinc-900 uppercase text-xs">
                                            {discussion.settings.aiMode === 'socratic' ? '소크라테스' :
                                                discussion.settings.aiMode === 'debate' ? '디베이트' : '균형잡힌'}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">참여자 익명</span>
                                        <p className="font-bold text-zinc-900 uppercase text-xs">
                                            {discussion.settings.anonymous ? 'ACTIVE' : 'OFF'}
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
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">핀한 주요 발언</h3>
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
                                    <p className="text-xs font-bold leading-relaxed">공유하고 싶은 학생의 발언을<br />실시간 채팅창에서 핀하세요.</p>
                                </div>
                            ) : (
                                pinnedQuotes.map((pin) => (
                                    <motion.div
                                        key={pin.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 relative group shadow-sm"
                                    >
                                        <p className="text-sm font-medium leading-relaxed italic pr-6 text-zinc-600">"{pin.quote}"</p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${pin.participant?.stance === 'pro' ? 'bg-emerald-500' :
                                                    pin.participant?.stance === 'con' ? 'bg-rose-500' : 'bg-zinc-400'
                                                    }`} />
                                                <span className="text-[10px] font-bold text-zinc-500">
                                                    {pin.participant?.display_name || '익명'}
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
            <SettingsDialog
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                discussionId={discussionId}
                currentSettings={discussion.settings}
                onSettingsUpdated={(newSettings) => {
                    setDiscussion({ ...discussion, settings: newSettings })
                }}
            />
        </div>
    )
}
