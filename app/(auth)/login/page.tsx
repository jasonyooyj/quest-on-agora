'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock, Chrome } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const loginSchema = z.object({
    email: z.string().email('올바른 이메일을 입력해주세요'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)
    const redirect = searchParams.get('redirect') || '/instructor'

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) {
                toast.error(error.message)
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
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
                },
            })

            if (error) {
                toast.error(error.message)
                setOauthLoading(null)
            }
        } catch (error) {
            toast.error('소셜 로그인 중 오류가 발생했습니다')
            setOauthLoading(null)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Header */}
            <div className="mb-10">
                <div className="tag mb-4">환영합니다</div>
                <h2
                    className="text-3xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    로그인
                </h2>
                <p className="text-muted-foreground">
                    계정에 로그인하여 토론을 시작하세요
                </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-8">
                <button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={oauthLoading !== null}
                    className="btn-brutal w-full flex items-center justify-center gap-3 bg-white dark:bg-background"
                >
                    {oauthLoading === 'google' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Chrome className="w-5 h-5" />
                    )}
                    <span>Google로 계속하기</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleOAuthSignIn('kakao')}
                    disabled={oauthLoading !== null}
                    className="btn-brutal w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] border-[#FEE500] hover:bg-[#FDD835]"
                >
                    {oauthLoading === 'kakao' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C6.486 3 2 6.262 2 10.29c0 2.548 1.623 4.771 4.067 6.093l-.985 3.589c-.073.266.194.489.428.36l4.282-2.354C10.517 17.983 11.246 18 12 18c5.514 0 10-3.262 10-7.29S17.514 3 12 3z"/>
                        </svg>
                    )}
                    <span>카카오로 계속하기</span>
                </button>
            </div>

            <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-4 text-muted-foreground font-semibold">
                        또는 이메일로 로그인
                    </span>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        이메일
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="email"
                            placeholder="you@university.edu"
                            className="input-editorial with-icon"
                            {...register('email')}
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-2 text-sm text-[hsl(var(--coral))]">{errors.email.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        비밀번호
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="input-editorial with-icon"
                            {...register('password')}
                        />
                    </div>
                    {errors.password && (
                        <p className="mt-2 text-sm text-[hsl(var(--coral))]">{errors.password.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-brutal-fill w-full flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            로그인
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-8 border-t-2 border-border text-center">
                <p className="text-muted-foreground">
                    계정이 없으신가요?{' '}
                    <Link
                        href="/register"
                        className="text-foreground font-semibold hover:text-[hsl(var(--coral))] transition-colors"
                    >
                        회원가입
                    </Link>
                </p>
            </div>
        </motion.div>
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
