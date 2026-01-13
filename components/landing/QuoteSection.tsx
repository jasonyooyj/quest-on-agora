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
        <section className="py-24 lg:py-40 relative">
            <div className="max-w-4xl mx-auto px-6 lg:px-12">
                <div className="relative glass-panel p-12 md:p-20 rounded-[3rem] border-zinc-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
                    {/* Spatial Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />

                    <Quote className="absolute top-10 right-10 w-24 h-24 text-primary opacity-10" />

                    <div className="min-h-[320px] relative">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentIndex}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <blockquote className="text-2xl md:text-3xl font-bold leading-relaxed text-zinc-900 tracking-tight">
                                    "{currentTestimonial.text}"
                                </blockquote>
                                <div className="mt-12 flex items-center gap-5">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-lg ${currentTestimonial.role === "instructor"
                                            ? "bg-emerald-100 border-emerald-200 text-emerald-600"
                                            : "bg-primary/15 border-primary/30 text-primary"
                                        }`}
                                    >
                                        {currentTestimonial.role === "instructor" ? (
                                            <GraduationCap className="w-8 h-8" />
                                        ) : (
                                            <User className="w-8 h-8" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg flex items-center gap-3 text-zinc-900">
                                            {currentTestimonial.author}
                                            <span className={`text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border ${currentTestimonial.role === "instructor"
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                    : "bg-primary/10 border-primary/20 text-primary"
                                                }`}
                                            >
                                                {currentTestimonial.role === "instructor" ? "PROFESSOR" : "STUDENT"}
                                            </span>
                                        </div>
                                        <div className="text-zinc-500 font-medium mt-1">
                                            {currentTestimonial.affiliation}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <div className="flex flex-col md:flex-row items-center justify-between mt-12 gap-8 pt-10 border-t border-zinc-200">
                        <div className="flex gap-3">
                            {TESTIMONIALS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setDirection(index > currentIndex ? 1 : -1);
                                        setCurrentIndex(index);
                                    }}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${index === currentIndex
                                            ? "bg-primary w-10"
                                            : "bg-zinc-200 hover:bg-zinc-300 w-1.5"
                                        }`}
                                    aria-label={`Go to testimonial ${index + 1}`}
                                />
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handlePrev}
                                className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
                                aria-label="Previous testimonial"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
                                aria-label="Next testimonial"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
