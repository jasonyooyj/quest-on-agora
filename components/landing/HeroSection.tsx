"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Circle } from "lucide-react";
import InteractiveDemo from "@/components/InteractiveDemo";
import { HERO_CONTENT } from "@/lib/constants/landing-content";

export function HeroSection() {
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

    return (
        <motion.section
            ref={containerRef}
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="relative min-h-screen flex items-center pt-16"
        >
            <div className="absolute inset-0 grid-pattern" />

            {/* Decorative Elements */}
            <div className="absolute top-32 right-12 w-24 h-24 border-2 border-foreground opacity-20" />
            <div className="absolute bottom-32 left-12 w-16 h-16 bg-[hsl(var(--coral))] opacity-30" />
            <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-foreground" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24">
                <div className="grid lg:grid-cols-12 gap-12 items-center">
                    {/* Left Content */}
                    <div className="lg:col-span-7">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="tag mb-8">{HERO_CONTENT.tag}</div>

                            <h1 className="mb-6 accent-line">
                                <span className="block">{HERO_CONTENT.titlePrefix}</span>
                                <span className="block text-[hsl(var(--coral))]">{HERO_CONTENT.titleSuffix}</span>
                            </h1>

                            <p className="text-xl lg:text-2xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
                                {HERO_CONTENT.description}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link href="/register">
                                    <button className="btn-brutal-fill flex items-center gap-2">
                                        {HERO_CONTENT.ctaPrimary}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </Link>
                                <button
                                    onClick={() => setIsDemoOpen(true)}
                                    className="btn-brutal flex items-center gap-2"
                                >
                                    {HERO_CONTENT.ctaSecondary}
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                                <InteractiveDemo
                                    isOpen={isDemoOpen}
                                    onOpenChange={setIsDemoOpen}
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Content - Preview */}
                    <motion.div
                        className="lg:col-span-5"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                            duration: 0.8,
                            delay: 0.2,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <div className="brutal-box bg-card p-6 relative">
                            {/* Decorative corner */}
                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-[hsl(var(--coral))]" />

                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                실시간 입장 분포
                            </div>

                            <div className="flex gap-3 mb-6">
                                <div className="flex-1">
                                    <div className="h-32 bg-[hsl(var(--sage))] relative">
                                        <div className="absolute bottom-2 left-2 text-white text-sm font-semibold">
                                            찬성 45%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="h-24 bg-[hsl(var(--coral))] relative">
                                        <div className="absolute bottom-2 left-2 text-white text-sm font-semibold">
                                            반대 35%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="h-16 bg-foreground/30 relative">
                                        <div className="absolute bottom-2 left-2 text-foreground text-sm font-semibold">
                                            중립 20%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t-2 border-foreground pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Circle className="w-2 h-2 fill-[hsl(var(--sage))] text-[hsl(var(--sage))]" />
                                    <span className="text-sm">학생 12 — 새 근거 추가</span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Circle className="w-2 h-2 fill-[hsl(var(--coral))] text-[hsl(var(--coral))]" />
                                    <span className="text-sm">학생 7 — AI와 대화 중</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Circle className="w-2 h-2 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                                    <span className="text-sm">학생 3 — 도움 요청</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Scroll
                </span>
                <div className="w-px h-12 bg-foreground/30" />
            </div>
        </motion.section>
    );
}
