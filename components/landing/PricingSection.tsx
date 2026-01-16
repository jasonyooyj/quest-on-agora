"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export function PricingSection() {
    const t = useTranslations('Pricing');
    const locale = useLocale();
    const [isYearly, setIsYearly] = useState(true);

    const isKo = locale === 'ko';

    const plans = [
        {
            key: "free",
            price: 0,
            originalPrice: 0,
            popular: false,
            highlight: false
        },
        {
            key: "pro",
            // KRW: 16600 (monthly eq) vs 19900 (monthly)
            // USD: 16.65 (monthly eq) vs 19.99 (monthly)
            price: isYearly
                ? (isKo ? 16600 : 16.65)
                : (isKo ? 19900 : 19.99),
            originalPrice: isKo ? 19900 : 19.99,
            popular: true,
            highlight: true
        },
        {
            key: "institution",
            price: null,
            originalPrice: null,
            popular: false,
            highlight: false
        }
    ];

    const formatPrice = (price: number) => {
        if (isKo) {
            return `₩${price.toLocaleString()}`;
        }
        return `$${price.toFixed(2)}`;
    };

    return (
        <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="tag">{t('tag')}</span>
                    <h2 className="mt-6 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                        {t('title')}
                    </h2>
                    <p className="mt-4 text-zinc-600 text-lg leading-relaxed max-w-2xl mx-auto">
                        {t('description')}
                    </p>

                    {/* Toggle */}
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <span className={cn("text-sm font-medium transition-colors", !isYearly ? "text-zinc-900" : "text-muted-foreground")}>
                            {t('monthly')}
                        </span>
                        <button
                            onClick={() => setIsYearly(!isYearly)}
                            className={cn(
                                "relative w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
                                isYearly ? "bg-primary" : "bg-zinc-200"
                            )}
                        >
                            <motion.div
                                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm"
                                animate={{ x: isYearly ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        </button>
                        <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", isYearly ? "text-zinc-900" : "text-muted-foreground")}>
                            {t('yearly')}
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {t('saveLabel')}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.key}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={cn(
                                "relative p-8 glass-panel transition-all duration-300 h-full flex flex-col",
                                plan.highlight
                                    ? "border-primary shadow-[0_4px_24px_-8px_rgba(124,58,237,0.25)] ring-1 ring-primary/20"
                                    : "hover:border-zinc-300"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                    {t('popular')}
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="mb-8 flex-1">
                                <h3 className="text-xl font-bold mb-2 text-zinc-900">
                                    {t(`plans.${plan.key}.name`)}
                                </h3>
                                <div className="flex items-baseline gap-1">
                                    {plan.price !== null ? (
                                        <>
                                            <span className="text-4xl font-bold text-zinc-900">
                                                {formatPrice(plan.price)}
                                            </span>
                                            <span className="text-sm text-zinc-500">
                                                /{t('monthShort')}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-3xl font-bold text-zinc-900">
                                            {t('contactSales')}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                                    {t(`plans.${plan.key}.description`)}
                                </p>
                            </div>

                            {/* CTA */}
                            <a
                                href={plan.key === 'institution' ? "mailto:sales@agora.com" : "/auth/register"}
                                className={cn(
                                    "w-full mb-8",
                                    plan.highlight ? "btn-primary" : "btn-brutal"
                                )}
                            >
                                {t(`plans.${plan.key}.cta`)}
                                {plan.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
                            </a>

                            {/* Features */}
                            <div className="space-y-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    {t('featuresLabel')}
                                </p>
                                <ul className="space-y-3">
                                    {[1, 2, 3, 4, 5].map((i) => {
                                        const featureKey = `plans.${plan.key}.features.${i}`;
                                        const text = t(featureKey as any);
                                        if (text === featureKey) return null;

                                        return (
                                            <li key={i} className="flex items-start gap-3 text-sm">
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                                    "bg-primary/10 text-primary"
                                                )}>
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                <span className="leading-tight text-zinc-600">
                                                    {text}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
