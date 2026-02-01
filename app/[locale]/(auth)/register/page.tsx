'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock, User, GraduationCap, Building } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { getURL } from '@/lib/utils'
import { toast } from 'sonner'
import GoogleIcon from '@/components/icons/GoogleIcon'
import KakaoIcon from '@/components/icons/KakaoIcon'
import { useTranslations } from 'next-intl'

function RegisterContent() {
    const t = useTranslations('Auth.Register')
    const tVal = useTranslations('Auth.Validation')
    const tErr = useTranslations('Auth.Errors')

    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect')
    const [isLoading, setIsLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<'instructor' | 'student'>('instructor')

    const registerSchema = z.object({
        name: z.string().min(2, tVal('nameRequired')),
        email: z.string().email(tVal('emailInvalid')),
        password: z.string()
            .min(6, tVal('passwordMin'))
            .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, tVal('passwordRegex')),
        confirmPassword: z.string(),
        role: z.enum(['instructor', 'student']),
        studentNumber: z.string().optional(),
        school: z.string().optional(),
        department: z.string().optional(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: tVal('passwordMismatch'),
        path: ['confirmPassword'],
    })

    type RegisterForm = z.infer<typeof registerSchema>

    const handleOAuthSignUp = async (provider: 'google' | 'kakao') => {
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

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'instructor',
        },
    })

    // 비밀번호 입력 시 영문, 숫자, 특수문자만 허용
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'password' | 'confirmPassword') => {
        const filtered = e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '')
        setValue(field, filtered)
    }

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    emailRedirectTo: `${getURL()}auth/callback${redirect ? `?next=${redirect}` : ''}`,
                    data: {
                        name: data.name,
                        role: data.role,
                    },
                },
            })

            if (authError) {
                // Rate limiting 에러 메시지 한글화 (대소문자 무시)
                const msg = authError.message.toLowerCase()
                if (msg.includes('security purposes') || (msg.includes('after') && msg.includes('seconds'))) {
                    toast.error(tErr('security'))
                } else if (msg.includes('rate limit')) {
                    toast.error(tErr('rateLimit'))
                } else if (msg.includes('email not confirmed')) {
                    toast.info(tErr('emailNotConfirmed'))
                } else {
                    toast.error(authError.message)
                }
                return
            }

            // 이미 가입된 이메일인지 확인 (identities가 비어있으면 이미 존재하는 계정)
            if (authData.user && (!authData.user.identities || authData.user.identities.length === 0)) {
                toast.warning(t('emailExists'))
                router.push('/login')
                return
            }

            if (authData.user) {
                // 이메일 확인 페이지에서 재발송을 위해 이메일 저장
                localStorage.setItem('pendingConfirmEmail', data.email)
                localStorage.setItem('lastEmailSentAt', Date.now().toString())

                // Use server-side API route to bypass RLS
                const profileResponse = await fetch('/api/auth/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: authData.user.id,
                        email: data.email,
                        name: data.name,
                        role: data.role,
                        student_number: data.studentNumber || null,
                        school: data.school || null,
                        department: data.department || null,
                    }),
                })

                if (!profileResponse.ok) {
                    const errorData = await profileResponse.json()
                    console.error('Profile creation error:', errorData)
                    // 프로필 오류는 무시하고 진행 (upsert 실패 시에도 이메일 확인 안내)
                }
            }

            toast.success(t('success'))
            router.push('/confirm-email')
        } catch (error) {
            toast.error(t('error'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden pt-20 pb-20">
            {/* Background Blobs */}
            <div className="absolute inset-0 z-0 bg-background pointer-events-none">
                <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-indigo-200/30 rounded-full mix-blend-multiply filter blur-[140px] animate-blob" />
                <div className="absolute bottom-0 -left-20 w-[600px] h-[600px] bg-primary/15 rounded-full mix-blend-multiply filter blur-[140px] animate-blob animation-delay-4000" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-2xl glass-panel p-10 md:p-12 shadow-xl bg-white/90 border-zinc-200"
            >
                {/* 역할 선택 - 최상단, 가장 눈에 띄게 */}
                <div className="mb-10 -mt-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4">
                        {t('roleStep')}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-zinc-900 mb-1">{t('roleLabel')}</h3>
                    <p className="text-sm text-zinc-500 mb-5">{t('roleDescription')}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRole('instructor')
                                setValue('role', 'instructor')
                            }}
                            className={`group relative p-6 md:p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-4 overflow-hidden ${selectedRole === 'instructor'
                                ? 'bg-gradient-to-b from-primary/20 to-primary/5 border-primary shadow-[0_0_0_3px_rgba(139,92,246,0.2),0_8px_24px_rgba(139,92,246,0.12)] ring-2 ring-primary/30'
                                : 'bg-zinc-50/80 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 hover:shadow-md'
                                }`}
                        >
                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedRole === 'instructor' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-zinc-200 text-zinc-500 group-hover:bg-zinc-300 group-hover:text-zinc-700'}`}>
                                <GraduationCap className="w-7 h-7 md:w-8 md:h-8" />
                            </div>
                            <span className={`text-base md:text-lg font-bold tracking-tight ${selectedRole === 'instructor' ? 'text-zinc-900' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{t('instructor')}</span>
                            {selectedRole === 'instructor' && (
                                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRole('student')
                                setValue('role', 'student')
                            }}
                            className={`group relative p-6 md:p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-4 overflow-hidden ${selectedRole === 'student'
                                ? 'bg-gradient-to-b from-primary/20 to-primary/5 border-primary shadow-[0_0_0_3px_rgba(139,92,246,0.2),0_8px_24px_rgba(139,92,246,0.12)] ring-2 ring-primary/30'
                                : 'bg-zinc-50/80 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 hover:shadow-md'
                                }`}
                        >
                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedRole === 'student' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-zinc-200 text-zinc-500 group-hover:bg-zinc-300 group-hover:text-zinc-700'}`}>
                                <User className="w-7 h-7 md:w-8 md:h-8" />
                            </div>
                            <span className={`text-base md:text-lg font-bold tracking-tight ${selectedRole === 'student' ? 'text-zinc-900' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{t('student')}</span>
                            {selectedRole === 'student' && (
                                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden />
                            )}
                        </button>
                    </div>
                </div>

                {/* 2단계: 가입 방법 및 정보 입력 */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4">
                    {t('step2')}
                </div>
                {/* Header */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">{t('welcome')}</h2>
                    <p className="text-sm text-zinc-600">
                        {t('description')}
                    </p>
                </div>

                {/* OAuth Buttons - Google, Kakao (카카오 로그인) */}
                <div className="grid grid-cols-1 gap-4 mb-10">
                    <button
                        type="button"
                        onClick={() => handleOAuthSignUp('google')}
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
                        onClick={() => handleOAuthSignUp('kakao')}
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
                        <span className="bg-white px-4 text-zinc-500">{t('orEmail')}</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                {t('nameLabel')}
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="홍길동"
                                    className="ios-input pl-12 h-14"
                                    {...register('name')}
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Email */}
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
                    </div>

                    {/* Student-specific fields */}
                    {selectedRole === 'student' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-6 pt-2"
                        >
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                        {t('studentNumberLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="20231234"
                                        className="ios-input h-14 px-5"
                                        {...register('studentNumber')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                        {t('schoolLabel')}
                                    </label>
                                    <div className="relative group">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="홍익대학교"
                                            className="ios-input pl-12 h-14"
                                            {...register('school')}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                    {t('departmentLabel')}
                                </label>
                                <div className="relative group">
                                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="컴퓨터공학과"
                                        className="ios-input pl-12 h-14"
                                        {...register('department')}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                {t('passwordLabel')}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="ios-input pl-12 h-14"
                                    {...register('password', {
                                        onChange: (e) => handlePasswordChange(e, 'password')
                                    })}
                                />
                            </div>
                            <p className="text-[10px] text-zinc-400 ml-1">{t('passwordHint')}</p>
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                {t('confirmPasswordLabel')}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="ios-input pl-12 h-14"
                                    {...register('confirmPassword', {
                                        onChange: (e) => handlePasswordChange(e, 'confirmPassword')
                                    })}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || oauthLoading !== null}
                        className="group relative w-full h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full overflow-hidden shadow-lg transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
                        {t('hasAccount')}{' '}
                        <Link
                            href="/login"
                            className="text-zinc-900 font-bold hover:text-primary underline-offset-4 hover:underline transition-colors"
                        >
                            {t('loginLink')}
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <RegisterContent />
        </Suspense>
    )
}
