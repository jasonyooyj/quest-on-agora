'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
    ArrowLeft, Loader2, Lightbulb, Send, CheckCircle,
    Sparkles, FileText
} from 'lucide-react'
import { useDiscussionSession, useDiscussionParticipants } from '@/hooks/useDiscussion'
import { getSupabaseClient } from '@/lib/supabase-client'
import { useTranslations } from 'next-intl'
import { ProfileMenuAuto } from '@/components/profile/ProfileMenuAuto'

export default function SubmitPage() {
    const t = useTranslations('Student.Dashboard.Submit')
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string
    const supabase = getSupabaseClient()

    const [userId, setUserId] = useState<string | null>(null)
    const [keyPoints, setKeyPoints] = useState<string[]>([])
    const [isLoadingKeyPoints, setIsLoadingKeyPoints] = useState(true)
    const [reflection, setReflection] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: discussion, isLoading: isDiscussionLoading } = useDiscussionSession(discussionId)
    const { data: participants, isLoading: isParticipantsLoading } = useDiscussionParticipants(discussionId)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id)
            else router.push('/login?redirect=/student')
        })
    }, [router, supabase])

    const participant = participants?.find(p => p.studentId === userId)

    // Redirect if already submitted
    useEffect(() => {
        if (participant?.isSubmitted) {
            router.push(`/student/discussions/${discussionId}`)
        }
    }, [participant?.isSubmitted, discussionId, router])

    // Fetch key points when participant is loaded
    useEffect(() => {
        if (!participant?.id) return

        const fetchKeyPoints = async () => {
            setIsLoadingKeyPoints(true)
            try {
                const response = await fetch(`/api/discussions/${discussionId}/extract-keypoints`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ participantId: participant.id })
                })

                if (!response.ok) throw new Error('Failed to fetch key points')

                const data = await response.json()
                setKeyPoints(data.keyPoints || [])
            } catch (error) {
                console.error('Error fetching key points:', error)
                setKeyPoints([t('toasts.loadKeyPointsError')])
            } finally {
                setIsLoadingKeyPoints(false)
            }
        }

        fetchKeyPoints()
    }, [discussionId, participant?.id, t])

    const handleSubmit = async () => {
        if (!participant || isSubmitting) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/participants`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    final_reflection: reflection.trim() || null,
                    is_submitted: true
                })
            })

            if (!response.ok) throw new Error('Failed to submit')

            toast.success(t('toasts.submitSuccess'), {
                description: t('toasts.submitSuccessDesc')
            })

            router.push(`/student/discussions/${discussionId}`)
        } catch (error) {
            console.error('Error submitting:', error)
            toast.error(t('toasts.submitError'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const isLoading = isDiscussionLoading || isParticipantsLoading || !userId

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-500 mb-4" />
                    <p className="text-zinc-500 font-medium">{t('submit.submitting')}</p>
                </div>
            </div>
        )
    }

    if (!discussion || !participant) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-zinc-500 mb-4">{t('toasts.loadKeyPointsError')}</p>
                    <button onClick={() => router.push('/student')} className="btn-brutal-fill">
                        {t('toasts.return')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/student/discussions/${discussionId}`}
                            className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg text-zinc-900">{t('title')}</h1>
                            <p className="text-xs text-zinc-500">{discussion.title}</p>
                        </div>
                    </div>
                    <ProfileMenuAuto />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
                {/* Key Points Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-zinc-900">{t('keyPoints.title')}</h2>
                            <p className="text-xs text-zinc-500">{t('keyPoints.subtitle')}</p>
                        </div>
                    </div>

                    <div className="p-6">
                        {isLoadingKeyPoints ? (
                            <div className="flex items-center justify-center py-8 gap-3 text-zinc-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>{t('keyPoints.loading')}</span>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {keyPoints.map((point, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex gap-3 items-start"
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <p className="text-zinc-700 leading-relaxed pt-0.5">{point}</p>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </div>
                </motion.section>

                {/* Reflection Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold text-zinc-900">{t('reflection.title')}</h2>
                            <p className="text-xs text-zinc-500">{t('reflection.description')}</p>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2 py-1 rounded-full">
                            {t('reflection.optional')}
                        </span>
                    </div>

                    <div className="p-6">
                        <textarea
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            placeholder={t('reflection.placeholder')}
                            className="w-full h-40 p-4 border border-zinc-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-zinc-700 placeholder:text-zinc-400 transition-all"
                            maxLength={5000}
                        />
                        <div className="flex justify-end mt-2">
                            <span className="text-xs text-zinc-400">
                                {reflection.length} / 5,000{t('reflection.chars')}
                            </span>
                        </div>
                    </div>
                </motion.section>

                {/* Submit Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-4"
                >
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('submit.submitting')}
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                {t('submit.button')}
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-zinc-400">
                        {t('submit.warning')}
                    </p>
                </motion.div>
            </main>
        </div>
    )
}
