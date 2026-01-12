"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function Footer() {
    const handleDeadLink = (e: React.MouseEvent, label: string) => {
        e.preventDefault();
        toast.info(`${label} 페이지는 준비 중입니다.`);
    };

    return (
        <footer className="border-t-2 border-foreground py-12">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-[hsl(var(--coral))]" />
                        </div>
                        <span
                            className="font-semibold"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Agora
                        </span>
                    </div>

                    <div className="flex items-center gap-8 text-sm text-muted-foreground">
                        <Link
                            href="/terms"
                            className="hover:text-foreground transition-colors"
                        >
                            이용약관
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-foreground transition-colors"
                        >
                            개인정보처리방침
                        </Link>
                        <Link
                            href="#"
                            onClick={(e) => handleDeadLink(e, "문의하기")}
                            className="hover:text-foreground transition-colors"
                        >
                            문의하기
                        </Link>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        © 2024 Agora. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
