"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import { PROBLEMS_SOLUTIONS } from "@/lib/constants/landing-content";

export function ProblemSolutionSection() {
    return (
        <section className="py-24 lg:py-32 bg-foreground/[0.02]">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-16">
                    <span className="tag">왜 Agora인가요?</span>
                    <h2
                        className="mt-6"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        기존 토론 수업의{" "}
                        <span className="text-[hsl(var(--coral))]">한계를 넘어서</span>
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Problems */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-foreground/10 flex items-center justify-center">
                                <X className="w-5 h-5 text-foreground/60" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground/60">
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
                                    className="p-6 bg-foreground/5 border-l-4 border-foreground/20"
                                >
                                    <h4 className="font-semibold mb-2 text-foreground/70">
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
                            <div className="w-10 h-10 bg-[hsl(var(--sage))] flex items-center justify-center">
                                <Check className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-[hsl(var(--sage))]">
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
                                    className="brutal-box p-6 border-l-4 border-[hsl(var(--sage))]"
                                >
                                    <h4 className="font-semibold mb-2">
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
                        className="flex items-center gap-4 text-[hsl(var(--coral))]"
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
