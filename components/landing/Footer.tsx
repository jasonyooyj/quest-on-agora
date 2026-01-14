import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations('Footer');

    return (
        <footer className="border-t border-zinc-200 py-12 bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-all">
                            <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-xl text-zinc-900 tracking-tight">
                            Agora
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-zinc-500">
                        <Link
                            href="/terms"
                            className="hover:text-zinc-900 transition-colors"
                        >
                            {t('terms')}
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-zinc-900 transition-colors"
                        >
                            {t('privacy')}
                        </Link>
                        <a
                            href="mailto:questonkr@gmail.com"
                            className="hover:text-zinc-900 transition-colors"
                        >
                            {t('contact')}
                        </a>
                    </div>

                    <div className="text-sm text-zinc-500 font-medium">
                        © {new Date().getFullYear()} Agora. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
