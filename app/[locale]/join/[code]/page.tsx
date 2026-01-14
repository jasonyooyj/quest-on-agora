'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export default function JoinDiscussionPage() {
    const params = useParams()
    const router = useRouter()
    const code = (params.code as string).toUpperCase()
    const t = useTranslations('Join')

    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const joinDiscussion = async () => {
            try {
                const response = await fetch(`/api/join/${code}`, {
                    method: 'POST',
                })
                const data = await response.json()

                if (!response.ok) {
                    if (response.status === 401) {
                        // Unauthorized
                        setStatus('error')
                        setErrorMessage(t('unauthorized.title'))
                        toast.error(t('unauthorized.title'), {
                            description: t('unauthorized.redirect')
                        })
                        setTimeout(() => router.push(`/login?callbackUrl=/join/${code}`), 1500)
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
