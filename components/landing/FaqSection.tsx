"use client";

import { motion } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export function FaqSection() {
    const t = useTranslations('Faq');

    const items = Array.from({ length: 5 }, (_, i) => ({
        question: t(`items.${i}.question`),
        answer: t(`items.${i}.answer`)
    }));

    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-3xl mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-12"
                >
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-primary/10 text-primary border border-primary/20">
                        {t('tag')}
                    </span>
                    <h2 className="mt-6 text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                        {t('title')}
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {items.map((item, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border-none rounded-2xl glass-panel px-6 data-[state=open]:bg-zinc-50 transition-all duration-300"
                            >
                                <AccordionTrigger className="text-base font-semibold hover:no-underline py-5 text-zinc-900">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-zinc-600 leading-relaxed pb-5">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center mt-12"
                >
                    <p className="text-zinc-500">
                        {t('moreQuestions')}{" "}
                        <a
                            href="mailto:questonkr@gmail.com"
                            className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                        >
                            {t('contact')}
                        </a>
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
