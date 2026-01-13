'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowRight, Mail, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const forgotPasswordSchema = z.object({
    email: z.string().email('올바른 이메일을 입력해주세요'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            setIsSubmitted(true)
            toast.success('비밀번호 재설정 링크가 전송되었습니다')
        } catch (error) {
            toast.error('오류가 발생했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
        return (
            <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
                <div className="absolute inset-0 z-0 bg-background pointer-events-none">
                    <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-primary/15 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
                    <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 w-full max-w-lg glass-panel p-10 md:p-12 shadow-xl bg-white/90 border-zinc-200 text-center"
                >
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">이메일 전송 완료</h2>
                    <p className="text-zinc-600 mb-8">
                        비밀번호 재설정 링크가 이메일로 전송되었습니다.<br />
                        메일함을 확인해주세요.
                    </p>

                    <Link
                        href="/login"
                        className="group relative inline-flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-white font-bold rounded-full overflow-hidden transition-all hover:bg-zinc-800 hover:-translate-y-0.5"
                    >
                        로그인으로 돌아가기
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
                <div className="mb-10">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-6 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        로그인으로 돌아가기
                    </Link>

                    <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">비밀번호 찾기</h2>
                    <p className="text-zinc-600">
                        가입하신 이메일을 입력하시면<br />
                        비밀번호 재설정 링크를 보내드립니다.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                            이메일
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
                                    링크 보내기
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
