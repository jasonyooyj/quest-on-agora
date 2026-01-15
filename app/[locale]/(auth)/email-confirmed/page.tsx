'use client'

import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

export default function EmailConfirmedPage() {
    const t = useTranslations('Auth.EmailConfirmed')

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo or Icon */}
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center rotate-3 border-4 border-white shadow-xl">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                </div>

                <div className="brutal-box p-8 bg-white/80 backdrop-blur-xl space-y-8 text-center">
                    <div className="space-y-4">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest">
                            {t('tag')}
                        </div>
                        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
                            {t('title')}
                        </h1>
                        <p className="text-zinc-600 font-medium leading-relaxed whitespace-pre-wrap">
                            {t('description')}
                        </p>
                    </div>

                    <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-sm text-zinc-500 font-medium">
                            {t('welcome')}
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link
                            href="/login"
                            className="btn-brutal h-14 w-full flex items-center justify-center gap-2 text-lg"
                        >
                            {t('loginButton')}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
