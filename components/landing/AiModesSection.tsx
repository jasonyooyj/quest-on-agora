"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Scale, Swords, Minimize2, User, Bot } from "lucide-react";
import { AI_MODES_CONTENT, AI_MODES } from "@/lib/constants/landing-content";

const icons = {
    socratic: HelpCircle,
    balanced: Scale,
    debate: Swords,
    minimal: Minimize2,
};

const colorClasses = {
    sage: {
        bg: "bg-emerald-500/20",
        bgLight: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
    },
    gold: {
        bg: "bg-amber-500/20",
        bgLight: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/30",
    },
    coral: {
        bg: "bg-primary/20",
        bgLight: "bg-primary/10",
        text: "text-primary",
        border: "border-primary/30",
    },
    muted: {
        bg: "bg-zinc-800/50",
        bgLight: "bg-zinc-800/30",
        text: "text-zinc-400",
        border: "border-white/5",
    },
};

export function AiModesSection() {
    const [selectedMode, setSelectedMode] = useState<string | null>(null);

    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-16"
                >
                    <span className="tag">{AI_MODES_CONTENT.tag}</span>
                    <h2 className="mt-6 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        {AI_MODES_CONTENT.title}
                    </h2>
                    <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        {AI_MODES_CONTENT.description}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {AI_MODES.map((mode, index) => {
                        const Icon = icons[mode.id as keyof typeof icons];
                        const colors = colorClasses[mode.color as keyof typeof colorClasses];
                        const isSelected = selectedMode === mode.id;

                        return (
                            <motion.div
                                key={mode.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.1,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                            >
                                <div
                                    className={`glass-panel p-8 cursor-pointer transition-all duration-300 rounded-[2.5rem] relative overflow-hidden group ${isSelected
                                        ? `border-primary/50 bg-white/5 shadow-2xl shadow-primary/10 -translate-y-1`
                                        : "hover:-translate-y-1 hover:bg-white/[0.04]"
                                        }`}
                                    onClick={() =>
                                        setSelectedMode(isSelected ? null : mode.id)
                                    }
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 ${colors.bg} rounded-2xl flex items-center justify-center border ${colors.border} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                                                <Icon className={`w-7 h-7 ${colors.text}`} />
                                            </div>
                                            <div>
                                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${colors.text}`}>
                                                    {mode.label}
                                                </span>
                                                <h3 className="text-xl font-bold text-white mt-0.5">
                                                    {mode.title}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${colors.bgLight} ${colors.text} border ${colors.border} tracking-wide`}>
                                            {isSelected ? "닫기" : "대화 예시 보기"}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6">
                                        {mode.description}
                                    </p>

                                    {/* Example Dialog */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
                                                        대화 예시
                                                    </div>

                                                    {/* Student Message */}
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center flex-shrink-0 border border-white/5">
                                                            <User className="w-5 h-5 text-zinc-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                                                                학생
                                                            </div>
                                                            <div className="text-sm md:text-base bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-zinc-300">
                                                                {mode.example.student}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Response */}
                                                    <div className="flex gap-4">
                                                        <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 border ${colors.border}`}>
                                                            <Bot className={`w-5 h-5 ${colors.text}`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className={`text-[10px] font-bold ${colors.text} mb-1 uppercase tracking-wider`}>
                                                                AI ({mode.label})
                                                            </div>
                                                            <div className={`text-sm md:text-base ${colors.bgLight} p-4 rounded-2xl border ${colors.border} text-zinc-100`}>
                                                                {mode.example.ai}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <p className="text-zinc-500 font-medium text-sm">
                        토론 생성 시 AI 모드를 선택할 수 있으며, 진행 중에도 변경이 가능합니다.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
