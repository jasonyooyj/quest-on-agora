import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaSection() {
    const t = useTranslations('Cta');

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse-slow" />

            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="glass-panel p-12 lg:p-20 relative overflow-hidden rounded-[2.5rem] border border-zinc-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)]">
                    {/* Spatial Decorations */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

                    <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                            {t('title')}
                        </h2>
                        <p className="text-zinc-600 text-lg md:text-xl mb-10 leading-relaxed max-w-xl">
                            {t('description')}
                        </p>
                        <Link href="/register">
                            <button className="group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full overflow-hidden shadow-[0_4px_20px_rgba(99,102,241,0.3)] transition-all hover:shadow-[0_4px_30px_rgba(99,102,241,0.5)] hover:-translate-y-1">
                                <span className="relative z-10 flex items-center gap-3">
                                    {t('buttonText')}
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
