'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowRight, Lock } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const updatePasswordSchema = z.object({
    password: z.string()
        .min(6, '비밀번호는 6자 이상이어야 합니다')
        .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, '비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
})

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>

export default function UpdatePasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<UpdatePasswordFormData>({
        resolver: zodResolver(updatePasswordSchema),
    })

    const handlePasswordChange = (name: 'password' | 'confirmPassword', e: React.ChangeEvent<HTMLInputElement>) => {
        const filtered = e.target.value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, '')
        setValue(name, filtered)
    }

    const onSubmit = async (data: UpdatePasswordFormData) => {
        setIsLoading(true)
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.auth.updateUser({
                password: data.password
            })

            if (error) {
                toast.error(error.message)
                return
            }

            toast.success('비밀번호가 변경되었습니다')
            router.push('/login')
        } catch (error) {
            toast.error('오류가 발생했습니다')
        } finally {
            setIsLoading(false)
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
                    <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">새 비밀번호 설정</h2>
                    <p className="text-zinc-600">
                        계정 보호를 위해<br />
                        새로운 비밀번호를 입력해주세요
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                            새 비밀번호
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="ios-input pl-12 h-14"
                                {...register('password', {
                                    onChange: (e) => handlePasswordChange('password', e)
                                })}
                            />
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>
                        )}
                    </div>

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
                                    onChange: (e) => handlePasswordChange('confirmPassword', e)
                                })}
                            />
                        </div>
                        {errors.confirmPassword && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.confirmPassword.message}</p>
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
                                    비밀번호 변경하기
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
