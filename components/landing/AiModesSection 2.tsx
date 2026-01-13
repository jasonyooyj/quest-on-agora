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
        bg: "bg-[hsl(var(--sage))]",
        bgLight: "bg-[hsl(var(--sage)/0.1)]",
        text: "text-[hsl(var(--sage))]",
        border: "border-[hsl(var(--sage))]",
    },
    gold: {
        bg: "bg-[hsl(var(--gold))]",
        bgLight: "bg-[hsl(var(--gold)/0.1)]",
        text: "text-[hsl(var(--gold))]",
        border: "border-[hsl(var(--gold))]",
    },
    coral: {
        bg: "bg-[hsl(var(--coral))]",
        bgLight: "bg-[hsl(var(--coral)/0.1)]",
        text: "text-[hsl(var(--coral))]",
        border: "border-[hsl(var(--coral))]",
    },
    muted: {
        bg: "bg-foreground/50",
        bgLight: "bg-foreground/5",
        text: "text-foreground/70",
        border: "border-foreground/30",
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
                    <h2
                        className="mt-6"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {AI_MODES_CONTENT.title}
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        {AI_MODES_CONTENT.description}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {AI_MODES.map((mode, index) => {
                        const Icon = icons[mode.id as keyof typeof icons];
                        const colors = colorClasses[mode.color];
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
                                    className={`brutal-box p-6 lg:p-8 cursor-pointer transition-all ${isSelected
                                            ? `${colors.border} border-2 shadow-[6px_6px_0px_hsl(var(--foreground))]`
                                            : "hover:-translate-y-1"
                                        }`}
                                    onClick={() =>
                                        setSelectedMode(isSelected ? null : mode.id)
                                    }
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-12 h-12 ${colors.bg} flex items-center justify-center`}
                                            >
                                                <Icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <span
                                                    className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}
                                                >
                                                    {mode.label}
                                                </span>
                                                <h3
                                                    className="text-lg font-semibold"
                                                    style={{
                                                        fontFamily: "var(--font-display)",
                                                    }}
                                                >
                                                    {mode.title}
                                                </h3>
                                            </div>
                                        </div>
                                        <div
                                            className={`text-xs px-2 py-1 ${colors.bgLight} ${colors.text} rounded-sm`}
                                        >
                                            {isSelected ? "닫기" : "예시 보기"}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                                        {mode.description}
                                    </p>

                                    {/* Example Dialog */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div
                                                    className={`mt-4 pt-4 border-t-2 ${colors.border} border-opacity-30`}
                                                >
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                                        대화 예시
                                                    </div>

                                                    {/* Student Message */}
                                                    <div className="flex gap-3 mb-3">
                                                        <div className="w-8 h-8 bg-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <User className="w-4 h-4 text-foreground/60" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-xs text-muted-foreground mb-1">
                                                                학생
                                                            </div>
                                                            <div className="text-sm bg-foreground/5 p-3 rounded-sm">
                                                                {mode.example.student}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Response */}
                                                    <div className="flex gap-3">
                                                        <div
                                                            className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center flex-shrink-0`}
                                                        >
                                                            <Bot className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div
                                                                className={`text-xs ${colors.text} mb-1`}
                                                            >
                                                                AI ({mode.label})
                                                            </div>
                                                            <div
                                                                className={`text-sm ${colors.bgLight} p-3 rounded-sm border-l-2 ${colors.border}`}
                                                            >
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
                    <p className="text-muted-foreground text-sm">
                        토론 생성 시 AI 모드를 선택할 수 있으며, 진행 중에도 변경이
                        가능합니다.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
