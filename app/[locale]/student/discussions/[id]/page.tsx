'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StudentDiscussionContent } from '@/components/discussion/StudentDiscussionContent'

export default function StudentDiscussionPage() {
    const t = useTranslations('Student.Dashboard.DiscussionDetail')
    const params = useParams()
    const router = useRouter()
    const discussionId = params.id as string

    const supabase = getSupabaseClient()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id)
            } else {
                router.push('/login?redirect=/student')
            }
            setIsLoading(false)
        })
    }, [router, supabase])

    if (isLoading || !userId) {
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

    return (
        <StudentDiscussionContent
            discussionId={discussionId}
            userId={userId}
            isPreview={false}
            backHref="/student"
            galleryHref={`/student/discussions/${discussionId}/gallery`}
            submitHref={`/student/discussions/${discussionId}/submit`}
        />
    )
}
