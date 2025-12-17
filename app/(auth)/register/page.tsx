'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock, User, GraduationCap, Building } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const registerSchema = z.object({
    name: z.string().min(2, '이름을 입력해주세요'),
    email: z.string().email('올바른 이메일을 입력해주세요'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
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

export default function RegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'instructor' | 'student'>('student')

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'student',
        },
    })

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        role: data.role,
                    },
                },
            })

            if (authError) {
                toast.error(authError.message)
                return
            }

            if (authData.user) {
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
                    toast.error(`프로필 생성 오류: ${errorData.error || '알 수 없는 오류'}`)
                    return
                }
            }

            toast.success('회원가입이 완료되었습니다! 이메일을 확인해주세요.')
            router.push('/confirm-email')
        } catch (error) {
            toast.error('회원가입 중 오류가 발생했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Header */}
            <div className="mb-8">
                <div className="tag mb-4">시작하기</div>
                <h2
                    className="text-3xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    회원가입
                </h2>
                <p className="text-muted-foreground">
                    Agora와 함께 토론의 새로운 장을 열어보세요
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Role Selection */}
                <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider mb-3">
                        역할 선택
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRole('instructor')
                                setValue('role', 'instructor')
                            }}
                            className={`p-4 border-2 transition-all flex flex-col items-center gap-2 ${selectedRole === 'instructor'
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border hover:border-foreground'
                                }`}
                        >
                            <GraduationCap className="w-6 h-6" />
                            <span className="font-semibold">교수 / 강사</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRole('student')
                                setValue('role', 'student')
                            }}
                            className={`p-4 border-2 transition-all flex flex-col items-center gap-2 ${selectedRole === 'student'
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border hover:border-foreground'
                                }`}
                        >
                            <User className="w-6 h-6" />
                            <span className="font-semibold">학생</span>
                        </button>
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        이름
                    </label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="홍길동"
                            className="input-editorial with-icon"
                            {...register('name')}
                        />
                    </div>
                    {errors.name && (
                        <p className="mt-2 text-sm text-[hsl(var(--coral))]">{errors.name.message}</p>
                    )}
                </div>

                {/* Email */}
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

                {/* Student-specific fields */}
                {selectedRole === 'student' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                                    학번
                                </label>
                                <input
                                    type="text"
                                    placeholder="20231234"
                                    className="input-editorial"
                                    {...register('studentNumber')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                                    학교
                                </label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="홍익대학교"
                                        className="input-editorial with-icon"
                                        {...register('school')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 학과 입력 */}
                        <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                                학과
                            </label>
                            <div className="relative">
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="컴퓨터공학과"
                                    className="input-editorial with-icon"
                                    {...register('department')}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Password */}
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

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        비밀번호 확인
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="input-editorial with-icon"
                            {...register('confirmPassword')}
                        />
                    </div>
                    {errors.confirmPassword && (
                        <p className="mt-2 text-sm text-[hsl(var(--coral))]">{errors.confirmPassword.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-brutal-fill w-full flex items-center justify-center gap-2 mt-8"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            회원가입
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-8 border-t-2 border-border text-center">
                <p className="text-muted-foreground">
                    이미 계정이 있으신가요?{' '}
                    <Link
                        href="/login"
                        className="text-foreground font-semibold hover:text-[hsl(var(--coral))] transition-colors"
                    >
                        로그인
                    </Link>
                </p>
            </div>
        </motion.div>
    )
}
