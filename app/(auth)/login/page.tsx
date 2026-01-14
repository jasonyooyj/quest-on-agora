'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { getURL } from '@/lib/utils'
import { toast } from 'sonner'
import GoogleIcon from '@/components/icons/GoogleIcon'

const loginSchema = z.object({
    email: z.string().email('올바른 이메일을 입력해주세요'),
    password: z.string()
        .min(6, '비밀번호는 6자 이상이어야 합니다')
        .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, '비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)
    const redirect = searchParams.get('redirect') || '/instructor'

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    // 비밀번호 입력 시 영문, 숫자, 특수문자만 허용
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const filtered = e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '')
        setValue('password', filtered)
    }

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) {
                // Rate limiting 및 일반 에러 메시지 한글화 (대소문자 무시)
                const msg = error.message.toLowerCase()
                if (msg.includes('security purposes') || (msg.includes('after') && msg.includes('seconds'))) {
                    toast.error('보안을 위해 잠시 후 다시 시도해주세요. (약 1분 대기)')
                } else if (msg.includes('rate limit')) {
                    toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
                } else if (msg.includes('invalid login credentials')) {
                    toast.error('이메일 또는 비밀번호가 올바르지 않습니다')
                } else if (msg.includes('email not confirmed')) {
                    toast.info('📬 이메일 인증을 완료해주세요. 받은편지함을 확인하세요!')
                } else {
                    toast.error(error.message)
                }
                return
            }

            toast.success('로그인 성공!')
            router.push(redirect)
            router.refresh()
        } catch (error) {
            toast.error('로그인 중 오류가 발생했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    const handleOAuthSignIn = async (provider: 'google' | 'kakao') => {
        setOauthLoading(provider)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${getURL()}auth/callback${redirect ? `?next=${redirect}` : ''}`,
                },
            })

            if (error) {
                // OAuth 에러 메시지 한글화
                const msg = error.message.toLowerCase()
                if (msg.includes('security purposes') || (msg.includes('after') && msg.includes('seconds'))) {
                    toast.error('보안을 위해 잠시 후 다시 시도해주세요. (약 1분 대기)')
                } else if (msg.includes('rate limit')) {
                    toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
                } else {
                    toast.error(error.message)
                }
                setOauthLoading(null)
            }
        } catch (error) {
            toast.error('소셜 로그인 중 오류가 발생했습니다')
            setOauthLoading(null)
        }
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
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">아고라 로그인</span>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">다시 오셨군요!</h2>
                    <p className="text-zinc-600">
                        계정에 로그인하여 토론을 시작하세요
                    </p>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-cols-1 gap-4 mb-10">
                    <button
                        type="button"
                        onClick={() => handleOAuthSignIn('google')}
                        disabled={isLoading || oauthLoading !== null}
                        className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-full bg-white border border-zinc-200 text-zinc-700 font-medium transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md active:scale-[0.98]"
                    >
                        {oauthLoading === 'google' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                        ) : (
                            <GoogleIcon className="w-5 h-5" />
                        )}
                        <span className="text-sm font-roboto">Google로 계속하기</span>
                    </button>
                </div>

                <div className="relative mb-10">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="bg-white px-4 text-zinc-500">또는</span>
                    </div>
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

                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                비밀번호
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                비밀번호를 잊으셨나요?
                            </Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="ios-input pl-12 h-14"
                                {...register('password', {
                                    onChange: handlePasswordChange
                                })}
                            />
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || oauthLoading !== null}
                        className="group relative w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full overflow-hidden shadow-lg transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    로그인하기
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-12 text-center">
                    <p className="text-zinc-500 text-sm">
                        계정이 없으신가요?{' '}
                        <Link
                            href={`/register${redirect && redirect !== '/instructor' ? `?redirect=${redirect}` : ''}`}
                            className="text-zinc-900 font-bold hover:text-primary underline-offset-4 hover:underline transition-colors"
                        >
                            회원가입
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
