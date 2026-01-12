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
                    <h2 className="mt-6 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        다양한 분야에서 활용되는 <span className="text-primary">Agora</span>
                    </h2>
                    <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
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
                                className="glass-panel p-8 group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 rounded-[2.5rem]"
                            >
                                <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                                    <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-zinc-100 group-hover:text-primary transition-colors">
                                    {useCase.title}
                                </h3>
                                <p className="text-zinc-400 mb-8 leading-relaxed text-sm md:text-base">
                                    {useCase.description}
                                </p>
                                <div className="pt-6 border-t border-white/5 flex flex-col gap-1">
                                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">성과</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
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
