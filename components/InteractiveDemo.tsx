'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
    ChevronRight,
    ChevronLeft,
    Settings,
    UserPlus,
    MessageSquare,
    BarChart2,
    CheckCircle2,
    X
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    DemoStep1Creation,
    DemoStep2Participation,
    DemoStep3Socratic,
    DemoStep4Dashboard
} from '@/components/demo'

const stepComponents = [
    { id: 1, icon: Settings, component: DemoStep1Creation },
    { id: 2, icon: UserPlus, component: DemoStep2Participation },
    { id: 3, icon: MessageSquare, component: DemoStep3Socratic },
    { id: 4, icon: BarChart2, component: DemoStep4Dashboard }
]

interface InteractiveDemoProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function InteractiveDemo({ isOpen, onOpenChange }: InteractiveDemoProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const t = useTranslations('Demo')

    const handleNext = () => {
        if (currentStep < stepComponents.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            onOpenChange(false)
            setCurrentStep(0)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const stepConfig = stepComponents[currentStep]
    const stepId = stepConfig.id.toString() as '1' | '2' | '3' | '4'
    const step = {
        id: stepConfig.id,
        title: t(`steps.${stepId}.title`),
        subtitle: t(`steps.${stepId}.subtitle`),
        description: t(`steps.${stepId}.description`),
        icon: stepConfig.icon,
        component: stepConfig.component
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-none max-w-[1400px] w-[95vw] h-[85vh] max-h-[800px] p-0 overflow-hidden border border-zinc-200 rounded-[2rem] bg-white/95 backdrop-blur-xl shadow-2xl">
                {/* Background blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] -mr-48 -mt-48 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/40 rounded-full filter blur-[100px] -ml-32 -mb-32 pointer-events-none" />

                <div className="flex flex-col lg:flex-row h-full relative z-10">
                    {/* Left: Content */}
                    <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white/50">
                        <div>
                            {/* Step indicator */}
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    {step.id}
                                </div>
                                <div className="flex items-center gap-2">
                                    {stepComponents.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentStep(i)}
                                            className={`w-8 h-1.5 rounded-full transition-all ${
                                                i === currentStep
                                                    ? 'bg-primary'
                                                    : i < currentStep
                                                        ? 'bg-primary/40'
                                                        : 'bg-zinc-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-auto">
                                    {step.id} / {stepComponents.length}
                                </span>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    {/* Subtitle badge */}
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
                                        <step.icon className="w-3.5 h-3.5" />
                                        {step.subtitle}
                                    </div>

                                    {/* Title */}
                                    <DialogTitle className="text-4xl lg:text-5xl font-bold text-zinc-900 mb-6 tracking-tight">
                                        {step.title}
                                    </DialogTitle>

                                    {/* Description */}
                                    <DialogDescription className="text-lg lg:text-xl text-zinc-500 leading-relaxed font-medium">
                                        {step.description}
                                    </DialogDescription>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Navigation */}
                        <div className="mt-8 flex items-center gap-3">
                            <button
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                className={`w-12 h-12 rounded-xl border border-zinc-200 flex items-center justify-center transition-all ${
                                    currentStep === 0
                                        ? 'opacity-30 cursor-not-allowed'
                                        : 'hover:bg-zinc-100 active:scale-95'
                                }`}
                            >
                                <ChevronLeft className="w-5 h-5 text-zinc-600" />
                            </button>

                            <button
                                onClick={handleNext}
                                className="flex-1 h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
                            >
                                {currentStep === stepComponents.length - 1 ? (
                                    <>
                                        {t('navigation.start')}
                                        <CheckCircle2 className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        {t('navigation.next')}
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right: Visual Preview */}
                    <div className="flex-[1.2] bg-zinc-50 p-6 lg:p-8 relative flex items-center justify-center overflow-hidden">
                        {/* Subtle background pattern */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)]" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="relative z-10 w-full max-w-lg"
                            >
                                <div className="rounded-2xl overflow-hidden bg-white border border-zinc-200 shadow-xl shadow-zinc-200/50">
                                    <div className="aspect-square relative overflow-hidden">
                                        <step.component />
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Live indicator */}
                        <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                Live Preview
                            </span>
                        </div>
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-all z-20"
                >
                    <X className="w-5 h-5 text-zinc-500" />
                </button>
            </DialogContent>
        </Dialog>
    )
}
