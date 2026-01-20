'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StudentDiscussionContent } from '@/components/discussion/StudentDiscussionContent'
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

export default function InstructorPreviewPage() {
    const t = useTranslations('Instructor.Preview')
    const tCommon = useTranslations('Common')
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string

    const supabase = getSupabaseClient()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isCreatingPreview, setIsCreatingPreview] = useState(false)
    const [previewReady, setPreviewReady] = useState(false)
    const [showExitDialog, setShowExitDialog] = useState(false)
    const [isExiting, setIsExiting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Check auth and verify ownership
    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login?redirect=/instructor')
                return
            }

            // Verify the user is the discussion owner
            const { data: discussion, error: discussionError } = await supabase
                .from('discussion_sessions')
                .select('instructor_id')
                .eq('id', discussionId)
                .single()

            if (discussionError || !discussion) {
                setError(t('errors.notFound'))
                setIsLoading(false)
                return
            }

            if (discussion.instructor_id !== user.id) {
                setError(t('errors.notOwner'))
                setIsLoading(false)
                return
            }

            setUserId(user.id)
            setIsLoading(false)
        }

        checkAuth()
    }, [discussionId, router, supabase, t])

    // Create preview participant
    const createPreview = useCallback(async () => {
        if (!userId) return

        setIsCreatingPreview(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/preview`, {
                method: 'POST'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create preview')
            }

            setPreviewReady(true)
        } catch (err) {
            console.error('Error creating preview:', err)
            setError(t('errors.createFailed'))
        } finally {
            setIsCreatingPreview(false)
        }
    }, [discussionId, userId, t])

    // Create preview on mount
    useEffect(() => {
        if (userId && !previewReady && !isCreatingPreview && !error) {
            createPreview()
        }
    }, [userId, previewReady, isCreatingPreview, error, createPreview])

    // Handle exit preview
    const handleExitPreview = async () => {
        setIsExiting(true)
        try {
            const response = await fetch(`/api/discussions/${discussionId}/preview`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete preview')
            }

            toast.success(t('exitSuccess'))
            router.push(`/instructor/discussions/${discussionId}`)
        } catch (err) {
            console.error('Error exiting preview:', err)
            toast.error(t('exitError'))
            // Still navigate back even if delete fails
            router.push(`/instructor/discussions/${discussionId}`)
        } finally {
            setIsExiting(false)
            setShowExitDialog(false)
        }
    }

    // Handle back button - show confirmation dialog
    const handleBack = () => {
        setShowExitDialog(true)
    }

    if (isLoading || isCreatingPreview) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply hidden md:block" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply hidden md:block" />
                <div className="text-center relative z-10">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary relative" />
                    </div>
                    <p className="text-zinc-500 text-lg font-bold tracking-tight animate-pulse">
                        {isCreatingPreview ? t('creating') : t('loading')}
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply hidden md:block" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply hidden md:block" />
                <div className="text-center relative z-10 max-w-md mx-auto px-4">
                    <div className="w-20 h-20 bg-red-100 border border-red-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3">{t('errors.title')}</h2>
                    <p className="text-zinc-500 font-medium mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/instructor')}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full hover:shadow-lg transition-all"
                    >
                        {t('backToInstructor')}
                    </button>
                </div>
            </div>
        )
    }

    if (!userId || !previewReady) {
        return null
    }

    return (
        <>
            <StudentDiscussionContent
                discussionId={discussionId}
                userId={userId}
                isPreview={true}
                onBack={handleBack}
            />

            {/* Exit Preview Confirmation Dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent className="rounded-[2rem] border-zinc-200 max-w-md">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-600" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-center">
                            {t('exitDialog.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 leading-relaxed">
                            {t('exitDialog.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-3 sm:gap-3 mt-4">
                        <AlertDialogCancel
                            className="flex-1 h-12 rounded-full border-zinc-200 font-bold"
                            disabled={isExiting}
                        >
                            {t('exitDialog.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleExitPreview}
                            disabled={isExiting}
                            className="flex-1 h-12 rounded-full bg-amber-500 hover:bg-amber-600 font-bold"
                        >
                            {isExiting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('exitDialog.exiting')}
                                </>
                            ) : (
                                t('exitDialog.confirm')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
