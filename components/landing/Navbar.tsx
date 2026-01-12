"use client";

import Link from "next/link";
import { MessageCircle, Menu } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b-2 border-foreground">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex items-center justify-center transition-colors">
                            <MessageCircle className="w-8 h-8 text-[hsl(var(--coral))] group-hover:scale-110 transition-transform" />
                        </div>
                        <span
                            className="text-xl font-semibold tracking-tight"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Agora
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/login"
                            className="text-sm font-medium hover:text-[hsl(var(--coral))] transition-colors"
                        >
                            로그인
                        </Link>
                        <Link href="/register">
                            <button className="btn-brutal-fill text-sm">시작하기</button>
                        </Link>
                    </div>

                    {/* Mobile Navigation */}
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <button
                                className="p-2 hover:bg-foreground/5 transition-colors"
                                aria-label="메뉴 열기"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[280px] border-l-2 border-foreground">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <MessageCircle className="w-6 h-6 text-[hsl(var(--coral))]" />
                                    <span style={{ fontFamily: "var(--font-display)" }}>
                                        Agora
                                    </span>
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-4 mt-8">
                                <Link
                                    href="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="text-lg font-medium hover:text-[hsl(var(--coral))] transition-colors py-2 border-b border-foreground/10"
                                >
                                    로그인
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full"
                                >
                                    <button className="btn-brutal-fill w-full text-center">
                                        시작하기
                                    </button>
                                </Link>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
}
