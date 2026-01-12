import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function Navbar() {
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

                    <div className="flex items-center gap-6">
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
                </div>
            </div>
        </nav>
    );
}
