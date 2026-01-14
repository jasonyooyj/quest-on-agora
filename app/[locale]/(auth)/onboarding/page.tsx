'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, User, GraduationCap, Building } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

function OnboardingContent() {
    const t = useTranslations('Auth.Onboarding')
    const tVal = useTranslations('Auth.Validation')
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'instructor' | 'student'>('student')

    const onboardingSchema = z.object({
        role: z.enum(['instructor', 'student']),
        name: z.string().min(2, tVal('nameRequired')),
        studentNumber: z.string().optional(),
        school: z.string().optional(),
        department: z.string().optional(),
    })

    type OnboardingForm = z.infer<typeof onboardingSchema>

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<OnboardingForm>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            role: 'student',
        },
    })

    const onSubmit = async (data: OnboardingForm) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: data.role,
                    name: data.name,
                    student_number: data.studentNumber || null,
                    school: data.school || null,
                    department: data.department || null,
                }),
            })

            if (!response.ok) {
                throw new Error('Onboarding failed')
            }

            toast.success(t('success'))
            
            // Redirect based on role
            if (data.role === 'instructor') {
                router.push('/instructor')
            } else {
                router.push('/student')
            }
            router.refresh()
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

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Role Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 text-center block">
                            {t('roleLabel')}
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
                                <span className={`font-bold tracking-tight transition-colors ${selectedRole === 'instructor' ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-900'}`}>{t('instructor')}</span>
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
                                <span className={`font-bold tracking-tight transition-colors ${selectedRole === 'student' ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-900'}`}>{t('student')}</span>
                                {selectedRole === 'student' && (
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
                                )}
                            </button>
                        </div>
                    </div>

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
                                    {t('submitBtn')}
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

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    )
}
