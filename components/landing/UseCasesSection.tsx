"use client";

import { motion } from "framer-motion";
import { BookOpen, Briefcase, Scale } from "lucide-react";
import { USE_CASES } from "@/lib/constants/landing-content";

const icons = {
    Philosophy: BookOpen,
    Business: Briefcase,
    Law: Scale,
};

export function UseCasesSection() {
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-16">
                    <span className="tag">활용 사례</span>
                    <h2
                        className="mt-6"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        다양한 분야에서 활용되는{" "}
                        <span className="text-[hsl(var(--coral))]">Agora</span>
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        철학부터 법학까지, 모든 토론 수업에서 효과적으로 사용할 수 있습니다.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {USE_CASES.map((useCase, index) => {
                        const Icon = icons[useCase.subject as keyof typeof icons];
                        return (
                            <motion.div
                                key={useCase.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.1,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="brutal-box p-8 group hover:-translate-y-1 transition-transform"
                            >
                                <div className="w-14 h-14 bg-[hsl(var(--coral))] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Icon className="w-7 h-7 text-white" />
                                </div>
                                <h3
                                    className="text-xl font-semibold mb-3"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    {useCase.title}
                                </h3>
                                <p className="text-muted-foreground mb-6 leading-relaxed">
                                    {useCase.description}
                                </p>
                                <div className="pt-4 border-t-2 border-foreground/10">
                                    <div className="text-sm text-muted-foreground">성과</div>
                                    <div className="text-lg font-semibold text-[hsl(var(--coral))]">
                                        {useCase.metric}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
