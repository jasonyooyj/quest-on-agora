'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, MessageSquare, Play, Pause, Clock,
    Copy, ArrowLeft, Settings, BarChart3,
    AlertCircle, CheckCircle, User, Quote, X
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
    pro: 'bg-green-100 text-green-800 border-green-300',
    con: 'bg-red-100 text-red-800 border-red-300',
    neutral: 'bg-gray-100 text-gray-800 border-gray-300'
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">토론 정보를 불러오는 중...</p>
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
                <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/instructor')}
                            className="p-2 border-2 border-border hover:border-foreground transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                                {discussion.title}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`tag ${discussion.status === 'active' ? 'bg-green-600' :
                                        discussion.status === 'closed' ? 'bg-gray-600' : 'bg-yellow-600'
                                    }`}>
                                    {discussion.status === 'active' ? '진행 중' :
                                        discussion.status === 'closed' ? '종료됨' : '대기 중'}
                                </span>
                                <button
                                    onClick={copyJoinCode}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Copy className="w-3 h-3" />
                                    {discussion.join_code}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleDiscussionStatus}
                            className={`btn-brutal flex items-center gap-2 ${discussion.status === 'active'
                                    ? 'bg-red-50 hover:bg-red-100'
                                    : 'bg-green-50 hover:bg-green-100'
                                }`}
                        >
                            {discussion.status === 'active' ? (
                                <>
                                    <Pause className="w-4 h-4" />
                                    토론 종료
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    토론 시작
                                </>
                            )}
                        </button>
                        <button
                            onClick={generateReport}
                            disabled={generatingReport}
                            className="btn-brutal flex items-center gap-2"
                        >
                            {generatingReport ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="w-4 h-4" />
                                    리포트
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="btn-brutal flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="border-b-2 border-border bg-muted/30">
                <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span className="font-semibold">{participants.length}</span>
                        <span className="text-muted-foreground text-sm">참여자</span>
                        <span className="text-green-600 text-sm">({onlineCount} 온라인)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-muted-foreground" />
                        <span className="font-semibold">{submittedCount}</span>
                        <span className="text-muted-foreground text-sm">/ {participants.length} 제출 완료</span>
                    </div>

                    {needsHelpCount > 0 && (
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-semibold">{needsHelpCount}</span>
                            <span className="text-sm">도움 요청</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 ml-auto">
                        {Object.entries(stanceCounts).map(([stance, count]) => (
                            <div key={stance} className={`px-3 py-1 border rounded-sm text-sm ${stanceColors[stance] || ''}`}>
                                {stanceLabels[stance] || stance}: {count}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
                {/* Participants List */}
                <div className="col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold uppercase tracking-wider text-sm">참여자 목록</h2>
                        <span className="text-xs text-muted-foreground">{participants.length}명</span>
                    </div>

                    <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                        <AnimatePresence>
                            {participants.map((participant, index) => (
                                <motion.button
                                    key={participant.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => {
                                        setSelectedParticipant(
                                            selectedParticipant === participant.id ? null : participant.id
                                        )
                                        fetchMessages(selectedParticipant === participant.id ? undefined : participant.id)
                                    }}
                                    className={`w-full p-3 border-2 text-left transition-all ${selectedParticipant === participant.id
                                            ? 'border-foreground bg-foreground text-background'
                                            : 'border-border hover:border-foreground'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${participant.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span className="font-medium">
                                                {participant.display_name || `학생 ${index + 1}`}
                                            </span>
                                        </div>
                                        {participant.needs_help && (
                                            <AlertCircle className="w-4 h-4 text-amber-500" />
                                        )}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                        {participant.stance ? (
                                            <span className={`px-2 py-0.5 rounded-sm border ${stanceColors[participant.stance] || ''
                                                } ${selectedParticipant === participant.id ? 'border-current' : ''}`}>
                                                {stanceLabels[participant.stance] || participant.stance}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">미정</span>
                                        )}
                                        {participant.is_submitted && (
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>

                        {participants.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">아직 참여자가 없습니다</p>
                                <p className="text-xs mt-1">참여 코드를 공유하세요</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat/Messages Area */}
                <div className="col-span-6 border-2 border-foreground">
                    <div className="p-4 border-b-2 border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            <h2 className="font-semibold">
                                {selectedParticipant
                                    ? `${participants.find(p => p.id === selectedParticipant)?.display_name || '학생'} 대화`
                                    : '전체 대화'}
                            </h2>
                        </div>
                        {selectedParticipant && (
                            <button
                                onClick={() => {
                                    setSelectedParticipant(null)
                                    fetchMessages()
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                전체 보기
                            </button>
                        )}
                    </div>

                    <div className="h-[calc(100vh-420px)] overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                                <p>아직 대화가 없습니다</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'ai' ? 'flex-row-reverse' : ''
                                        }`}
                                >
                                    <div className={`flex-1 max-w-[80%] ${message.role === 'ai' ? 'ml-auto' : ''
                                        }`}>
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                                            <span>
                                                {message.role === 'user'
                                                    ? message.participant?.display_name || '학생'
                                                    : message.role === 'ai'
                                                        ? 'AI 튜터'
                                                        : message.role === 'instructor'
                                                            ? '교수'
                                                            : '시스템'}
                                            </span>
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`p-3 border-2 group relative ${message.role === 'ai'
                                                ? 'border-sage bg-sage/10'
                                                : message.role === 'instructor'
                                                    ? 'border-coral bg-coral/10'
                                                    : 'border-border'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                            {message.role === 'user' && selectedParticipant && (
                                                <button
                                                    onClick={() => pinQuote(message.content, selectedParticipant)}
                                                    disabled={pinningQuote}
                                                    className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border hover:border-foreground rounded"
                                                    title="발언 핀"
                                                >
                                                    <Quote className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions & Selected Participant Info */}
                <div className="col-span-3 space-y-4">
                    {selectedParticipant ? (
                        <>
                            {/* Participant Details */}
                            <div className="border-2 border-foreground p-4">
                                <h3 className="font-semibold uppercase tracking-wider text-sm mb-4">학생 정보</h3>
                                {(() => {
                                    const p = participants.find(p => p.id === selectedParticipant)
                                    if (!p) return null
                                    return (
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-xs text-muted-foreground">이름</span>
                                                <p className="font-medium">{p.display_name || '익명'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground">입장</span>
                                                <p className={`inline-block px-2 py-1 border mt-1 ${stanceColors[p.stance || ''] || 'border-border'}`}>
                                                    {stanceLabels[p.stance || ''] || '미정'}
                                                </p>
                                            </div>
                                            {p.stance_statement && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground">최종 의견</span>
                                                    <p className="text-sm mt-1">{p.stance_statement}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Quick Actions for Selected */}
                            <div className="border-2 border-border p-4 space-y-2">
                                <h3 className="font-semibold uppercase tracking-wider text-sm mb-3">빠른 작업</h3>
                                <button className="btn-brutal w-full flex items-center justify-center gap-2 text-sm">
                                    <Quote className="w-4 h-4" />
                                    발언 핀
                                </button>
                                <button className="btn-brutal w-full flex items-center justify-center gap-2 text-sm">
                                    <MessageSquare className="w-4 h-4" />
                                    메시지 전송
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Class Overview */
                        <div className="border-2 border-foreground p-4">
                            <h3 className="font-semibold uppercase tracking-wider text-sm mb-4">토론 개요</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-muted-foreground">설명</span>
                                    <p className="text-sm mt-1">{discussion.description || '설명 없음'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">AI 모드</span>
                                    <p className="font-medium mt-1">
                                        {discussion.settings.aiMode === 'socratic' ? '소크라테스식' :
                                            discussion.settings.aiMode === 'balanced' ? '균형 잡힌' : '최소'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">익명 모드</span>
                                    <p className="font-medium mt-1">
                                        {discussion.settings.anonymous ? '활성화' : '비활성화'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pinned Quotes */}
                    <div className="border-2 border-foreground p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Quote className="w-5 h-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">핀한 발언</span>
                            {pinnedQuotes.length > 0 && (
                                <span className="text-xs bg-foreground text-background px-1.5 py-0.5">
                                    {pinnedQuotes.length}
                                </span>
                            )}
                        </div>
                        {pinnedQuotes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                학생의 발언을 핀하여 프레젠테이션에 사용하세요
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {pinnedQuotes.map((pin) => (
                                    <div key={pin.id} className="p-2 border border-border bg-muted/30 relative group">
                                        <p className="text-xs line-clamp-2 pr-6">{pin.quote}</p>
                                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                            <span className={`px-1 ${
                                                pin.participant?.stance === 'pro' ? 'bg-green-100 text-green-700' :
                                                pin.participant?.stance === 'con' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {stanceLabels[pin.participant?.stance || ''] || '미정'}
                                            </span>
                                            <span>{pin.participant?.display_name || '익명'}</span>
                                        </div>
                                        <button
                                            onClick={() => unpinQuote(pin.id)}
                                            className="absolute top-1 right-1 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded"
                                            title="핀 해제"
                                        >
                                            <X className="w-3 h-3 text-red-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
