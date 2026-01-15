/**
 * Toss Payments Integration
 *
 * Handles Toss Payments processing for Korean market subscriptions.
 * Supports card payments, Kakao Pay, Naver Pay, and bank transfers.
 *
 * API Documentation: https://docs.tosspayments.com/
 */

import { createSupabaseAdminClient } from './supabase-server'
import { getPlanById } from './subscription'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOSS_API_URL = 'https://api.tosspayments.com/v1'

interface TossConfig {
  secretKey: string
  clientKey: string
}

function getTossConfig(): TossConfig {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

  if (!secretKey) {
    throw new Error('TOSS_PAYMENTS_SECRET_KEY is not configured')
  }

  if (!clientKey) {
    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY is not configured')
  }

  return { secretKey, clientKey }
}

function getAuthHeader(): string {
  const { secretKey } = getTossConfig()
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

// ============================================================================
// TYPES
// ============================================================================

export interface TossBillingKeyResponse {
  mId: string
  customerKey: string
  authenticatedAt: string
  method: string
  billingKey: string
  card?: {
    issuerCode: string
    acquirerCode: string
    number: string
    cardType: string
    ownerType: string
  }
}

export interface TossPaymentResponse {
  mId: string
  version: string
  paymentKey: string
  orderId: string
  orderName: string
  currency: string
  method: string
  status: TossPaymentStatus
  requestedAt: string
  approvedAt?: string
  totalAmount: number
  balanceAmount: number
  suppliedAmount: number
  vat: number
  receipt?: {
    url: string
  }
  card?: {
    issuerCode: string
    acquirerCode: string
    number: string
    installmentPlanMonths: number
    isInterestFree: boolean
    interestPayer?: string
    approveNo: string
    useCardPoint: boolean
    cardType: string
    ownerType: string
    acquireStatus: string
    receiptUrl?: string
  }
  failure?: {
    code: string
    message: string
  }
}

export type TossPaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED'

export interface TossWebhookPayload {
  eventType: 'PAYMENT_STATUS_CHANGED' | 'BILLING_STATUS_CHANGED'
  createdAt: string
  data: {
    paymentKey?: string
    orderId?: string
    status?: TossPaymentStatus
    billingKey?: string
    customerKey?: string
  }
}

// ============================================================================
// BILLING KEY MANAGEMENT
// ============================================================================

/**
 * Issue a billing key for recurring payments
 * This is called after the user completes card registration on the client
 */
export async function issueBillingKey(params: {
  customerKey: string
  authKey: string  // From client-side card registration widget
}): Promise<TossBillingKeyResponse> {
  const response = await fetch(
    `${TOSS_API_URL}/billing/authorizations/issue`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey: params.customerKey,
        authKey: params.authKey,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

/**
 * Get billing key information
 */
export async function getBillingKey(
  customerKey: string,
  billingKey: string
): Promise<TossBillingKeyResponse | null> {
  const response = await fetch(
    `${TOSS_API_URL}/billing/authorizations/${billingKey}`,
    {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

/**
 * Delete a billing key (unregister card)
 */
export async function deleteBillingKey(
  customerKey: string,
  billingKey: string
): Promise<void> {
  const response = await fetch(
    `${TOSS_API_URL}/billing/authorizations/${billingKey}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerKey }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

/**
 * Charge a subscription payment using billing key
 */
export async function chargeSubscription(params: {
  billingKey: string
  customerKey: string
  amount: number
  orderId: string
  orderName: string
  customerEmail?: string
  customerName?: string
  taxFreeAmount?: number
}): Promise<TossPaymentResponse> {
  const response = await fetch(
    `${TOSS_API_URL}/billing/${params.billingKey}`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey: params.customerKey,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        taxFreeAmount: params.taxFreeAmount || 0,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

/**
 * Confirm a payment (for one-time payments)
 */
export async function confirmPayment(params: {
  paymentKey: string
  orderId: string
  amount: number
}): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

/**
 * Get payment details by payment key
 */
export async function getPayment(
  paymentKey: string
): Promise<TossPaymentResponse> {
  const response = await fetch(
    `${TOSS_API_URL}/payments/${paymentKey}`,
    {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

/**
 * Get payment details by order ID
 */
export async function getPaymentByOrderId(
  orderId: string
): Promise<TossPaymentResponse> {
  const response = await fetch(
    `${TOSS_API_URL}/payments/orders/${orderId}`,
    {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

// ============================================================================
// CANCELLATION & REFUNDS
// ============================================================================

/**
 * Cancel a payment (full or partial refund)
 */
export async function cancelPayment(params: {
  paymentKey: string
  cancelReason: string
  cancelAmount?: number  // For partial refund
  refundReceiveAccount?: {
    bank: string
    accountNumber: string
    holderName: string
  }
}): Promise<TossPaymentResponse> {
  const body: Record<string, unknown> = {
    cancelReason: params.cancelReason,
  }

  if (params.cancelAmount !== undefined) {
    body.cancelAmount = params.cancelAmount
  }

  if (params.refundReceiveAccount) {
    body.refundReceiveAccount = params.refundReceiveAccount
  }

  const response = await fetch(
    `${TOSS_API_URL}/payments/${params.paymentKey}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TossPaymentError(error.code, error.message)
  }

  return response.json()
}

// ============================================================================
// CHECKOUT SESSION
// ============================================================================

export interface CreateTossCheckoutParams {
  userId: string
  userEmail: string
  userName?: string
  planId: string
  billingInterval: 'monthly' | 'yearly'
  successUrl: string
  failUrl: string
}

/**
 * Create checkout parameters for Toss Payments widget
 * Returns data needed for client-side payment widget initialization
 */
export async function createCheckoutParams(
  params: CreateTossCheckoutParams
): Promise<{
  customerKey: string
  orderId: string
  orderName: string
  amount: number
  successUrl: string
  failUrl: string
}> {
  const plan = await getPlanById(params.planId)
  if (!plan) {
    throw new Error('Plan not found')
  }

  const amount =
    params.billingInterval === 'monthly'
      ? plan.priceMonthlyKrw
      : plan.priceYearlyKrw

  if (!amount) {
    throw new Error('Plan price not configured for KRW')
  }

  // Generate unique customer key and order ID
  const customerKey = `agora_${params.userId}`
  const orderId = `agora_${params.planId}_${Date.now()}`

  const intervalLabel =
    params.billingInterval === 'monthly' ? '월간' : '연간'
  const orderName = `Agora ${plan.displayNameKo} ${intervalLabel} 구독`

  return {
    customerKey,
    orderId,
    orderName,
    amount,
    successUrl: `${params.successUrl}?orderId=${orderId}&planId=${params.planId}&interval=${params.billingInterval}`,
    failUrl: `${params.failUrl}?orderId=${orderId}`,
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Process subscription renewal
 * Called by a scheduled job or webhook to charge recurring payments
 */
export async function processSubscriptionRenewal(params: {
  userId: string
  subscriptionId: string
  billingKey: string
  customerKey: string
  planId: string
  billingInterval: 'monthly' | 'yearly'
}): Promise<TossPaymentResponse> {
  const plan = await getPlanById(params.planId)
  if (!plan) {
    throw new Error('Plan not found')
  }

  const amount =
    params.billingInterval === 'monthly'
      ? plan.priceMonthlyKrw
      : plan.priceYearlyKrw

  if (!amount) {
    throw new Error('Plan price not configured for KRW')
  }

  const orderId = `agora_renewal_${params.subscriptionId}_${Date.now()}`
  const intervalLabel =
    params.billingInterval === 'monthly' ? '월간' : '연간'
  const orderName = `Agora ${plan.displayNameKo} ${intervalLabel} 구독 갱신`

  return chargeSubscription({
    billingKey: params.billingKey,
    customerKey: params.customerKey,
    amount,
    orderId,
    orderName,
  })
}

/**
 * Cancel a Toss subscription
 * Marks subscription as canceled and optionally refunds if within period
 */
export async function cancelTossSubscription(
  subscriptionId: string,
  refund: boolean = false
): Promise<void> {
  const supabase = await createSupabaseAdminClient()

  // Get subscription details
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .eq('payment_provider', 'toss')
    .single()

  if (error || !subscription) {
    throw new Error('Subscription not found')
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      cancel_at_period_end: !refund, // If not refunding, cancel at period end
    })
    .eq('id', subscriptionId)

  // If refunding, cancel the billing key
  if (refund && subscription.toss_billing_key && subscription.toss_customer_key) {
    try {
      await deleteBillingKey(
        subscription.toss_customer_key,
        subscription.toss_billing_key
      )
    } catch (error) {
      console.error('Failed to delete billing key:', error)
      // Continue even if billing key deletion fails
    }
  }
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify Toss webhook signature
 * Toss uses a different webhook verification method than Stripe
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const crypto = require('crypto')
  const { secretKey } = getTossConfig()

  const signatureData = `${timestamp}${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureData)
    .digest('base64')

  return signature === expectedSignature
}

/**
 * Parse Toss webhook payload
 */
export function parseWebhookPayload(body: string): TossWebhookPayload {
  return JSON.parse(body)
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class TossPaymentError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TossPaymentError'
    this.code = code
  }
}

/**
 * Get user-friendly error message in Korean
 */
export function getTossErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    // Common errors
    INVALID_REQUEST: '요청이 올바르지 않습니다.',
    UNAUTHORIZED: '인증에 실패했습니다.',
    FORBIDDEN: '접근 권한이 없습니다.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',

    // Payment errors
    ALREADY_PROCESSED_PAYMENT: '이미 처리된 결제입니다.',
    PROVIDER_ERROR: '결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    EXCEED_MAX_CARD_INSTALLMENT_PLAN: '할부 개월 수가 초과되었습니다.',
    NOT_ALLOWED_POINT_USE: '포인트 사용이 불가합니다.',
    INVALID_CARD_LOST_OR_STOLEN: '분실 또는 도난 카드입니다.',
    RESTRICTED_CARD: '사용이 제한된 카드입니다.',
    EXCEED_MAX_DAILY_PAYMENT_COUNT: '일일 결제 횟수를 초과했습니다.',
    EXCEED_MAX_PAYMENT_AMOUNT: '결제 금액 한도를 초과했습니다.',
    NOT_AVAILABLE_BANK: '은행 점검 중입니다.',
    INVALID_PASSWORD: '카드 비밀번호가 올바르지 않습니다.',

    // Billing errors
    INVALID_BILLING_KEY: '빌링키가 유효하지 않습니다.',
    BILLING_KEY_EXPIRED: '빌링키가 만료되었습니다.',
    BILLING_KEY_DELETED: '삭제된 빌링키입니다.',
  }

  return (
    errorMessages[code] ||
    '결제 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요.'
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format amount for display (Korean Won)
 */
export function formatTossAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Generate unique customer key for a user
 */
export function generateCustomerKey(userId: string): string {
  return `agora_${userId}`
}

/**
 * Generate unique order ID for a transaction
 */
export function generateOrderId(
  prefix: string = 'agora',
  subscriptionId?: string
): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  if (subscriptionId) {
    return `${prefix}_${subscriptionId}_${timestamp}_${random}`
  }

  return `${prefix}_${timestamp}_${random}`
}

/**
 * Check if Toss Payments is configured
 */
export function isTossConfigured(): boolean {
  try {
    getTossConfig()
    return true
  } catch {
    return false
  }
}

/**
 * Get Toss client key for frontend widget
 */
export function getTossClientKey(): string {
  return getTossConfig().clientKey
}
