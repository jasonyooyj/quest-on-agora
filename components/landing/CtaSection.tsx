import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CTA_CONTENT } from "@/lib/constants/landing-content";

export function CtaSection() {
    return (
        <section className="py-24">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="brutal-box bg-foreground text-background p-12 lg:p-16 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-0 right-0 w-96 h-96 border-[40px] border-background rounded-full translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 border-[30px] border-background translate-y-1/2 -translate-x-1/2" />
                    </div>

                    <div className="relative z-10 max-w-2xl">
                        <h2
                            className="text-background mb-6"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            {CTA_CONTENT.title}
                        </h2>
                        <p className="text-background/70 text-xl mb-8 leading-relaxed">
                            {CTA_CONTENT.description}
                        </p>
                        <Link href="/register">
                            <button className="bg-[hsl(var(--coral))] text-white font-semibold uppercase tracking-wide px-8 py-4 border-2 border-background shadow-[3px_3px_0px_hsl(var(--background)/0.3)] hover:shadow-[5px_5px_0px_hsl(var(--background)/0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center gap-2">
                                {CTA_CONTENT.buttonText}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
