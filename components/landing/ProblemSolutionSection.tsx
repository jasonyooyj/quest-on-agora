"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import { PROBLEMS_SOLUTIONS } from "@/lib/constants/landing-content";

export function ProblemSolutionSection() {
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-16">
                    <span className="tag">아고라인가요?</span>
                    <h2 className="mt-6 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        기존 토론 수업의 <span className="text-primary">한계를 넘어서</span>
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Problems */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                <X className="w-5 h-5 text-destructive" />
                            </div>
                            <h3 className="text-xl font-semibold text-muted-foreground/80">
                                기존 방식의 문제점
                            </h3>
                        </div>
                        <div className="space-y-6">
                            {PROBLEMS_SOLUTIONS.problems.map((problem, index) => (
                                <motion.div
                                    key={problem.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{
                                        duration: 0.5,
                                        delay: index * 0.1,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="brutal-box p-6 border-l-4 border-destructive/40"
                                >
                                    <h4 className="font-semibold mb-2 text-foreground/90">
                                        {problem.title}
                                    </h4>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {problem.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Solutions */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                <Check className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-primary">
                                Agora의 솔루션
                            </h3>
                        </div>
                        <div className="space-y-6">
                            {PROBLEMS_SOLUTIONS.solutions.map((solution, index) => (
                                <motion.div
                                    key={solution.title}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{
                                        duration: 0.5,
                                        delay: index * 0.1,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="brutal-box p-6 border-l-4 border-primary/40"
                                >
                                    <h4 className="font-semibold mb-2 text-foreground/90">
                                        {solution.title}
                                    </h4>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {solution.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Arrow Connector (visible on lg+) */}
                <div className="hidden lg:flex justify-center mt-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-4 text-primary"
                    >
                        <span className="text-sm font-medium uppercase tracking-wider">
                            문제를 해결로
                        </span>
                        <ArrowRight className="w-6 h-6" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
