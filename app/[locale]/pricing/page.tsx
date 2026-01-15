'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap, Building2, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { cn } from '@/lib/utils'

interface Plan {
  id: string
  name: string
  display_name_ko: string
  tier: number
  max_discussions_per_month: number | null
  max_active_discussions: number | null
  max_participants_per_discussion: number | null
  features: {
    analytics: boolean
    export: boolean
    reports: boolean
    customAiModes: boolean
    prioritySupport: boolean
    organizationManagement: boolean
  }
  price_monthly_krw: number | null
  price_yearly_krw: number | null
}

type BillingInterval = 'monthly' | 'yearly'

export default function PricingPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/checkout')
        const data = await response.json()
        setPlans(data.plans || [])
      } catch (error) {
        console.error('Failed to fetch plans:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.name === 'free') {
      router.push('/register')
      return
    }

    if (plan.name === 'institution') {
      window.location.href = 'mailto:sales@agora.edu?subject=기관%20요금제%20문의'
      return
    }

    setCheckoutLoading(plan.id)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingInterval,
          locale: 'ko',
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return '문의'
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const getPrice = (plan: Plan) => {
    if (billingInterval === 'yearly') {
      return plan.price_yearly_krw
    }
    return plan.price_monthly_krw
  }

  const getPlanIcon = (name: string) => {
    switch (name) {
      case 'free':
        return <Sparkles className="w-6 h-6" />
      case 'pro':
        return <Zap className="w-6 h-6" />
      case 'institution':
        return <Building2 className="w-6 h-6" />
      default:
        return null
    }
  }

  const features = [
    { key: 'discussions', label: '월간 토론 생성', getValue: (p: Plan) => p.max_discussions_per_month === null ? '무제한' : `${p.max_discussions_per_month}개` },
    { key: 'active', label: '동시 진행 토론', getValue: (p: Plan) => p.max_active_discussions === null ? '무제한' : `${p.max_active_discussions}개` },
    { key: 'participants', label: '토론당 참가자', getValue: (p: Plan) => p.max_participants_per_discussion === null ? '무제한' : `${p.max_participants_per_discussion}명` },
    { key: 'analytics', label: '분석 대시보드', getValue: (p: Plan) => p.features.analytics },
    { key: 'export', label: 'CSV/PDF 내보내기', getValue: (p: Plan) => p.features.export },
    { key: 'reports', label: '토론 리포트', getValue: (p: Plan) => p.features.reports },
    { key: 'customAiModes', label: 'AI 모드 설정', getValue: (p: Plan) => p.features.customAiModes },
    { key: 'prioritySupport', label: '우선 지원', getValue: (p: Plan) => p.features.prioritySupport },
    { key: 'organizationManagement', label: '기관 관리', getValue: (p: Plan) => p.features.organizationManagement },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-zinc-100 text-zinc-600 text-sm font-medium rounded-full mb-6">
              요금제
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
                필요한 만큼만 사용하세요
              </span>
            </h1>
            <p className="text-zinc-600 text-lg max-w-2xl mx-auto">
              무료로 시작하고, 필요할 때 업그레이드하세요.
              14일 무료 체험으로 Pro 요금제를 경험해 보세요.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center p-1 bg-zinc-100 rounded-full">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={cn(
                  'px-6 py-2 rounded-full text-sm font-medium transition-all',
                  billingInterval === 'monthly'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                월간 결제
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={cn(
                  'px-6 py-2 rounded-full text-sm font-medium transition-all',
                  billingInterval === 'yearly'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                연간 결제
                <span className="ml-2 text-xs text-emerald-600 font-semibold">2개월 무료</span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative p-8 rounded-3xl border transition-all',
                  plan.name === 'pro'
                    ? 'bg-gradient-to-b from-indigo-50 to-white border-indigo-200 shadow-xl scale-105'
                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-lg'
                )}
              >
                {plan.name === 'pro' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-full">
                      인기
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'p-2 rounded-xl',
                    plan.name === 'pro' ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-600'
                  )}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <h3 className="text-xl font-bold">{plan.display_name_ko}</h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {getPrice(plan) === 0 ? '무료' : `₩${formatPrice(getPrice(plan))}`}
                    </span>
                    {getPrice(plan) !== null && getPrice(plan) !== 0 && (
                      <span className="text-zinc-500">
                        /{billingInterval === 'monthly' ? '월' : '년'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={checkoutLoading === plan.id}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl font-medium transition-all mb-8',
                    plan.name === 'pro'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90'
                      : plan.name === 'institution'
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
                    checkoutLoading === plan.id && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {checkoutLoading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      처리 중...
                    </span>
                  ) : plan.name === 'free' ? (
                    '무료로 시작'
                  ) : plan.name === 'institution' ? (
                    '문의하기'
                  ) : (
                    '14일 무료 체험'
                  )}
                </button>

                <ul className="space-y-3">
                  {features.map((feature) => {
                    const value = feature.getValue(plan)
                    const isBoolean = typeof value === 'boolean'
                    const isEnabled = isBoolean ? value : true

                    return (
                      <li key={feature.key} className="flex items-center gap-3">
                        {isEnabled ? (
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-zinc-300 flex-shrink-0" />
                        )}
                        <span className={cn(
                          'text-sm',
                          isEnabled ? 'text-zinc-700' : 'text-zinc-400'
                        )}>
                          {feature.label}
                          {!isBoolean && (
                            <span className="font-medium ml-1">{value}</span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">자주 묻는 질문</h2>
            <div className="space-y-4">
              <details className="group p-6 bg-white rounded-2xl border border-zinc-200">
                <summary className="flex items-center justify-between cursor-pointer font-medium">
                  무료 체험은 어떻게 이용하나요?
                  <span className="ml-2 transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="mt-4 text-zinc-600 text-sm">
                  Pro 요금제를 선택하시면 14일간 무료로 모든 기능을 사용할 수 있습니다.
                  체험 기간 중 언제든 취소할 수 있으며, 취소 시 요금이 청구되지 않습니다.
                </p>
              </details>

              <details className="group p-6 bg-white rounded-2xl border border-zinc-200">
                <summary className="flex items-center justify-between cursor-pointer font-medium">
                  결제 방법은 무엇인가요?
                  <span className="ml-2 transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="mt-4 text-zinc-600 text-sm">
                  신용카드, 체크카드, 카카오페이, 네이버페이 등 다양한 결제 수단을 지원합니다.
                  해외 카드도 사용 가능합니다.
                </p>
              </details>

              <details className="group p-6 bg-white rounded-2xl border border-zinc-200">
                <summary className="flex items-center justify-between cursor-pointer font-medium">
                  요금제를 변경할 수 있나요?
                  <span className="ml-2 transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="mt-4 text-zinc-600 text-sm">
                  언제든 요금제를 업그레이드하거나 다운그레이드할 수 있습니다.
                  업그레이드 시 차액만 결제되며, 다운그레이드 시 다음 결제일부터 적용됩니다.
                </p>
              </details>

              <details className="group p-6 bg-white rounded-2xl border border-zinc-200">
                <summary className="flex items-center justify-between cursor-pointer font-medium">
                  기관 요금제는 어떻게 이용하나요?
                  <span className="ml-2 transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="mt-4 text-zinc-600 text-sm">
                  기관 요금제는 대학교, 학원 등 여러 교수자가 함께 사용하는 경우에 적합합니다.
                  기관의 규모와 요구사항에 맞춰 맞춤형 견적을 제공해 드립니다.
                  sales@agora.edu로 문의해 주세요.
                </p>
              </details>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
