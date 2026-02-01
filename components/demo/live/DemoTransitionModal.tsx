'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, UserCheck, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface DemoTransitionModalProps {
  isOpen: boolean
  onContinue: () => void
  onSkip: () => void
}

export function DemoTransitionModal({ isOpen, onContinue, onSkip }: DemoTransitionModalProps) {
  const t = useTranslations('LiveDemo.transition')

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 max-w-md w-full bg-white rounded-[2rem] p-8 shadow-2xl text-center"
          >
            {/* Success Icon */}
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
              <UserCheck className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-zinc-900 mb-3">
              {t('title')}
            </h2>
            <p className="text-zinc-600 mb-8 leading-relaxed">
              {t('description')}
            </p>

            <div className="space-y-3">
              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Users className="w-5 h-5" />
                {t('continue')}
                <ArrowRight className="w-5 h-5" />
              </button>

              <Link
                href="/register"
                onClick={onSkip}
                className="block w-full px-6 py-4 border border-zinc-200 text-zinc-700 font-bold rounded-full hover:bg-zinc-50 transition-all"
              >
                {t('skip')}
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
