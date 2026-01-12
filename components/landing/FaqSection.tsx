"use client";

import { motion } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_CONTENT } from "@/lib/constants/landing-content";

export function FaqSection() {
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
                    <span className="tag">{FAQ_CONTENT.tag}</span>
                    <h2
                        className="mt-6"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {FAQ_CONTENT.title}
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                    <Accordion type="single" collapsible className="w-full">
                        {FAQ_CONTENT.items.map((item, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border-2 border-foreground mb-4 last:mb-0 px-6 data-[state=open]:shadow-[4px_4px_0px_hsl(var(--foreground))] transition-shadow"
                            >
                                <AccordionTrigger className="text-base font-semibold hover:no-underline py-5">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
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
                    <p className="text-muted-foreground">
                        더 궁금한 점이 있으신가요?{" "}
                        <a
                            href="mailto:questonkr@gmail.com"
                            className="text-[hsl(var(--coral))] hover:underline font-medium"
                        >
                            문의하기
                        </a>
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
