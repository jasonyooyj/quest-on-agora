"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight, GraduationCap, User } from "lucide-react";
import { TESTIMONIALS } from "@/lib/constants/landing-content";

export function QuoteSection() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setDirection(1);
            setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const handlePrev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    };

    const handleNext = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0,
        }),
    };

    const currentTestimonial = TESTIMONIALS[currentIndex];

    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-4xl mx-auto px-6 lg:px-12">
                <div className="relative">
                    <Quote className="absolute -top-8 -left-4 w-24 h-24 text-[hsl(var(--coral))] opacity-20" />

                    <div className="min-h-[280px] relative overflow-hidden">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentIndex}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                            >
                                <blockquote
                                    className="text-2xl lg:text-3xl font-medium leading-relaxed pl-8 border-l-4 border-[hsl(var(--coral))]"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    {currentTestimonial.text}
                                </blockquote>
                                <div className="mt-8 pl-8 flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            currentTestimonial.role === "instructor"
                                                ? "bg-[hsl(var(--sage))]"
                                                : "bg-[hsl(var(--coral))]"
                                        }`}
                                    >
                                        {currentTestimonial.role === "instructor" ? (
                                            <GraduationCap className="w-5 h-5 text-white" />
                                        ) : (
                                            <User className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold flex items-center gap-2">
                                            {currentTestimonial.author}
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${
                                                    currentTestimonial.role === "instructor"
                                                        ? "bg-[hsl(var(--sage)/0.2)] text-[hsl(var(--sage))]"
                                                        : "bg-[hsl(var(--coral)/0.2)] text-[hsl(var(--coral))]"
                                                }`}
                                            >
                                                {currentTestimonial.role === "instructor" ? "교수" : "학생"}
                                            </span>
                                        </div>
                                        <div className="text-muted-foreground">
                                            {currentTestimonial.affiliation}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pl-8">
                        <div className="flex gap-2">
                            {TESTIMONIALS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setDirection(index > currentIndex ? 1 : -1);
                                        setCurrentIndex(index);
                                    }}
                                    className={`w-3 h-3 rounded-full transition-all ${
                                        index === currentIndex
                                            ? "bg-[hsl(var(--coral))] w-8"
                                            : "bg-foreground/20 hover:bg-foreground/40"
                                    }`}
                                    aria-label={`후기 ${index + 1}번으로 이동`}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                className="p-2 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
                                aria-label="이전 후기"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="p-2 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
                                aria-label="다음 후기"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
