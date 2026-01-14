'use client'

import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

function ErrorContent() {
    const t = useTranslations('Auth.AuthError')
    const tErr = useTranslations('Auth.Errors')
    const searchParams = useSearchParams()
    const message = searchParams.get('message') || t('defaultMessage')
    const canResend = searchParams.get('canResend') === 'true'
    const [isResending, setIsResending] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)

    const handleResendEmail = async () => {
        // localStorage에서 pending email 가져오기
        const email = localStorage.getItem('pendingConfirmEmail')

        if (!email) {
            toast.error(t('emailNotFound'))
            return
        }

        setIsResending(true)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            })

            if (error) {
                const msg = error.message.toLowerCase()
                if (msg.includes('security purposes') || (msg.includes('after') && msg.includes('seconds'))) {
                    toast.error(tErr('security'))
                } else if (msg.includes('rate limit')) {
                    toast.error(tErr('rateLimit'))
                } else {
                    toast.error(error.message)
                }
                return
            }

            setResendSuccess(true)
            toast.success(t('resendSuccess'))
        } catch (error) {
            toast.error(t('defaultMessage'))
        } finally {
            setIsResending(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
        >
            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 bg-amber-500 text-white flex items-center justify-center">
                    <AlertCircle className="w-10 h-10" />
                </div>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="tag mb-4">{t('tag')}</div>
                <h2
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    {t('title')}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    {message}
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 items-center">
                {canResend && !resendSuccess && (
                    <button
                        onClick={handleResendEmail}
                        disabled={isResending}
                        className="btn-brutal-fill inline-flex items-center justify-center gap-2 bg-primary text-white"
                    >
                        {isResending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Mail className="w-4 h-4" />
                        )}
                        {t('resendButton')}
                    </button>
                )}

                {resendSuccess && (
                    <p className="text-green-600 font-medium">
                        {t('resendSuccess')}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2">
                    <Link
                        href="/login"
                        className="btn-brutal inline-flex items-center justify-center gap-2"
                    >
                        {t('backToLogin')}
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/register"
                        className="btn-brutal inline-flex items-center justify-center gap-2"
                    >
                        {t('registerAgain')}
                    </Link>
                </div>
            </div>
        </motion.div>
    )
}

export default function AuthErrorPage() {
    const t = useTranslations('Auth.AuthError')
    return (
        <Suspense fallback={<div className="text-center">{t('loading')}</div>}>
            <ErrorContent />
        </Suspense>
    )
}
