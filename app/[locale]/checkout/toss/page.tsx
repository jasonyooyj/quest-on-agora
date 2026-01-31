'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { TossPaymentWidget } from '@/components/subscription/TossPaymentWidget'
import { Loader2 } from 'lucide-react'

function TossCheckoutContent() {
  const searchParams = useSearchParams()

  const clientKey = searchParams.get('clientKey')
  const customerKey = searchParams.get('customerKey')
  const amount = searchParams.get('amount')
  const orderId = searchParams.get('orderId')
  const orderName = searchParams.get('orderName')
  const successUrl = searchParams.get('successUrl')
  const failUrl = searchParams.get('failUrl')

  // 필수 파라미터 검증
  if (!clientKey || !customerKey || !amount || !orderId || !orderName || !successUrl || !failUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">잘못된 접근</h1>
          <p className="text-muted-foreground">결제 정보가 올바르지 않습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <TossPaymentWidget
        clientKey={clientKey}
        customerKey={customerKey}
        amount={Number(amount)}
        orderId={orderId}
        orderName={decodeURIComponent(orderName)}
        successUrl={successUrl}
        failUrl={failUrl}
        onError={(error) => console.error('Toss payment error:', error)}
      />
    </div>
  )
}

export default function TossCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TossCheckoutContent />
    </Suspense>
  )
}
