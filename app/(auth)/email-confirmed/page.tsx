'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function EmailConfirmedPage() {
    // 이메일 확인 완료 시 localStorage 정리
    useEffect(() => {
        localStorage.removeItem('pendingConfirmEmail')
        localStorage.removeItem('lastEmailSentAt')
    }, [])

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute inset-0 z-0 bg-background pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-green-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
                <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-emerald-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-lg glass-panel p-10 md:p-12 shadow-xl bg-white/90 border-zinc-200"
            >
                {/* Success Icon */}
                <div className="mb-8 flex justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25"
                    >
                        <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                </div>

                {/* Header */}
                <div className="mb-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200 mb-6"
                    >
                        <Sparkles className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] font-bold text-green-600 tracking-widest uppercase">확인 완료</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-3xl font-bold tracking-tight text-zinc-900 mb-3"
                    >
                        이메일 확인 완료!
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-zinc-600 leading-relaxed"
                    >
                        이메일이 성공적으로 확인되었습니다.<br />
                        이제 로그인하여 Agora를 시작할 수 있습니다.
                    </motion.p>
                </div>

                {/* Success Message Box */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mb-8 p-4 rounded-xl bg-green-50 border border-green-100 text-center"
                >
                    <p className="text-sm text-green-700 font-medium">
                        가입을 환영합니다! 토론의 새로운 장을 열어보세요.
                    </p>
                </motion.div>

                {/* Login Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <Link
                        href="/login"
                        className="group relative w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full overflow-hidden shadow-lg transition-all hover:shadow-[0_4px_20px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            로그인하기
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    )
}
