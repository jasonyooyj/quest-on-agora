'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useGallery } from '@/hooks/useGallery'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useFormatter } from 'next-intl'
import {
    ArrowLeft, Heart, MessageCircle, Send, Loader2,
    ThumbsUp, ThumbsDown, Minus, Users, Clock,
    Filter, ArrowUpDown
} from 'lucide-react'
import { ProfileMenuAuto } from '@/components/profile/ProfileMenuAuto'

interface Submission {
    id: string
    display_name: string | null
    stance: string | null
    stance_statement: string | null
    final_reflection: string | null
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
    if (stance === 'pro') return 'bg-blue-500/10 border-blue-500/20 text-blue-600'
    if (stance === 'con') return 'bg-red-500/10 border-red-500/20 text-red-600'
    return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600'
}

export default function GalleryPage() {
    const t = useTranslations('Student.Gallery')
    const format = useFormatter()
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string

    const { galleryQuery, likeMutation, commentMutation } = useGallery(discussionId)
    const { data: galleryData, isLoading } = galleryQuery

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [commentText, setCommentText] = useState('')
    const [stanceFilter, setStanceFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'latest' | 'likes' | 'comments'>('latest')

    const discussion = galleryData?.discussion
    const rawSubmissions = galleryData?.submissions || []

    // Filter and sort submissions
    const submissions = rawSubmissions
        .filter(s => stanceFilter === 'all' || s.stance === stanceFilter)
        .sort((a, b) => {
            if (sortBy === 'likes') return b.likeCount - a.likeCount
            if (sortBy === 'comments') return b.commentCount - a.commentCount
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

    const handleLike = (participantId: string, hasLiked: boolean) => {
        likeMutation.mutate({ participantId, hasLiked })
    }

    const handleComment = (participantId: string) => {
        if (!commentText.trim()) return
        commentMutation.mutate(
            { participantId, content: commentText.trim() },
            {
                onSuccess: () => setCommentText('')
            }
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('loading')}</p>
                </div>
            </div>
        )
    }

    if (!discussion) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="brutal-box p-8 max-w-md text-center">
                    <h1 className="text-2xl font-bold mb-2">{t('notFound.title')}</h1>
                    <button onClick={() => router.push('/student')} className="btn-brutal-fill mt-4">
                        {t('notFound.button')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/student/discussions/${discussionId}`}
                            className="p-2.5 rounded-full hover:bg-black/5 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="font-semibold text-xl tracking-tight text-foreground/90">
                                {t('header.title')}
                            </h1>
                            <p className="text-sm text-muted-foreground/80 font-medium">{discussion.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs font-medium text-secondary-foreground border border-border/50">
                            <Users className="w-3.5 h-3.5" />
                            <span>{t('header.submittedCount', { count: submissions.length })}</span>
                        </div>
                        <ProfileMenuAuto />
                    </div>
                </div>
            </header>

            {/* Filters */}
            {/* Filters */}
            <div className="border-b border-border/40 bg-muted/20 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
                    {/* Stance Filter */}
                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-muted-foreground/70" />
                        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-full border border-border/40">
                            {['all', 'pro', 'con', 'neutral'].map((stance) => (
                                <button
                                    key={stance}
                                    onClick={() => setStanceFilter(stance)}
                                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${stanceFilter === stance
                                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
                                        }`}
                                >
                                    {stance === 'all' ? t('filters.all') :
                                        stance === 'pro' ? t('filters.pro') :
                                            stance === 'con' ? t('filters.con') : t('filters.neutral')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 ml-auto">
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'latest' | 'likes' | 'comments')}
                                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium bg-transparent border-none rounded-lg focus:ring-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <option value="latest">{t('sort.latest')}</option>
                                <option value="likes">{t('sort.likes')}</option>
                                <option value="comments">{t('sort.comments')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery Grid */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {submissions.length === 0 && rawSubmissions.length > 0 ? (
                    <div className="text-center py-16">
                        <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h2 className="text-xl font-semibold mb-2">{t('empty.filterTitle')}</h2>
                        <p className="text-muted-foreground">{t('empty.filterDesc')}</p>
                        <button
                            onClick={() => setStanceFilter('all')}
                            className="btn-brutal mt-4"
                        >
                            {t('empty.reset')}
                        </button>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h2 className="text-xl font-semibold mb-2">{t('empty.title')}</h2>
                        <p className="text-muted-foreground">{t('empty.description')}</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {submissions.map((submission, index) => (
                            <motion.div
                                key={submission.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="brutal-box bg-card/60 backdrop-blur-md overflow-hidden hover:scale-[1.01] transition-transform duration-500 rounded-[2rem] border border-white/20 shadow-sm"
                            >
                                {/* Card Header */}
                                <div className="p-5 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${getStanceStyle(submission.stance || 'neutral')} bg-opacity-20`}>
                                            {getStanceIcon(submission.stance || 'neutral')}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-sm text-foreground/90">
                                                    {discussion.settings.anonymous
                                                        ? t('card.studentName', { index: index + 1 })
                                                        : submission.display_name || t('card.studentName', { index: index + 1 })}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${getStanceStyle(submission.stance || 'neutral')}`}>
                                                    {discussion.settings.stanceLabels?.[submission.stance || 'neutral'] ||
                                                        (['pro', 'con', 'neutral'].includes(submission.stance || 'neutral') ? t(`filters.${submission.stance || 'neutral'}`) : submission.stance)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                                                <Clock className="w-3 h-3" />
                                                {new Date(submission.created_at).toLocaleDateString('ko-KR')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Statement */}
                                <div className="px-5 pb-4">
                                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/80 font-normal">
                                        {submission.stance_statement || t('card.noStatement')}
                                    </p>
                                </div>

                                {/* Final Reflection - only show if exists */}
                                {submission.final_reflection && (
                                    <div className="px-5 pb-5">
                                        <div className="border-t border-border/30 pt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider bg-purple-100 px-2 py-0.5 rounded-full">
                                                    {t('card.reflection')}
                                                </span>
                                            </div>
                                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-muted-foreground italic">
                                                &quot;{submission.final_reflection}&quot;
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="px-5 py-4 border-t border-border/40 bg-muted/10 flex items-center gap-3">
                                    <button
                                        onClick={() => handleLike(submission.id, submission.hasLiked)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${submission.hasLiked
                                            ? 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20'
                                            : 'hover:bg-black/5 text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <Heart className={`w-3.5 h-3.5 ${submission.hasLiked ? 'fill-current' : ''}`} />
                                        <span className="mt-0.5">{submission.likeCount}</span>
                                    </button>
                                    <button
                                        onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${expandedId === submission.id
                                            ? 'bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20'
                                            : 'hover:bg-black/5 text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span className="mt-0.5">{submission.commentCount}</span>
                                    </button>
                                </div>

                                {/* Comments Section */}
                                <AnimatePresence>
                                    {expandedId === submission.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-border/40 bg-muted/30"
                                        >
                                            <div className="p-4 space-y-4">
                                                {/* Existing Comments */}
                                                {submission.comments.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {submission.comments.map(comment => (
                                                            <div key={comment.id} className="flex gap-3">
                                                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {(comment.user_name || t('comments.anonymous')).charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-semibold">{comment.user_name || t('comments.anonymous')}</span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {format.dateTime(new Date(comment.created_at), { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">{t('comments.empty')}</p>
                                                )}

                                                {/* Comment Input */}
                                                <div className="flex gap-2 pt-2 border-t border-border/40">
                                                    <input
                                                        type="text"
                                                        value={commentText}
                                                        onChange={e => setCommentText(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleComment(submission.id)}
                                                        placeholder={t('comments.placeholder')}
                                                        className="input-editorial flex-1 py-2 px-3 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleComment(submission.id)}
                                                        disabled={!commentText.trim() || commentMutation.isPending}
                                                        className="btn-brutal-fill px-4 disabled:opacity-50"
                                                    >
                                                        {commentMutation.isPending ? (
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
