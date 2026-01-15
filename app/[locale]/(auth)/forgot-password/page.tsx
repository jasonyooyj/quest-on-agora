'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { getURL } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

function ForgotPasswordContent() {
    const t = useTranslations('Auth.ForgotPassword')
    const tVal = useTranslations('Auth.Validation')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const forgotPasswordSchema = z.object({
        email: z.string().email(tVal('emailInvalid')),
    })

    type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (data: ForgotPasswordForm) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${getURL()}update-password`,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            setIsSuccess(true)
            toast.success(t('toastSuccess'))
        } catch (error) {
            toast.error(t('toastError'))
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute inset-0 z-0 bg-background pointer-events-none">
                    <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-primary/15 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
                    <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 w-full max-w-lg glass-panel p-10 md:p-12 shadow-xl bg-white/90 border-zinc-200 text-center"
                >
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-3">{t('successTitle')}</h2>
                    <p className="text-zinc-600 mb-8 leading-relaxed whitespace-pre-line">
                        {t('successDescription')}
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('backToLogin')}
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute inset-0 z-0 bg-background pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-primary/15 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
                <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-lg glass-panel p-10 md:p-12 shadow-xl bg-white/90 border-zinc-200"
            >
                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{t('title')}</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">{t('title')}</h2>
                    <p className="text-zinc-600 whitespace-pre-line">
                        {t('description')}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                            {t('emailLabel')}
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                placeholder="you@university.edu"
                                className="ios-input pl-12 h-14"
                                {...register('email')}
                            />
                        </div>
                        {errors.email && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.email.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full overflow-hidden shadow-lg transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {t('submitBtn')}
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </form>

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('backToLogin')}
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordContent />
}
