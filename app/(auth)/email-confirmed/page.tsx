'use client'

import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function EmailConfirmedPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
        >
            {/* Success Icon */}
            <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-10 h-10" />
                </div>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="tag mb-4">완료</div>
                <h2
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    이메일 확인 완료!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    이메일이 성공적으로 확인되었습니다. 이제 로그인하여 Agora를 시작할 수 있습니다.
                </p>
            </div>

            {/* Login Button */}
            <Link
                href="/login"
                className="btn-brutal-fill inline-flex items-center gap-2"
            >
                로그인하기
                <ArrowRight className="w-4 h-4" />
            </Link>
        </motion.div>
    )
}
