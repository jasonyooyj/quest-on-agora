"use client";

import { useState } from "react";
import { MARQUEE_ITEMS } from "@/lib/constants/landing-content";

export function MarqueeSection() {
    const [isPaused, setIsPaused] = useState(false);

    return (
        <section
            className="py-10 border-y border-zinc-200 bg-zinc-50 overflow-hidden relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-50 via-transparent to-zinc-50 z-10 pointer-events-none opacity-50" />

            <div
                className="marquee flex whitespace-nowrap"
                style={{ animationPlayState: isPaused ? "paused" : "running" }}
            >
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex">
                        {MARQUEE_ITEMS.map((item, j) => (
                            <span
                                key={`${i}-${j}`}
                                className="flex items-center gap-10 px-10 text-xl font-bold uppercase tracking-[0.3em] text-zinc-400 hover:text-zinc-900 group transition-colors duration-500"
                            >
                                <span>{item}</span>
                                <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary" />
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
