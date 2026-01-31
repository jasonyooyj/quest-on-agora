"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 플랜 ID (데이터베이스의 subscription_plans 테이블과 매칭)
const PLAN_IDS: Record<string, string> = {
    free: '00000000-0000-0000-0000-000000000001',
    pro: '00000000-0000-0000-0000-000000000002',
    institution: '00000000-0000-0000-0000-000000000003',
};

export function PricingSection() {
    const t = useTranslations('Pricing');
    const locale = useLocale();
    const router = useRouter();
    const [isYearly, setIsYearly] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

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

    // 결제 시작 핸들러
    const handleCheckout = useCallback(async (planKey: string) => {
        if (planKey === 'free') {
            // 무료 플랜은 회원가입으로 이동
            router.push(`/${locale}/auth/register`);
            return;
        }

        if (planKey === 'institution') {
            // 기관 플랜은 영업팀 문의
            window.location.href = 'mailto:sales@agora.edu';
            return;
        }

        setLoadingPlan(planKey);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: PLAN_IDS[planKey],
                    billingInterval: isYearly ? 'yearly' : 'monthly',
                    locale,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // 로그인 필요
                    toast.error('로그인이 필요합니다.');
                    router.push(`/${locale}/auth/login?redirect=/pricing`);
                    return;
                }
                throw new Error(data.error || '결제 처리 중 오류가 발생했습니다.');
            }

            // Toss 결제 위젯 페이지로 이동
            const params = new URLSearchParams({
                clientKey: data.clientKey,
                customerKey: data.customerKey,
                amount: data.amount.toString(),
                orderId: data.orderId,
                orderName: data.orderName,
                successUrl: data.successUrl,
                failUrl: data.failUrl,
            });
            router.push(`/${locale}/checkout/toss?${params.toString()}`);
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
        } finally {
            setLoadingPlan(null);
        }
    }, [isYearly, locale, router]);

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
                            <button
                                onClick={() => handleCheckout(plan.key)}
                                disabled={loadingPlan === plan.key}
                                className={cn(
                                    "w-full mb-8 flex items-center justify-center",
                                    plan.highlight ? "btn-primary" : "btn-brutal",
                                    loadingPlan === plan.key && "opacity-70 cursor-not-allowed"
                                )}
                            >
                                {loadingPlan === plan.key ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    <>
                                        {t(`plans.${plan.key}.cta`)}
                                        {plan.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
                                    </>
                                )}
                            </button>

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
