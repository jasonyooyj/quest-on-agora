"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Menu, X, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function Navbar() {
    const t = useTranslations('Navbar');
    const { scrollY } = useScroll();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 20);
    });

    const navItems = [
        { name: t('features'), href: "#features" },
        { name: t('useCases'), href: "#use-cases" },
        { name: t('pricing'), href: "#pricing" },
        { name: t('about'), href: "#about" },
    ];

    return (
        <motion.header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-spring ${isScrolled
                ? "top-4 mx-auto max-w-4xl glass-panel rounded-full py-2 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-zinc-200 bg-white/80 backdrop-blur-2xl"
                : "bg-transparent py-6"
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={`flex items-center justify-between ${isScrolled ? "w-full" : "container mx-auto px-4 md:px-6"}`}>
                {/* Logo */}
                <div className="flex flex-1 justify-start">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_12px_rgba(99,102,241,0.3)] group-hover:shadow-[0_4px_20px_rgba(168,85,247,0.4)] transition-all duration-300">
                            <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
                            Agora
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors relative group"
                        >
                            {item.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-indigo-500 transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ))}
                </nav>

                {/* Action Buttons */}
                <div className="hidden md:flex flex-1 items-center justify-end gap-3">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                        {t('login')}
                    </Link>
                    <Link href="/register">
                        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 border-none rounded-full px-6 font-medium shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all duration-300 transform hover:-translate-y-0.5">
                            {t('getStarted')}
                        </Button>
                    </Link>
                    <div className="w-px h-5 bg-zinc-200 mx-1" />
                    <LocaleSwitcher />
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex flex-1 justify-end md:hidden">
                    <button
                        className="text-zinc-600 hover:text-zinc-900"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden glass-panel border-b border-zinc-200 overflow-hidden"
                    >
                        <div className="flex flex-col p-6 gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="text-lg font-medium text-zinc-600 hover:text-zinc-900"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <hr className="border-zinc-200 my-2" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-500">Language</span>
                                <LocaleSwitcher />
                            </div>
                            <Link
                                href="/login"
                                className="text-lg font-medium text-zinc-600 hover:text-zinc-900"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {t('login')}
                            </Link>
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 rounded-full mt-2">
                                    {t('getStarted')}
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
