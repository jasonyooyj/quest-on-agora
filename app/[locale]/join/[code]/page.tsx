'use client'

import { useRef, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { Loader2, AlertCircle, CheckCircle, ArrowRight, Lock, UserPlus, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export default function JoinDiscussionPage() {
    const params = useParams()
    const router = useRouter()
    const code = (params.code as string).toUpperCase()
    const t = useTranslations('Join')

    // Add ref to track if we've already attempted join to prevent double-firing
    const attemptRef = useRef(false)

    const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'unauthenticated'>('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (attemptRef.current) return
        attemptRef.current = true

        const joinDiscussion = async () => {
            try {
                const response = await fetch(`/api/join/${code}`, {
                    method: 'POST',
                })
                const data = await response.json()

                if (!response.ok) {
                    if (response.status === 401) {
                        // Unauthorized - Show dedicated join page
                        setStatus('unauthenticated')
                        return
                    }

                    if (data.code === 'STUDENT_ONLY') {
                        toast.error(t('toasts.instructorForbidden'))
                        setErrorMessage(t('error.studentOnly'))
                    } else if (data.code === 'INVALID_CODE') {
                        setErrorMessage(t('error.invalidCode'))
                    } else if (data.code === 'NOT_FOUND') {
                        setErrorMessage(t('error.notFound'))
                    } else if (data.code === 'DRAFT_MODE') {
                        setErrorMessage(t('error.draft'))
                    } else if (data.code === 'DISCUSSION_CLOSED') {
                        setErrorMessage(t('error.closed'))
                    } else {
                        setErrorMessage(data.error || t('error.default'))
                    }
                    setStatus('error')
                    return
                }

                // Success or Already Joined
                if (data.alreadyJoined) {
                    toast.info(t('toasts.alreadyJoined'))
                    router.push(`/student/discussions/${data.discussionId}`)
                    return
                }

                setStatus('success')
                toast.success(t('toasts.success'))
                // Redirect to discussion page
                setTimeout(() => {
                    router.push(`/student/discussions/${data.discussionId}`)
                }, 1000)

            } catch (error) {
                console.error('Error joining discussion:', error)
                setStatus('error')
                setErrorMessage(t('error.default'))
            }
        }

        joinDiscussion()
    }, [code, router, t])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-zinc-500 font-medium animate-pulse">{t('loading')}</p>
            </div>
        )
    }

    if (status === 'unauthenticated') {
        const redirectUrl = `/join/${code}`
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-50">
                <div className="brutal-box p-6 sm:p-8 max-w-md w-full bg-white">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-zinc-900 mb-2">{t('unauthenticated.title')}</h1>
                        <p className="text-zinc-600">
                            {t('unauthenticated.description')}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link
                            href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                            className="btn-brutal w-full flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            {t('unauthenticated.login')}
                        </Link>

                        <Link
                            href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-zinc-900 font-bold bg-white text-zinc-900 hover:bg-zinc-50 transition-all active:translate-y-1"
                        >
                            <UserPlus className="w-4 h-4" />
                            {t('unauthenticated.register')}
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50">
                <div className="brutal-box p-8 max-w-md w-full text-center bg-white">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2">{t('error.title')}</h1>
                    <p className="text-zinc-600 mb-8">{errorMessage}</p>
                    <button
                        onClick={() => router.push('/student')}
                        className="btn-brutal w-full flex items-center justify-center gap-2"
                    >
                        {t('error.dashboard')}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50">
            <div className="brutal-box p-8 max-w-md w-full text-center bg-white">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">{t('joining.title')}</h1>
                <p className="text-zinc-500 mb-8">
                    {t('joining.code')} <span className="font-mono font-bold text-zinc-900">{code}</span>
                </p>
                <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </div>
        </div>
    )
}
