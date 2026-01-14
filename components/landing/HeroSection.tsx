"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import InteractiveDemo from "@/components/InteractiveDemo";
import { HERO_CONTENT } from "@/lib/constants/landing-content";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

export function HeroSection() {
    const t = useTranslations('Hero');
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    // Disable scroll-triggered transforms on mobile for performance
    const heroOpacity = useTransform(scrollYProgress, [0, 0.9], isMobile ? [1, 1] : [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.9], isMobile ? [1, 1] : [1, 0.95]);

    const logs = [
        { student: 4, action: t('dashboard.logs.0.action'), time: t('dashboard.logs.0.time') },
        { student: 8, action: t('dashboard.logs.1.action'), time: t('dashboard.logs.1.time') },
        { student: 12, action: t('dashboard.logs.2.action'), time: t('dashboard.logs.2.time') },
    ];

    return (
        <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Spatial Background Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-background">
                {/* Soft Gradient Orbs */}
                <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-[128px] animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-4000" />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,black,rgba(0,0,0,0))]" />
            </div>

            <motion.div
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col items-center text-center"
            >
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel mb-8"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    <span className="text-xs font-medium text-zinc-600 tracking-wide uppercase">
                        {t('tag')}
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]"
                >
                    <span className="block text-zinc-900">{t('titlePrefix')}</span>
                    <span className="block text-gradient-brand pb-2">{t('titleSuffix')}</span>
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    {t('description')}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-4 mb-20"
                >
                    <Link href="/register">
                        <button className="group relative px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-full overflow-hidden shadow-[0_4px_20px_rgba(99,102,241,0.3)] transition-all hover:shadow-[0_4px_30px_rgba(99,102,241,0.5)] hover:-translate-y-1">
                            <span className="relative z-10 flex items-center gap-2">
                                {t('ctaPrimary')}
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </Link>
                    <button
                        onClick={() => setIsDemoOpen(true)}
                        className="group px-8 py-4 glass-panel text-zinc-700 font-semibold rounded-full transition-all hover:bg-zinc-100 hover:-translate-y-1"
                    >
                        <span className="flex items-center gap-2">
                            {t('ctaSecondary')}
                            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                    </button>
                </motion.div>

                <InteractiveDemo
                    isOpen={isDemoOpen}
                    onOpenChange={setIsDemoOpen}
                />

                {/* Dashboard Preview (Spatial Window) */}
                <motion.div
                    initial={{ opacity: 0, y: 40, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 1.2, delay: 0.5, type: "spring", bounce: 0.2 }}
                    className="relative w-full max-w-5xl mx-auto perspective-1200"
                >
                    <div className="relative rounded-[2rem] overflow-hidden glass-panel border border-zinc-200 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] bg-white/90 backdrop-blur-3xl">
                        {/* macOS Spatial Header */}
                        <div className="h-14 border-b border-zinc-200 bg-zinc-50/80 flex items-center px-6 gap-2 backdrop-blur-md">
                            <div className="flex gap-2 group">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-inner" />
                                <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-inner" />
                                <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-inner" />
                            </div>
                            <div className="flex-1 text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs text-zinc-600 font-medium tracking-wide">{t('dashboard.badge')}</span>
                                </div>
                            </div>
                            <div className="w-16" /> {/* Spacer for centering */}
                        </div>

                        {/* Dashboard Mockup Content (Spatial) */}
                        <div className="p-8 md:p-10 min-h-[450px] flex flex-col gap-6 bg-gradient-to-b from-white/50 to-zinc-50/80">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-8 rounded-3xl bg-white border border-zinc-200 hover:bg-zinc-50 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl">
                                    <div className="text-sm text-zinc-500 mb-3 group-hover:text-zinc-700 transition-colors">{t('dashboard.participationRate')}</div>
                                    <div className="text-5xl font-bold text-zinc-900 mb-6 tracking-tight">87<span className="text-2xl text-zinc-400 font-normal">%</span></div>
                                    <div className="h-4 bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200">
                                        <div className="h-full w-[87%] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative overflow-hidden shadow-[0_2px_8px_rgba(168,85,247,0.3)]">
                                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 rounded-3xl bg-white border border-zinc-200 hover:bg-zinc-50 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl">
                                    <div className="text-sm text-zinc-500 mb-3 group-hover:text-zinc-700 transition-colors">{t('dashboard.activeSessions')}</div>
                                    <div className="text-5xl font-bold text-zinc-900 mb-6 tracking-tight">12<span className="text-2xl text-zinc-400 font-normal">{t('dashboard.countUnit')}</span></div>
                                    <div className="flex -space-x-4 pl-2">
                                        {HERO_CONTENT.avatars.map((src, i) => (
                                            <div key={i} className={`w-12 h-12 rounded-full border-2 border-white relative overflow-hidden z-${(i + 1) * 10} shadow-lg transform group-hover:translate-x-2 transition-transform duration-300 bg-zinc-100`}>
                                                <img
                                                    src={src}
                                                    alt={`Student ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-8 rounded-3xl bg-white border border-zinc-200 flex flex-col hover:bg-zinc-50 transition-all duration-300 hover:shadow-xl">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="text-sm text-zinc-500">{t('dashboard.logTitle')}</div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                        </span>
                                        <span className="text-xs text-primary font-bold tracking-wide">{t('dashboard.logStatus')}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {logs.map((log, i) => (
                                        <div key={i} className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:bg-white hover:border-zinc-300 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm text-zinc-700 font-medium group-hover:text-zinc-900 transition-colors">
                                                    {t('dashboard.logItem', { student: log.student, action: log.action })}
                                                </div>
                                                <div className="text-xs text-zinc-400 mt-1">{log.time}</div>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-primary transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Glow behind the dashboard */}
                    <div className="absolute -inset-10 bg-indigo-200/30 blur-[100px] -z-10 rounded-[4rem] opacity-50 animate-pulse-slow" />
                </motion.div>

            </motion.div>
        </section>
    );
}
