'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface SubscriptionResult {
  planName: string
  billingInterval: 'monthly' | 'yearly'
  currentPeriodEnd: string
}

export default function CheckoutSuccessPage() {
  const t = useTranslations('Checkout')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [subscription, setSubscription] = useState<SubscriptionResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Toss 결제 성공 처리
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const planId = searchParams.get('planId')
  const interval = searchParams.get('interval') as 'monthly' | 'yearly' | null

  useEffect(() => {
    async function processPayment() {
      try {
        if (paymentKey && orderId && amount && planId && interval) {
          // Toss 결제 확인
          const response = await fetch('/api/checkout/toss/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentKey,
              orderId,
              amount: Number(amount),
              planId,
              billingInterval: interval,
            }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            setStatus('success')
            setSubscription(data.subscription)
          } else {
            setStatus('error')
            setErrorMessage(data.error || '결제 처리 중 오류가 발생했습니다.')
          }
        } else {
          // 잘못된 접근
          setStatus('error')
          setErrorMessage('잘못된 접근입니다.')
        }
      } catch (error) {
        console.error('Payment processing error:', error)
        setStatus('error')
        setErrorMessage('결제 처리 중 오류가 발생했습니다.')
      }
    }

    processPayment()
  }, [paymentKey, orderId, amount, planId, interval])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPlanDisplayName = (planName: string) => {
    const names: Record<string, string> = {
      free: '무료',
      pro: 'Pro',
      institution: '기관',
    }
    return names[planName] || planName
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-2">
          {status === 'loading' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
                <CardTitle className="text-2xl">결제 처리 중...</CardTitle>
                <CardDescription>잠시만 기다려 주세요.</CardDescription>
              </CardHeader>
            </>
          )}

          {status === 'success' && (
            <>
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4"
                >
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </motion.div>
                <CardTitle className="text-2xl">결제 완료!</CardTitle>
                <CardDescription>구독이 성공적으로 시작되었습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription && (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">요금제</span>
                      <span className="font-semibold">
                        {getPlanDisplayName(subscription.planName)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">결제 주기</span>
                      <span className="font-semibold">
                        {subscription.billingInterval === 'monthly' ? '월간' : '연간'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">다음 결제일</span>
                      <span className="font-semibold">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Link href={`/${locale}/instructor`} className="block">
                    <Button className="w-full" size="lg">
                      대시보드로 이동
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/${locale}/pricing`} className="block">
                    <Button variant="outline" className="w-full">
                      요금제 확인
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {status === 'error' && (
            <>
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4"
                >
                  <XCircle className="h-16 w-16 text-destructive" />
                </motion.div>
                <CardTitle className="text-2xl">결제 실패</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/${locale}/pricing`} className="block">
                  <Button className="w-full" size="lg">
                    다시 시도
                  </Button>
                </Link>
                <Link href={`/${locale}`} className="block">
                  <Button variant="outline" className="w-full">
                    홈으로 돌아가기
                  </Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
