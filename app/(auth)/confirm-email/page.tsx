'use client'

import { motion } from 'framer-motion'
import { Mail, ArrowRight, Inbox, Search, MousePointer } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmEmailPage() {
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
                {/* Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">이메일 확인</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
                        이메일을 확인해주세요
                    </h2>
                    <p className="text-zinc-600 leading-relaxed">
                        회원가입이 거의 완료되었습니다!<br />
                        입력하신 이메일 주소로 확인 링크를 보내드렸습니다.
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-4 mb-10">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Inbox className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600">1단계</span>
                            </div>
                            <p className="text-sm text-zinc-700 font-medium">이메일 받은편지함을 확인하세요</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Search className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-600">2단계</span>
                            </div>
                            <p className="text-sm text-zinc-700 font-medium">Agora에서 온 이메일을 찾아주세요</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <MousePointer className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-green-600">3단계</span>
                            </div>
                            <p className="text-sm text-zinc-700 font-medium">"이메일 확인" 버튼을 클릭하세요</p>
                        </div>
                    </div>
                </div>

                {/* Tips */}
                <div className="text-center text-sm text-zinc-500 mb-8 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-amber-600">이메일이 보이지 않나요?</span>{' '}
                    스팸 폴더를 확인해보세요.
                </div>

                {/* Back to Login */}
                <Link
                    href="/login"
                    className="group relative w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full overflow-hidden shadow-lg transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        로그인 페이지로
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
            </motion.div>
        </div>
    )
}
