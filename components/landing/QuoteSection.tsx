"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { QUOTE_CONTENT } from "@/lib/constants/landing-content";

export function QuoteSection() {
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-4xl mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative"
                >
                    <Quote className="absolute -top-8 -left-4 w-24 h-24 text-[hsl(var(--coral))] opacity-20" />
                    <blockquote
                        className="text-3xl lg:text-4xl font-medium leading-relaxed pl-8 border-l-4 border-[hsl(var(--coral))]"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {QUOTE_CONTENT.text}
                    </blockquote>
                    <div className="mt-8 pl-8">
                        <div className="font-semibold">{QUOTE_CONTENT.author}</div>
                        <div className="text-muted-foreground">{QUOTE_CONTENT.affiliation}</div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
