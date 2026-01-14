"use client";

import { motion } from "framer-motion";
import { BookOpen, Briefcase, Scale } from "lucide-react";
import { useTranslations } from "next-intl";

const icons = {
    Philosophy: BookOpen,
    Business: Briefcase,
    Law: Scale,
};

const subjects = ["Philosophy", "Business", "Law"];

export function UseCasesSection() {
    const t = useTranslations('UseCases');

    const useCases = Array.from({ length: 3 }, (_, i) => ({
        title: t(`items.${i}.title`),
        description: t(`items.${i}.description`),
        metric: t(`items.${i}.metric`),
        subject: subjects[i]
    }));

    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-16">
                    <span className="tag">{t('tag')}</span>
                    <h2 className="mt-6 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                        {t('titlePrefix')} <span className="text-primary">{t('titleSuffix')}</span>
                    </h2>
                    <p className="mt-4 text-zinc-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        {t('description')}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {useCases.map((useCase, index) => {
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
                                className="glass-panel p-8 group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl rounded-[2.5rem]"
                            >
                                <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                                    <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-zinc-900 group-hover:text-primary transition-colors">
                                    {useCase.title}
                                </h3>
                                <p className="text-zinc-600 mb-8 leading-relaxed text-sm md:text-base">
                                    {useCase.description}
                                </p>
                                <div className="pt-6 border-t border-zinc-200 flex flex-col gap-1">
                                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('metricLabel')}</div>
                                    <div className="text-2xl font-bold text-zinc-900 tracking-tight">
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
