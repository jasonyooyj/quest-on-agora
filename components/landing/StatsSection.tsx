"use client";

import { motion } from "framer-motion";
import { STATS_CONTENT } from "@/lib/constants/landing-content";

export function StatsSection() {
    return (
        <section className="py-24 bg-foreground text-background diagonal-pattern">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {STATS_CONTENT.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="text-center"
                        >
                            <div
                                className="text-6xl lg:text-7xl font-bold mb-4 text-[hsl(var(--coral))]"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                {stat.value}
                            </div>
                            <div className="text-lg uppercase tracking-wider text-background/70">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
