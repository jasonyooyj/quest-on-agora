'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronRight,
    ChevronLeft,
    X,
    Settings,
    UserPlus,
    MessageSquare,
    BarChart2,
    CheckCircle2
} from 'lucide-react'
import Image from 'next/image'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

const steps = [
    {
        id: 1,
        title: "토론 생성",
        subtitle: "Instructor Setup",
        description: "교수님은 토론 주제를 설정하고, 찬성/반대 입장의 핵심 쟁점을 구성합니다. 단 몇 번의 클릭으로 스마트한 토론의 장이 열립니다.",
        icon: Settings,
        image: "/demo/step1.png"
    },
    {
        id: 2,
        title: "학생 참여",
        subtitle: "Student Participation",
        description: "학생들은 링크를 통해 입장하여 자신의 입장을 정하고 근거를 작성합니다. 실시간으로 업데이트되는 토론장에서 동료들의 의견을 확인하세요.",
        icon: UserPlus,
        image: "/demo/step2.png"
    },
    {
        id: 3,
        title: "AI 소크라테스",
        subtitle: "AI Intervention",
        description: "단순한 의견 제시에 그치지 않습니다. AI가 학생의 논리적 허점을 짚어주는 질문을 던져 비판적 사고를 확장시킵니다.",
        icon: MessageSquare,
        image: "/demo/step3.png"
    },
    {
        id: 4,
        title: "실시간 분석",
        subtitle: "Analysis & Feedback",
        description: "교수님은 학생들의 논리 발전 과정과 참여도를 한눈에 파악합니다. 데이터에 기반한 정교한 피드백으로 토론의 질을 높이세요.",
        icon: BarChart2,
        image: "/demo/step4.png"
    }
]

interface InteractiveDemoProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function InteractiveDemo({ isOpen, onOpenChange }: InteractiveDemoProps) {
    const [currentStep, setCurrentStep] = useState(0)

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
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

    const step = steps[currentStep]

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-none max-w-[1600px] w-[96vw] h-[90vh] max-h-[900px] p-0 overflow-hidden border-2 md:border-4 border-foreground rounded-none bg-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
                    {/* Left: Content */}
                    <div className="flex-[1.1] p-4 sm:p-6 md:p-12 lg:p-20 flex flex-col justify-between border-b-2 md:border-b-4 lg:border-b-0 lg:border-r-4 border-foreground bg-background">
                        <div>
                            <div className="flex items-center justify-between mb-4 md:mb-8">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-foreground text-background flex items-center justify-center font-bold text-lg md:text-xl border-2 border-foreground">
                                        0{step.id}
                                    </div>
                                    <div className="hidden sm:block h-0.5 w-8 md:w-12 bg-foreground/20" />
                                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                        Step {step.id} / {steps.length}
                                    </span>
                                </div>
                            </div>

                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 bg-[hsl(var(--coral))] text-white text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 md:mb-4 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <step.icon className="w-3 h-3" />
                                    {step.subtitle}
                                </div>
                                <DialogTitle className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black mb-4 md:mb-10 leading-tight break-keep" style={{ fontFamily: 'var(--font-display)' }}>
                                    {step.title}
                                </DialogTitle>
                                <DialogDescription className="text-base sm:text-lg md:text-2xl lg:text-3xl text-muted-foreground leading-relaxed break-keep">
                                    {step.description}
                                </DialogDescription>
                            </motion.div>
                        </div>

                        <div className="mt-6 md:mt-12 flex flex-col gap-4 md:gap-6">
                            <div className="flex items-center gap-2 md:gap-4">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                    className={`p-3 md:p-4 border-2 border-foreground transition-all flex items-center justify-center min-w-[48px] min-h-[48px] ${currentStep === 0
                                        ? 'opacity-30 cursor-not-allowed'
                                        : 'bg-background hover:bg-foreground hover:text-background active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                        }`}
                                >
                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="flex-1 p-3 md:p-4 bg-[hsl(var(--coral))] text-white font-black text-base md:text-lg border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 min-h-[48px]"
                                >
                                    {currentStep === steps.length - 1 ? (
                                        <>
                                            시작하기
                                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                                        </>
                                    ) : (
                                        <>
                                            다음 단계
                                            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex gap-1 md:gap-2">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 md:h-2 flex-1 border-2 border-foreground transition-all ${i <= currentStep ? 'bg-foreground' : 'bg-background'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Visual - Hidden on small mobile, shown on larger screens */}
                    <div className="hidden sm:flex flex-1 bg-[hsl(var(--sage))] p-4 md:p-8 lg:p-12 relative items-center justify-center overflow-hidden min-h-[200px]">
                        {/* Background elements */}
                        <div className="absolute inset-0 grid-pattern opacity-10" />
                        <div className="hidden md:block absolute top-12 right-12 w-32 h-32 border-4 border-foreground/10 rotate-12" />
                        <div className="hidden md:block absolute bottom-12 left-12 w-24 h-24 bg-foreground/5 -rotate-6" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 1.1, rotate: 2 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="relative z-10 w-full max-w-md md:max-w-2xl shadow-[15px_15px_0px_0px_rgba(0,0,0,0.1)] md:shadow-[30px_30px_0px_0px_rgba(0,0,0,0.1)] border-2 md:border-4 border-foreground bg-background"
                            >
                                <div className="aspect-square relative overflow-hidden bg-card">
                                    <Image
                                        src={step.image}
                                        alt={step.title}
                                        fill
                                        className="object-cover"
                                        unoptimized // For development/local paths
                                    />

                                    {/* Overlay for aesthetic */}
                                    <div className="absolute inset-0 border-8 border-foreground/5 pointer-events-none" />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Floating indicator */}
                        <div className="hidden md:block absolute bottom-4 md:bottom-8 right-4 md:right-8 px-3 md:px-4 py-1.5 md:py-2 bg-foreground text-background font-bold text-[10px] md:text-xs uppercase tracking-widest border-2 border-foreground">
                            Live Preview
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
