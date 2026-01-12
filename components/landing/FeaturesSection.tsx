"use client";

import { motion } from "framer-motion";
import { FEATURES_CONTENT } from "@/lib/constants/landing-content";

export function FeaturesSection() {
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid lg:grid-cols-12 gap-16">
                    {/* Section Header */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24">
                            <div className="tag mb-4">{FEATURES_CONTENT.tag}</div>
                            <h2
                                className="mb-6"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                {FEATURES_CONTENT.title}
                            </h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                {FEATURES_CONTENT.description}
                            </p>
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="lg:col-span-8 space-y-8">
                        {FEATURES_CONTENT.items.map((feature, index) => (
                            <motion.div
                                key={feature.number}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="brutal-box bg-card p-8 flex gap-6">
                                    <div className="number-badge flex-shrink-0">
                                        {feature.number}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <feature.icon className="w-5 h-5 text-[hsl(var(--coral))]" />
                                            <h3
                                                className="text-xl font-semibold"
                                                style={{ fontFamily: "var(--font-display)" }}
                                            >
                                                {feature.title}
                                            </h3>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
