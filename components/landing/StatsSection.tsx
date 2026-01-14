"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function StatsSection() {
    const t = useTranslations('Stats');

    const stats = Array.from({ length: 3 }, (_, i) => ({
        value: t(`${i}.value`),
        label: t(`${i}.label`)
    }));

    return (
        <section className="py-24 relative overflow-hidden bg-zinc-50/50">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
            <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1, type: "spring", bounce: 0.3 }}
                            className="text-center p-8 rounded-[2rem] glass-panel border-zinc-200 bg-white/80"
                        >
                            <div className="text-6xl lg:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-primary via-purple-500 to-pink-500">
                                {stat.value}
                            </div>
                            <div className="text-sm uppercase tracking-[0.2em] font-bold text-zinc-500">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
