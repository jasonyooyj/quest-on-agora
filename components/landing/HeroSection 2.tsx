"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import InteractiveDemo from "@/components/InteractiveDemo";
import { HERO_CONTENT } from "@/lib/constants/landing-content";

export function HeroSection() {
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

    return (
        <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand-start/20 blur-[120px] rounded-full opacity-50 mix-blend-screen" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-brand-end/10 blur-[100px] rounded-full opacity-30 mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
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
                    <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">
                        {HERO_CONTENT.tag}
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]"
                >
                    <span className="block text-white">{HERO_CONTENT.titlePrefix}</span>
                    <span className="block text-gradient-brand pb-2">{HERO_CONTENT.titleSuffix}</span>
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    {HERO_CONTENT.description}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-4 mb-20"
                >
                    <Link href="/register">
                        <button className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-1">
                            <span className="relative z-10 flex items-center gap-2">
                                {HERO_CONTENT.ctaPrimary}
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </Link>
                    <button
                        onClick={() => setIsDemoOpen(true)}
                        className="group px-8 py-4 glass-panel text-white font-semibold rounded-full transition-all hover:bg-white/10 hover:-translate-y-1"
                    >
                        <span className="flex items-center gap-2">
                            {HERO_CONTENT.ctaSecondary}
                            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                    </button>
                </motion.div>

                <InteractiveDemo
                    isOpen={isDemoOpen}
                    onOpenChange={setIsDemoOpen}
                />

                {/* Dashboard Preview (Glassmorphism) */}
                <motion.div
                    initial={{ opacity: 0, y: 40, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 1.2, delay: 0.5, type: "spring", bounce: 0.2 }}
                    className="relative w-full max-w-5xl mx-auto perspective-1000"
                >
                    <div className="relative rounded-[2rem] overflow-hidden glass-panel border border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
                        {/* Fake Browser Header */}
                        <div className="h-12 border-b border-white/5 bg-zinc-900/50 flex items-center px-6 gap-2">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <div className="mx-auto text-xs text-zinc-500 font-mono tracking-widest opacity-50">AGORA DASHBOARD</div>
                        </div>

                        {/* Dashboard Mockup Content */}
                        <div className="p-8 md:p-10 bg-black/20 min-h-[450px] flex flex-col gap-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-8 rounded-3xl bg-zinc-800/30 border border-white/5 hover:bg-zinc-800/40 transition-colors group">
                                    <div className="text-sm text-zinc-400 mb-3 group-hover:text-zinc-300 transition-colors">실시간 참여율</div>
                                    <div className="text-4xl font-bold text-white mb-6">87<span className="text-2xl text-zinc-500 font-normal">%</span></div>
                                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full w-[87%] bg-gradient-to-r from-indigo-500 to-purple-500 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 rounded-3xl bg-zinc-800/30 border border-white/5 hover:bg-zinc-800/40 transition-colors group">
                                    <div className="text-sm text-zinc-400 mb-3 group-hover:text-zinc-300 transition-colors">활성 토론 세션</div>
                                    <div className="text-4xl font-bold text-white mb-6">12<span className="text-2xl text-zinc-500 font-normal">개</span></div>
                                    <div className="flex -space-x-4 pl-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`w-10 h-10 rounded-full border-4 border-zinc-900 bg-zinc-700 z-${i * 10} shadow-lg`} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-8 rounded-3xl bg-zinc-800/30 border border-white/5 flex flex-col hover:bg-zinc-800/40 transition-colors">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="text-sm text-zinc-400">최근 AI 분석 로그</div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        <span className="text-xs text-indigo-300 font-medium">Live Analysis</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-5 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-default group">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm text-zinc-200 font-medium group-hover:text-white transition-colors">학생 {i * 4}의 논리적 오류 지적 완료</div>
                                                <div className="text-xs text-zinc-500 mt-1">방금 전</div>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-indigo-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Glow behind the dashboard */}
                    <div className="absolute -inset-10 bg-indigo-500/15 blur-[100px] -z-10 rounded-[4rem] opacity-50 animate-pulse-slow" />
                </motion.div>

            </motion.div>
        </section>
    );
}
