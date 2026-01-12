import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-white/5 py-12 bg-black/20">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
                            <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-xl text-white tracking-tight">
                            Agora
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-zinc-500">
                        <Link
                            href="/terms"
                            className="hover:text-white transition-colors"
                        >
                            이용약관
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-white transition-colors"
                        >
                            개인정보처리방침
                        </Link>
                        <a
                            href="mailto:questonkr@gmail.com"
                            className="hover:text-white transition-colors"
                        >
                            문의하기
                        </a>
                    </div>

                    <div className="text-sm text-zinc-600 font-medium">
                        © {new Date().getFullYear()} Agora. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
