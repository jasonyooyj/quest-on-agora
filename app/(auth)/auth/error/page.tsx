'use client'

import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message') || '인증 과정에서 오류가 발생했습니다'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
        >
            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 bg-red-500 text-white flex items-center justify-center">
                    <AlertCircle className="w-10 h-10" />
                </div>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="tag mb-4">오류</div>
                <h2
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    문제가 발생했습니다
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    {message}
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href="/login"
                    className="btn-brutal-fill inline-flex items-center justify-center gap-2"
                >
                    로그인으로 돌아가기
                    <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                    href="/register"
                    className="btn-brutal inline-flex items-center justify-center gap-2"
                >
                    회원가입
                </Link>
            </div>
        </motion.div>
    )
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="text-center">로딩 중...</div>}>
            <ErrorContent />
        </Suspense>
    )
}
