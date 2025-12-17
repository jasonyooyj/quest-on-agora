'use client'

import { motion } from 'framer-motion'
import { Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmEmailPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
        >
            {/* Icon */}
            <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 bg-foreground text-background flex items-center justify-center">
                    <Mail className="w-10 h-10" />
                </div>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="tag mb-4">이메일 확인</div>
                <h2
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    이메일을 확인해주세요
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    회원가입이 거의 완료되었습니다! 입력하신 이메일 주소로 확인 링크를 보내드렸습니다.
                    이메일의 링크를 클릭하여 가입을 완료해주세요.
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 border-2 border-border p-6 mb-8 text-left">
                <h3 className="font-semibold mb-3">다음 단계:</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                        <span className="font-bold text-foreground">1.</span>
                        이메일 받은편지함을 확인하세요
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-bold text-foreground">2.</span>
                        Agora에서 온 이메일을 찾아주세요
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-bold text-foreground">3.</span>
                        "이메일 확인" 버튼을 클릭하세요
                    </li>
                </ol>
            </div>

            {/* Tips */}
            <div className="text-sm text-muted-foreground mb-8">
                <p>이메일이 보이지 않나요? 스팸 폴더를 확인해보세요.</p>
            </div>

            {/* Back to Login */}
            <Link
                href="/login"
                className="btn-brutal-fill inline-flex items-center gap-2"
            >
                로그인 페이지로
                <ArrowRight className="w-4 h-4" />
            </Link>
        </motion.div>
    )
}
