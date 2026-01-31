'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { getURL } from '@/lib/utils'
import { toast } from 'sonner'
import GoogleIcon from '@/components/icons/GoogleIcon'
import KakaoIcon from '@/components/icons/KakaoIcon'
import { useTranslations } from 'next-intl'

function LoginForm() {
    const t = useTranslations('Auth.Login')
    const tVal = useTranslations('Auth.Validation')
    const tErr = useTranslations('Auth.Errors')
    
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)
    const redirect = searchParams.get('redirect') || '/instructor'

    const loginSchema = z.object({
        email: z.string().email(tVal('emailInvalid')),
        password: z.string()
            .min(6, tVal('passwordMin'))
            // .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, tVal('passwordRegex')),
    })

    type LoginFormData = z.infer<typeof loginSchema>

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    // 비밀번호 입력 시 영문, 숫자, 특수문자만 허용
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // const filtered = e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '')
        setValue('password', e.target.value)
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
                    toast.error(tErr('security'))
                } else if (msg.includes('rate limit')) {
                    toast.error(tErr('rateLimit'))
                } else if (msg.includes('invalid login credentials')) {
                    toast.error(tErr('invalidCredentials'))
                } else if (msg.includes('email not confirmed')) {
                    toast.info(tErr('emailNotConfirmed'))
                } else {
                    toast.error(error.message)
                }
                return
            }

            toast.success(t('success'))
            router.push(redirect)
            router.refresh()
        } catch (error) {
            toast.error(t('error'))
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
                    toast.error(tErr('security'))
                } else if (msg.includes('rate limit')) {
                    toast.error(tErr('rateLimit'))
                } else {
                    toast.error(error.message)
                }
                setOauthLoading(null)
            }
        } catch (error) {
            toast.error(tErr('socialLoginError'))
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
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{t('title')}</span>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">{t('welcome')}</h2>
                    <p className="text-zinc-600">
                        {t('description')}
                    </p>
                </div>

                {/* OAuth Buttons - Google, Kakao (카카오 로그인) */}
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
                        <span className="text-sm font-roboto">{t('googleBtn')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOAuthSignIn('kakao')}
                        disabled={isLoading || oauthLoading !== null}
                        className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-full bg-[#FEE500] border border-[#FEE500] text-[#191919] font-medium transition-all hover:bg-[#f5d900] hover:border-[#f5d900] hover:shadow-md active:scale-[0.98]"
                        aria-label={t('kakaoBtn')}
                    >
                        {oauthLoading === 'kakao' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-[#191919]" />
                        ) : (
                            <KakaoIcon className="w-5 h-5" />
                        )}
                        <span className="text-sm font-medium">{t('kakaoBtn')}</span>
                    </button>
                </div>

                <div className="relative mb-10">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="bg-white px-4 text-zinc-500">{t('or')}</span>
                    </div>
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

                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                {t('passwordLabel')}
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                {t('forgotPassword')}
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
                                    {t('submitBtn')}
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
                        {t('noAccount')}{' '}
                        <Link
                            href={`/register${redirect && redirect !== '/instructor' ? `?redirect=${redirect}` : ''}`}
                            className="text-zinc-900 font-bold hover:text-primary underline-offset-4 hover:underline transition-colors"
                        >
                            {t('registerLink')}
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
