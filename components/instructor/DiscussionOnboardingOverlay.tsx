import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Users, Monitor, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import QRCode from 'react-qr-code'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface DiscussionOnboardingOverlayProps {
    className?: string
    joinCode: string
    title: string
    onClose: () => void
    count: number
}

export function DiscussionOnboardingOverlay({
    className,
    joinCode,
    title,
    onClose,
    count
}: DiscussionOnboardingOverlayProps) {
    const t = useTranslations('Instructor.DiscussionDetail.onboarding')
    const tCommon = useTranslations('Instructor.DiscussionDetail')
    const [joinUrl, setJoinUrl] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setJoinUrl(`${window.location.origin}/join/${joinCode}`)
        }
    }, [joinCode])

    const copyUrl = () => {
        navigator.clipboard.writeText(joinUrl)
        toast.success(tCommon('toasts.urlCopied'))
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />

            {/* Main Card */}
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
            >
                {/* Decorative background blobs inside card */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[100px] pointer-events-none" />

                <div className="p-12 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-12">
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl font-black tracking-tight text-zinc-900 mb-2"
                        >
                            {t('title')}
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 font-medium"
                        >
                            {title}
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-2 gap-12 items-center">
                        {/* Left Column: QR Code */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center"
                        >
                            <div className="bg-white p-4 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-zinc-100 mb-6">
                                <div className="w-64 h-64 bg-white flex items-center justify-center">
                                    {joinUrl && (
                                        <QRCode
                                            value={joinUrl}
                                            size={256}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                    )}
                                </div>
                            </div>
                            <p className="font-bold text-zinc-900 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                                {t('scanQr')}
                            </p>
                        </motion.div>

                        {/* Right Column: Code & Actions */}
                        <div className="space-y-8">
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <p className="font-bold text-zinc-900 flex items-center gap-2 mb-4">
                                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                                    {t('inputCode')}
                                </p>
                                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-center">
                                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">JOIN CODE</p>
                                    <p className="text-5xl font-black text-zinc-900 tracking-wider mb-4 font-mono">{joinCode}</p>
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            onClick={copyUrl}
                                            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors flex items-center gap-2"
                                        >
                                            <Copy className="w-4 h-4" />
                                            URL
                                        </button>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-indigo-900">
                                                {count > 0 ? t('joined', { count }) : t('waiting')}
                                            </p>
                                            {count > 0 && <p className="text-xs text-indigo-600 font-medium">Ready to start</p>}
                                        </div>
                                    </div>
                                    {count > 0 && (
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-zinc-900/10"
                                >
                                    <Monitor className="w-5 h-5" />
                                    {t('startMonitoring')}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="bg-zinc-50 border-t border-zinc-100 p-4 text-center">
                    <p className="text-zinc-400 text-sm font-medium">
                        Students can join at <span className="text-zinc-600 font-bold font-mono">quest-on-agora.vercel.app/join</span>
                    </p>
                </div>
            </motion.div>
        </motion.div>
    )
}
