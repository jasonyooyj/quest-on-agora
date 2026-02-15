"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// API에서 변환된 플랜 타입 (camelCase)
interface ApiPlan {
    id: string;
    name: string;
    displayNameKo: string;
    displayNameEn: string;
    tier: number;
    limits: {
        maxDiscussionsPerMonth: number | null;
        maxActiveDiscussions: number | null;
        maxParticipantsPerDiscussion: number | null;
    };
    features: Record<string, boolean>;
    priceMonthlyKrw: number | null;
    priceYearlyKrw: number | null;
    priceMonthlyUsd: number | null;
    priceYearlyUsd: number | null;
    isActive: boolean;
}

export function PricingSection() {
    const t = useTranslations('Pricing');
    const locale = useLocale();
    const router = useRouter();
    const [isYearly, setIsYearly] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [apiPlans, setApiPlans] = useState<ApiPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // API에서 플랜 가져오기
    useEffect(() => {
        fetch('/api/checkout')
            .then((res) => {
                if (!res.ok) throw new Error('Plans fetch failed');
                return res.json();
            })
            .then((data: { plans?: ApiPlan[] }) => {
                if (data?.plans?.length) {
                    // tier 순으로 정렬
                    const sorted = [...data.plans].sort((a, b) => a.tier - b.tier);
                    setApiPlans(sorted);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch plans:', err);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const isKo = locale === 'ko';

    // API 플랜을 UI 플랜으로 변환
    const plans = useMemo(() => {
        if (apiPlans.length === 0) return [];

        // 가장 높은 유료 플랜을 하이라이트 (institution 제외)
        const paidPlans = apiPlans.filter(p => 
            p.name !== 'free' && 
            p.name !== 'institution' && 
            p.priceMonthlyKrw !== null
        );
        const highlightPlan = paidPlans.length > 0 
            ? paidPlans[paidPlans.length - 1].name 
            : null;

        return apiPlans.map(plan => {
            const priceMonthly = isKo ? plan.priceMonthlyKrw : (plan.priceMonthlyUsd ? plan.priceMonthlyUsd / 100 : null);
            const priceYearly = isKo ? plan.priceYearlyKrw : (plan.priceYearlyUsd ? plan.priceYearlyUsd / 100 : null);
            
            // 연간 결제 시 월 환산 가격
            const yearlyMonthlyEquiv = priceYearly ? Math.round(priceYearly / 12) : null;
            
            const displayPrice = isYearly && yearlyMonthlyEquiv !== null
                ? yearlyMonthlyEquiv
                : priceMonthly;

            return {
                key: plan.name,
                id: plan.id,
                displayName: isKo ? plan.displayNameKo : plan.displayNameEn,
                price: displayPrice,
                originalPrice: priceMonthly,
                maxDiscussions: plan.limits.maxDiscussionsPerMonth,
                maxActive: plan.limits.maxActiveDiscussions,
                maxParticipants: plan.limits.maxParticipantsPerDiscussion,
                features: plan.features,
                popular: plan.name === highlightPlan,
                highlight: plan.name === highlightPlan,
            };
        });
    }, [apiPlans, isYearly, isKo]);

    // 플랜 ID 맵
    const planIdsByKey = useMemo(() => {
        const map: Record<string, string> = {};
        apiPlans.forEach(p => {
            map[p.name] = p.id;
        });
        return map;
    }, [apiPlans]);

    const formatPrice = (price: number) => {
        if (isKo) {
            return `₩${price.toLocaleString()}`;
        }
        return `$${price.toFixed(2)}`;
    };

    // 동적 기능 목록 생성
    const getFeatureList = (plan: typeof plans[0]) => {
        const features: string[] = [];
        
        // 토론 생성 제한
        if (plan.maxDiscussions === null) {
            features.push(isKo ? '토론 생성 무제한' : 'Unlimited discussions');
        } else {
            features.push(isKo ? `월 ${plan.maxDiscussions}개 토론 생성` : `${plan.maxDiscussions} discussions/month`);
        }
        
        // 동시 토론 제한
        if (plan.maxActive === null) {
            features.push(isKo ? '동시 진행 무제한' : 'Unlimited active discussions');
        } else {
            features.push(isKo ? `동시 진행 토론 ${plan.maxActive}개` : `${plan.maxActive} active at a time`);
        }
        
        // 참가자 제한
        if (plan.maxParticipants === null) {
            features.push(isKo ? '참여 인원 무제한' : 'Unlimited participants');
        } else {
            features.push(isKo ? `세션당 최대 ${plan.maxParticipants}명` : `Up to ${plan.maxParticipants} participants`);
        }
        
        // 주요 기능들
        if (plan.features?.analytics) {
            features.push(isKo ? '상세 분석 리포트' : 'Advanced Analytics');
        }
        if (plan.features?.export) {
            features.push(isKo ? '데이터 내보내기' : 'Data Export');
        }
        if (plan.features?.prioritySupport) {
            features.push(isKo ? '우선 기술 지원' : 'Priority Support');
        }
        if (plan.features?.apiAccess) {
            features.push(isKo ? 'API 액세스' : 'API Access');
        }
        if (plan.features?.sso) {
            features.push(isKo ? 'SSO 연동' : 'SSO Integration');
        }
        if (plan.features?.dedicatedSupport) {
            features.push(isKo ? '전담 매니저' : 'Dedicated Manager');
        }
        
        return features.slice(0, 5); // 최대 5개
    };

    // 결제 시작 핸들러
    const handleCheckout = useCallback(async (planKey: string) => {
        if (planKey === 'free') {
            // 무료 플랜은 회원가입으로 이동
            router.push(`/${locale}/register`);
            return;
        }

        if (planKey === 'institution') {
            // 기관 플랜은 영업팀 문의
            window.location.href = 'mailto:sales@agora.edu';
            return;
        }

        setLoadingPlan(planKey);

        try {
            const planId = planIdsByKey[planKey];
            if (!planId) {
                setLoadingPlan(null);
                toast.error('요금제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
                return;
            }
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    billingInterval: isYearly ? 'yearly' : 'monthly',
                    locale,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error(isKo ? '로그인이 필요합니다.' : 'Login required.');
                    router.push(`/${locale}/login?redirect=/${locale}/pricing`);
                    return;
                }
                if (response.status === 403 && data.code === 'STUDENT_NOT_ALLOWED') {
                    toast.error(
                        isKo 
                            ? '학생 계정은 구독 결제가 불가능합니다. 강사 계정으로 로그인해 주세요.' 
                            : 'Student accounts cannot subscribe. Please log in with an instructor account.'
                    );
                    return;
                }
                const message = data.code === 'PLAN_NOT_FOUND' && data.hint
                    ? `${data.error} ${data.hint}`
                    : (data.error || (isKo ? '결제 처리 중 오류가 발생했습니다.' : 'Payment processing error.'));
                throw new Error(message);
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
    }, [isYearly, isKo, locale, router, planIdsByKey]);

    // 그리드 컬럼 수 동적 계산
    const gridCols = plans.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

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

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    /* Grid */
                    <div className={cn("grid md:grid-cols-2 gap-6", gridCols)}>
                        {plans.map((plan, index) => {
                            const featureList = getFeatureList(plan);
                            
                            return (
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
                                            {plan.displayName}
                                        </h3>
                                        <div className="flex items-baseline gap-1">
                                            {plan.price !== null && plan.price !== undefined && (plan.price > 0 || plan.key === 'free') ? (
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
                                        {/* 연간 할인 표시 (무료 플랜 제외) */}
                                        {isYearly && plan.key !== 'free' && plan.originalPrice && plan.originalPrice > 0 && plan.price && plan.price < plan.originalPrice && (
                                            <p className="mt-1 text-xs text-primary">
                                                {isKo ? `월 ${formatPrice(plan.originalPrice)}에서 할인` : `Save from ${formatPrice(plan.originalPrice)}/mo`}
                                            </p>
                                        )}
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
                                                {isKo ? '처리 중...' : 'Processing...'}
                                            </>
                                        ) : (
                                            <>
                                                {t(`plans.${plan.key}.cta`)}
                                                {plan.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
                                            </>
                                        )}
                                    </button>

                                    {/* Features - 동적으로 생성 */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                            {t('featuresLabel')}
                                        </p>
                                        <ul className="space-y-3">
                                            {featureList.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm">
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                                        "bg-primary/10 text-primary"
                                                    )}>
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                    <span className="leading-tight text-zinc-600">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
