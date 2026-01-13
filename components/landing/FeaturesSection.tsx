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
                            <span className="tag mb-4">{FEATURES_CONTENT.tag}</span>
                            <h2 className="mt-6 text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                                {FEATURES_CONTENT.title}
                            </h2>
                            <p className="mt-4 text-zinc-600 text-lg leading-relaxed">
                                {FEATURES_CONTENT.description}
                            </p>
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="lg:col-span-8 space-y-8">
                        {FEATURES_CONTENT.items.map((feature, index) => (
                            <motion.div
                                key={feature.number}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                                className="group"
                            >
                                <div className="glass-panel p-8 flex gap-8 hover:bg-zinc-50 transition-all duration-300 hover:shadow-xl">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold transition-shadow">
                                        {feature.number}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <feature.icon className="w-5 h-5 text-primary" />
                                            <h3 className="text-xl font-bold text-zinc-900">
                                                {feature.title}
                                            </h3>
                                        </div>
                                        <p className="text-zinc-600 leading-relaxed">
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
