"use client";

import { useState } from "react";
import { MARQUEE_ITEMS } from "@/lib/constants/landing-content";

export function MarqueeSection() {
    const [isPaused, setIsPaused] = useState(false);

    return (
        <section
            className="py-8 border-y-2 border-foreground bg-foreground text-background overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div
                className="marquee flex whitespace-nowrap"
                style={{ animationPlayState: isPaused ? "paused" : "running" }}
            >
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex">
                        {MARQUEE_ITEMS.map((item, j) => (
                            <span
                                key={`${i}-${j}`}
                                className="flex items-center gap-8 px-8 text-lg font-semibold uppercase tracking-wider"
                            >
                                <span>{item}</span>
                                <span className="w-2 h-2 bg-[hsl(var(--coral))]" />
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
