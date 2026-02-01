'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface DemoCompletionCTAProps {
  onReset?: () => void
}

export function DemoCompletionCTA({ onReset }: DemoCompletionCTAProps) {
  const t = useTranslations('LiveDemo.completion')

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-white to-zinc-50">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/30 rounded-full filter blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        {/* Celebration Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-300"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-zinc-600 mb-10 leading-relaxed">
          {t('description')}
        </p>

        <div className="space-y-4">
          <Link
            href="/register"
            className="group flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg rounded-full shadow-xl shadow-indigo-200 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            {t('signUp')}
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/pricing"
            className="flex items-center justify-center gap-3 px-8 py-5 border-2 border-zinc-200 text-zinc-700 font-bold text-lg rounded-full hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            <CreditCard className="w-5 h-5" />
            {t('pricing')}
          </Link>

          {onReset && (
            <button
              onClick={onReset}
              className="text-zinc-500 hover:text-zinc-700 font-medium text-sm transition-colors"
            >
              {t('tryAgain') || '다시 체험하기'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
