'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, User, GraduationCap, Building } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const onboardingSchema = z.object({
    name: z.string().min(2, '이름을 입력해주세요'),
    role: z.enum(['instructor', 'student']),
    studentNumber: z.string().optional(),
    school: z.string().optional(),
    department: z.string().optional(),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

export default function OnboardingPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'instructor' | 'student'>('student')
    const [userEmail, setUserEmail] = useState<string>('')
    const [userId, setUserId] = useState<string>('')

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<OnboardingForm>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            role: 'student',
        },
    })

    useEffect(() => {
        const checkUser = async () => {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            setUserEmail(user.email || '')
            setUserId(user.id)

            // Pre-fill name if available in metadata
            if (user.user_metadata?.name || user.user_metadata?.full_name) {
                setValue('name', user.user_metadata.name || user.user_metadata.full_name)
            }
        }

        checkUser()
    }, [router, setValue])

    const onSubmit = async (data: OnboardingForm) => {
        setIsLoading(true)
        try {
            // Use server-side API route to bypass RLS and create profile
            const profileResponse = await fetch('/api/auth/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: userId,
                    email: userEmail,
                    name: data.name,
                    role: data.role,
                    student_number: data.studentNumber || null,
                    school: data.school || null,
                    department: data.department || null,
                }),
            })

            if (!profileResponse.ok) {
                const errorData = await profileResponse.json()
                throw new Error(errorData.error || '프로필 생성 실패')
            }

            toast.success('환영합니다! 시작할 준비가 되었습니다.')

            // Redirect based on role
            if (data.role === 'instructor') {
                router.push('/instructor')
            } else {
                router.push('/student')
            }
            router.refresh()

        } catch (error) {
            console.error('Onboarding error:', error)
            toast.error('설정 중 오류가 발생했습니다. 다시 시도해주세요.')
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
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">추가 정보 입력</span>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">거의 다 왔습니다!</h2>
                    <p className="text-zinc-600">
                        원활한 서비스 이용을 위해 몇 가지 정보를 알려주세요
                    </p>
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

                    <div className="space-y-6">
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

                        {/* Student-specific fields */}
                        <motion.div
                            initial={false}
                            animate={{
                                height: selectedRole === 'student' ? 'auto' : 0,
                                opacity: selectedRole === 'student' ? 1 : 0,
                                marginBottom: selectedRole === 'student' ? 24 : 0
                            }}
                            style={{ overflow: 'hidden' }}
                            className="space-y-6"
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
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
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
            </motion.div>
        </div>
    )
}
