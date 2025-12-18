'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Heart, MessageCircle, Send, Loader2,
    ThumbsUp, ThumbsDown, Minus, Users, Clock
} from 'lucide-react'

interface Submission {
    id: string
    display_name: string | null
    stance: string | null
    stance_statement: string | null
    is_submitted: boolean
    created_at: string
    likeCount: number
    hasLiked: boolean
    commentCount: number
    comments: Comment[]
}

interface Comment {
    id: string
    user_id: string
    user_name: string | null
    content: string
    created_at: string
}

interface Discussion {
    id: string
    title: string
    settings: {
        stanceLabels?: Record<string, string>
        anonymous?: boolean
    }
    status: string
}

const getStanceIcon = (stance: string) => {
    if (stance === 'pro') return <ThumbsUp className="w-4 h-4" />
    if (stance === 'con') return <ThumbsDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
}

const getStanceStyle = (stance: string) => {
    if (stance === 'pro') return 'bg-blue-50 border-blue-200 text-blue-700'
    if (stance === 'con') return 'bg-red-50 border-red-200 text-red-700'
    return 'bg-gray-50 border-gray-200 text-gray-700'
}

export default function GalleryPage() {
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string

    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [commentText, setCommentText] = useState('')
    const [sendingComment, setSendingComment] = useState(false)

    const fetchGallery = useCallback(async () => {
        try {
            const response = await fetch(`/api/discussions/${discussionId}/gallery`)
            if (!response.ok) {
                throw new Error('Failed to fetch gallery')
            }
            const data = await response.json()
            setDiscussion(data.discussion)
            setSubmissions(data.submissions)
        } catch (error) {
            console.error('Error fetching gallery:', error)
            toast.error('갤러리를 불러오는데 실패했습니다')
        } finally {
            setLoading(false)
        }
    }, [discussionId])

    useEffect(() => {
        fetchGallery()
    }, [fetchGallery])

    const handleLike = async (participantId: string, hasLiked: boolean) => {
        try {
            if (hasLiked) {
                await fetch(`/api/discussions/${discussionId}/likes?participantId=${participantId}`, {
                    method: 'DELETE'
                })
            } else {
                await fetch(`/api/discussions/${discussionId}/likes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ participantId })
                })
            }

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === participantId
                    ? { ...s, hasLiked: !hasLiked, likeCount: hasLiked ? s.likeCount - 1 : s.likeCount + 1 }
                    : s
            ))
        } catch (error) {
            console.error('Error toggling like:', error)
            toast.error('좋아요 처리 중 오류가 발생했습니다')
        }
    }

    const handleComment = async (participantId: string) => {
        if (!commentText.trim() || sendingComment) return

        setSendingComment(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId, content: commentText.trim() })
            })

            if (!response.ok) throw new Error('Failed to add comment')

            const { comment } = await response.json()

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === participantId
                    ? { ...s, comments: [...s.comments, comment], commentCount: s.commentCount + 1 }
                    : s
            ))
            setCommentText('')
            toast.success('댓글이 등록되었습니다')
        } catch (error) {
            console.error('Error adding comment:', error)
            toast.error('댓글 등록에 실패했습니다')
        } finally {
            setSendingComment(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">갤러리 로딩 중...</p>
                </div>
            </div>
        )
    }

    if (!discussion) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="brutal-box p-8 max-w-md text-center">
                    <h1 className="text-2xl font-bold mb-2">토론을 찾을 수 없습니다</h1>
                    <button onClick={() => router.push('/student')} className="btn-brutal-fill mt-4">
                        대시보드로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/student/discussions/${discussionId}`}
                            className="p-2 border-2 border-border hover:border-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                                답변 갤러리
                            </h1>
                            <p className="text-sm text-muted-foreground">{discussion.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{submissions.length}명 제출</span>
                    </div>
                </div>
            </header>

            {/* Gallery Grid */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {submissions.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h2 className="text-xl font-semibold mb-2">아직 제출된 답변이 없습니다</h2>
                        <p className="text-muted-foreground">다른 학생들이 답변을 제출하면 여기에 표시됩니다</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {submissions.map((submission, index) => (
                            <motion.div
                                key={submission.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="brutal-box bg-card overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className="p-4 border-b-2 border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center gap-1.5 px-3 py-1 border-2 text-sm font-medium ${getStanceStyle(submission.stance || 'neutral')}`}>
                                            {getStanceIcon(submission.stance || 'neutral')}
                                            {discussion.settings.stanceLabels?.[submission.stance || 'neutral'] || submission.stance || '중립'}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {discussion.settings.anonymous
                                                ? `학생 ${index + 1}`
                                                : submission.display_name || `학생 ${index + 1}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {new Date(submission.created_at).toLocaleDateString('ko-KR')}
                                    </div>
                                </div>

                                {/* Statement */}
                                <div className="p-4">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {submission.stance_statement || '(입장 설명 없음)'}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="px-4 py-3 border-t-2 border-border bg-muted/20 flex items-center gap-4">
                                    <button
                                        onClick={() => handleLike(submission.id, submission.hasLiked)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 border-2 transition-all ${submission.hasLiked
                                                ? 'border-[hsl(var(--coral))] bg-[hsl(var(--coral))]/10 text-[hsl(var(--coral))]'
                                                : 'border-border hover:border-foreground'
                                            }`}
                                    >
                                        <Heart className={`w-4 h-4 ${submission.hasLiked ? 'fill-current' : ''}`} />
                                        <span className="text-sm font-medium">{submission.likeCount}</span>
                                    </button>
                                    <button
                                        onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-border hover:border-foreground transition-colors"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">{submission.commentCount}</span>
                                    </button>
                                </div>

                                {/* Comments Section */}
                                <AnimatePresence>
                                    {expandedId === submission.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t-2 border-border overflow-hidden"
                                        >
                                            <div className="p-4 space-y-4">
                                                {/* Existing Comments */}
                                                {submission.comments.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {submission.comments.map(comment => (
                                                            <div key={comment.id} className="flex gap-3">
                                                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {(comment.user_name || '익명').charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-semibold">{comment.user_name || '익명'}</span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {new Date(comment.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">아직 댓글이 없습니다</p>
                                                )}

                                                {/* Comment Input */}
                                                <div className="flex gap-2 pt-2 border-t border-border">
                                                    <input
                                                        type="text"
                                                        value={commentText}
                                                        onChange={e => setCommentText(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleComment(submission.id)}
                                                        placeholder="댓글을 입력하세요..."
                                                        className="input-editorial flex-1 py-2 px-3 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleComment(submission.id)}
                                                        disabled={!commentText.trim() || sendingComment}
                                                        className="btn-brutal-fill px-4 disabled:opacity-50"
                                                    >
                                                        {sendingComment ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
