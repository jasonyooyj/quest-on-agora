'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, AlertCircle } from 'lucide-react'

declare global {
  interface Window {
    TossPayments: new (clientKey: string) => TossPaymentsInstance
  }
}

interface TossPaymentsInstance {
  widgets: (options: { customerKey: string }) => TossWidgets
}

interface TossWidgets {
  setAmount: (amount: { currency: string; value: number }) => Promise<void>
  renderPaymentMethods: (options: {
    selector: string
    variantKey?: string
  }) => Promise<void>
  renderAgreement: (options: { selector: string; variantKey?: string }) => Promise<void>
  requestPayment: (options: {
    orderId: string
    orderName: string
    successUrl: string
    failUrl: string
    customerEmail?: string
    customerName?: string
  }) => Promise<void>
}

interface TossPaymentWidgetProps {
  clientKey: string
  customerKey: string
  amount: number
  orderId: string
  orderName: string
  successUrl: string
  failUrl: string
  customerEmail?: string
  customerName?: string
  onReady?: () => void
  onError?: (error: Error) => void
}

/**
 * 토스페이먼츠 결제 위젯 컴포넌트
 *
 * 결제 수단 선택과 약관 동의를 포함한 완전한 결제 UI를 제공합니다.
 * 토스페이먼츠 SDK v2를 사용합니다.
 */
export function TossPaymentWidget({
  clientKey,
  customerKey,
  amount,
  orderId,
  orderName,
  successUrl,
  failUrl,
  customerEmail,
  customerName,
  onReady,
  onError,
}: TossPaymentWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const widgetsRef = useRef<TossWidgets | null>(null)
  const paymentMethodsRef = useRef<HTMLDivElement>(null)
  const agreementRef = useRef<HTMLDivElement>(null)

  // SDK 로드 및 초기화
  useEffect(() => {
    const loadTossSDK = async () => {
      try {
        // 결제 위젯 SDK는 '결제위젯 연동 키'(클라이언트 키에 gck 포함)만 지원함. API 개별 연동 키(ck)는 사용 불가.
        const isWidgetKey = /gck/i.test(clientKey)
        if (!isWidgetKey) {
          const msg =
            '결제 위젯은 "결제위젯 연동 키"의 클라이언트 키로 연동해주세요. 개발자센터 → 결제위젯 연동 키(클라이언트 키에 gck 포함)를 발급받아 NEXT_PUBLIC_TOSS_CLIENT_KEY에 설정하고, 같은 세트의 시크릿 키를 TOSS_PAYMENTS_SECRET_KEY에 설정하세요. API 개별 연동 키(ck)는 위젯에서 지원하지 않습니다.'
          setError(msg)
          setIsLoading(false)
          onError?.(new Error(msg))
          return
        }

        // SDK가 이미 로드되어 있는지 확인
        if (!window.TossPayments) {
          const script = document.createElement('script')
          script.src = 'https://js.tosspayments.com/v2/standard'
          script.async = true

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('토스페이먼츠 SDK 로드 실패'))
            document.head.appendChild(script)
          })
        }

        // TossPayments 인스턴스 생성 (결제위젯 연동 키 사용)
        const tossPayments = new window.TossPayments(clientKey)
        const widgets = tossPayments.widgets({ customerKey })

        // 금액 설정
        await widgets.setAmount({ currency: 'KRW', value: amount })

        // 결제 수단 위젯 렌더링
        if (paymentMethodsRef.current) {
          await widgets.renderPaymentMethods({
            selector: '#payment-methods',
            variantKey: 'DEFAULT',
          })
        }

        // 약관 동의 위젯 렌더링
        if (agreementRef.current) {
          await widgets.renderAgreement({
            selector: '#agreement',
            variantKey: 'AGREEMENT',
          })
        }

        widgetsRef.current = widgets
        setIsReady(true)
        setIsLoading(false)
        onReady?.()

      } catch (err) {
        const error = err instanceof Error ? err : new Error('결제 위젯 초기화 실패')
        console.error('Toss SDK 초기화 오류:', error)
        setError(error.message)
        setIsLoading(false)
        onError?.(error)
      }
    }

    loadTossSDK()
  }, [clientKey, customerKey, amount, onReady, onError])

  // 결제 요청
  const handlePayment = useCallback(async () => {
    if (!widgetsRef.current || !isReady) {
      setError('결제 위젯이 준비되지 않았습니다.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerEmail,
        customerName,
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('결제 요청 실패')
      console.error('결제 요청 오류:', error)
      setError(error.message)
      setIsProcessing(false)
    }
  }, [orderId, orderName, successUrl, failUrl, customerEmail, customerName, isReady])

  // 금액 포맷팅
  const formattedAmount = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount)

  return (
    <Card className="w-full max-w-lg mx-auto border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          결제 정보 입력
        </CardTitle>
        <CardDescription>
          {orderName} - {formattedAmount}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">결제 위젯을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 결제 수단 선택 */}
            <div
              id="payment-methods"
              ref={paymentMethodsRef}
              className="min-h-[200px]"
            />

            {/* 약관 동의 */}
            <div
              id="agreement"
              ref={agreementRef}
              className="min-h-[100px]"
            />

            {/* 결제 버튼 */}
            <Button
              onClick={handlePayment}
              disabled={!isReady || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  결제 처리 중...
                </>
              ) : (
                `${formattedAmount} 결제하기`
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              결제 진행 시 서비스 이용약관에 동의하게 됩니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 빌링키 등록 위젯 (정기결제용)
 *
 * 카드 정보를 등록하고 빌링키를 발급받습니다.
 */
interface TossBillingWidgetProps {
  clientKey: string
  customerKey: string
  onSuccess: (authKey: string) => void
  onError?: (error: Error) => void
}

export function TossBillingWidget({
  clientKey,
  customerKey,
  onSuccess,
  onError,
}: TossBillingWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadWidget = async () => {
      try {
        if (!window.TossPayments) {
          const script = document.createElement('script')
          script.src = 'https://js.tosspayments.com/v2/standard'
          script.async = true

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('SDK 로드 실패'))
            document.head.appendChild(script)
          })
        }

        // 빌링 위젯은 별도 구현 필요
        // 현재는 기본 결제 위젯으로 대체
        setIsLoading(false)

      } catch (err) {
        const error = err instanceof Error ? err : new Error('위젯 로드 실패')
        setError(error.message)
        setIsLoading(false)
        onError?.(error)
      }
    }

    loadWidget()
  }, [clientKey, customerKey, onError])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div id="billing-widget" className="min-h-[300px]">
      {/* 빌링 위젯 렌더링 영역 */}
    </div>
  )
}
