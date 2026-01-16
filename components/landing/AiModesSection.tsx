"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Scale, Swords, Minimize2, User, Bot } from "lucide-react";
import { useTranslations } from "next-intl";

const icons = {
    socratic: HelpCircle,
    balanced: Scale,
    debate: Swords,
    minimal: Minimize2,
};

const colorClasses = {
    sage: {
        bg: "bg-emerald-100",
        bgLight: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
    },
    gold: {
        bg: "bg-amber-100",
        bgLight: "bg-amber-50",
        text: "text-amber-600",
        border: "border-amber-200",
    },
    coral: {
        bg: "bg-primary/15",
        bgLight: "bg-primary/10",
        text: "text-primary",
        border: "border-primary/30",
    },
    muted: {
        bg: "bg-zinc-100",
        bgLight: "bg-zinc-50",
        text: "text-zinc-600",
        border: "border-zinc-200",
    },
};

export function AiModesSection() {
    const t = useTranslations('AiModes');
    const [selectedMode, setSelectedMode] = useState<string | null>(null);

    const modes = [
        {
            id: "socratic",
            color: "sage",
        },
        {
            id: "balanced",
            color: "gold",
        },
        {
            id: "debate",
            color: "coral",
        },
        {
            id: "minimal",
            color: "muted",
        },
    ];

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
                    <span className="tag">{t('tag')}</span>
                    <h2 className="mt-6 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                        {t('title')}
                    </h2>
                    <p className="mt-4 text-zinc-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        {t('description')}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {modes.map((mode, index) => {
                        const Icon = icons[mode.id as keyof typeof icons];
                        const colors = colorClasses[mode.color as keyof typeof colorClasses];
                        const isSelected = selectedMode === mode.id;

                        const label = t(`items.${mode.id}.label`);
                        const title = t(`items.${mode.id}.title`);
                        const description = t(`items.${mode.id}.description`);
                        const exampleStudent = t(`items.${mode.id}.example.student`);
                        const exampleAi = t(`items.${mode.id}.example.ai`);

                        return (
                            <motion.div
                                key={mode.id}
                                className="h-full"
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
                                    className={`glass-panel p-8 cursor-pointer transition-all duration-300 rounded-[2.5rem] relative overflow-hidden group h-full ${isSelected
                                        ? `border-primary/50 bg-zinc-50 shadow-xl -translate-y-1`
                                        : "hover:-translate-y-1 hover:bg-zinc-50"
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
                                                    {label}
                                                </span>
                                                <h3 className="text-xl font-bold text-zinc-900 mt-0.5">
                                                    {title}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${colors.bgLight} ${colors.text} border ${colors.border} tracking-wide whitespace-nowrap`}>
                                            {isSelected ? t('close') : t('viewExample')}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-zinc-600 text-sm md:text-base leading-relaxed mb-6">
                                        {description}
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
                                                <div className="mt-8 pt-8 border-t border-zinc-200 space-y-6">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
                                                        {t('exampleTitle')}
                                                    </div>

                                                    {/* Student Message */}
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 border border-zinc-200">
                                                            <User className="w-5 h-5 text-zinc-500" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                                                                {t('student')}
                                                            </div>
                                                            <div className="text-sm md:text-base bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-zinc-700">
                                                                {exampleStudent}
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
                                                                {t('ai')} ({label})
                                                            </div>
                                                            <div className={`text-sm md:text-base ${colors.bgLight} p-4 rounded-2xl border ${colors.border} text-zinc-700`}>
                                                                {exampleAi}
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
                        {t('note')}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
