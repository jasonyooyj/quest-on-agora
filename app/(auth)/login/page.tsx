'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Mail, Lock } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const loginSchema = z.object({
    email: z.string().email('올바른 이메일을 입력해주세요'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const redirect = searchParams.get('redirect') || '/instructor'

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginForm) => {
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
