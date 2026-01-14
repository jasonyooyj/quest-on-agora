'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock, User, GraduationCap, Building } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { getURL } from '@/lib/utils'
import { toast } from 'sonner'
import GoogleIcon from '@/components/icons/GoogleIcon'

const registerSchema = z.object({
    name: z.string().min(2, '이름을 입력해주세요'),
    email: z.string().email('올바른 이메일을 입력해주세요'),
    password: z.string()
        .min(6, '비밀번호는 6자 이상이어야 합니다')
        .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, '비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다'),
    confirmPassword: z.string(),
    role: z.enum(['instructor', 'student']),
    studentNumber: z.string().optional(),
    school: z.string().optional(),
    department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

function RegisterContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect')
    const [isLoading, setIsLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<'instructor' | 'student'>('student')

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

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'student',
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
                    toast.error('보안을 위해 잠시 후 다시 시도해주세요. (약 1분 대기)')
                } else if (msg.includes('rate limit')) {
                    toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
                } else if (msg.includes('email not confirmed')) {
                    toast.info('📬 이메일 인증을 완료해주세요. 받은편지함을 확인하세요!')
                } else {
                    toast.error(authError.message)
                }
                return
            }

            // 이미 가입된 이메일인지 확인 (identities가 비어있으면 이미 존재하는 계정)
            if (authData.user && (!authData.user.identities || authData.user.identities.length === 0)) {
                toast.warning('이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요.')
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

            toast.success('📧 인증 메일을 발송했습니다! 받은편지함을 확인해주세요.')
            router.push('/confirm-email')
        } catch (error) {
            toast.error('회원가입 중 오류가 발생했습니다')
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
                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">아고라 회원가입</span>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">새로운 시작</h2>
                    <p className="text-zinc-600">
                        Agora와 함께 토론의 새로운 장을 열어보세요
                    </p>
                </div>

                {/* OAuth Buttons */}
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
                        <span className="text-sm font-roboto">Google로 시작하기</span>
                    </button>
                </div>

                <div className="relative mb-10">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="bg-white px-4 text-zinc-500">또는 이메일로 가입</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Role Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 text-center block">
                            본인의 역할은 무엇인가요?
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedRole('instructor')
                                    setValue('role', 'instructor')
                                }}
                                className={`group relative p-6 rounded-3xl border transition-all duration-500 flex flex-col items-center gap-3 overflow-hidden ${selectedRole === 'instructor'
                                    ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${selectedRole === 'instructor' ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-500 group-hover:text-zinc-900'}`}>
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <span className={`font-bold tracking-tight transition-colors ${selectedRole === 'instructor' ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-900'}`}>교수 / 강사</span>
                                {selectedRole === 'instructor' && (
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedRole('student')
                                    setValue('role', 'student')
                                }}
                                className={`group relative p-6 rounded-3xl border transition-all duration-500 flex flex-col items-center gap-3 overflow-hidden ${selectedRole === 'student'
                                    ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${selectedRole === 'student' ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-500 group-hover:text-zinc-900'}`}>
                                    <User className="w-6 h-6" />
                                </div>
                                <span className={`font-bold tracking-tight transition-colors ${selectedRole === 'student' ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-900'}`}>학생</span>
                                {selectedRole === 'student' && (
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                성함
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
                                        학번
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
                                        학교
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
                                    학과
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
                                비밀번호
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
                            <p className="text-[10px] text-zinc-400 ml-1">영문, 숫자, 특수문자만 사용 가능</p>
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                비밀번호 확인
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
                                    Agora 시작하기
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
                        이미 계정이 있으신가요?{' '}
                        <Link
                            href="/login"
                            className="text-zinc-900 font-bold hover:text-primary underline-offset-4 hover:underline transition-colors"
                        >
                            로그인
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
