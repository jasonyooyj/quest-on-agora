import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

// Mock Supabase
vi.mock('./supabase-server', () => ({
  createSupabaseAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  }),
}))

// Mock subscription
vi.mock('./subscription', () => ({
  getPlanById: vi.fn(),
}))

const originalEnv = { ...process.env }

describe('toss-payments', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('TossPaymentError', () => {
    it('creates error with code and message', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { TossPaymentError } = await import('./toss-payments')

      const error = new TossPaymentError('INVALID_REQUEST', 'Bad request')

      expect(error.name).toBe('TossPaymentError')
      expect(error.code).toBe('INVALID_REQUEST')
      expect(error.message).toBe('Bad request')
    })

    it('is an instance of Error', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { TossPaymentError } = await import('./toss-payments')

      const error = new TossPaymentError('TEST', 'Test message')

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('getTossErrorMessage', () => {
    it('returns Korean error message for known codes', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { getTossErrorMessage } = await import('./toss-payments')

      expect(getTossErrorMessage('INVALID_REQUEST')).toBe('요청이 올바르지 않습니다.')
      expect(getTossErrorMessage('UNAUTHORIZED')).toBe('인증에 실패했습니다.')
      expect(getTossErrorMessage('FORBIDDEN')).toBe('접근 권한이 없습니다.')
      expect(getTossErrorMessage('NOT_FOUND')).toBe('요청한 리소스를 찾을 수 없습니다.')
    })

    it('returns Korean error message for payment errors', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { getTossErrorMessage } = await import('./toss-payments')

      expect(getTossErrorMessage('ALREADY_PROCESSED_PAYMENT')).toBe('이미 처리된 결제입니다.')
      expect(getTossErrorMessage('INVALID_CARD_LOST_OR_STOLEN')).toBe('분실 또는 도난 카드입니다.')
      expect(getTossErrorMessage('RESTRICTED_CARD')).toBe('사용이 제한된 카드입니다.')
      expect(getTossErrorMessage('EXCEED_MAX_PAYMENT_AMOUNT')).toBe('결제 금액 한도를 초과했습니다.')
    })

    it('returns Korean error message for billing errors', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { getTossErrorMessage } = await import('./toss-payments')

      expect(getTossErrorMessage('INVALID_BILLING_KEY')).toBe('빌링키가 유효하지 않습니다.')
      expect(getTossErrorMessage('BILLING_KEY_EXPIRED')).toBe('빌링키가 만료되었습니다.')
      expect(getTossErrorMessage('BILLING_KEY_DELETED')).toBe('삭제된 빌링키입니다.')
    })

    it('returns default message for unknown codes', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { getTossErrorMessage } = await import('./toss-payments')

      expect(getTossErrorMessage('UNKNOWN_ERROR_CODE')).toBe(
        '결제 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요.'
      )
    })
  })

  describe('formatTossAmount', () => {
    it('formats KRW amounts with proper Korean locale', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { formatTossAmount } = await import('./toss-payments')

      expect(formatTossAmount(10000)).toBe('\u20a910,000')
      expect(formatTossAmount(25900)).toBe('\u20a925,900')
      expect(formatTossAmount(1000000)).toBe('\u20a91,000,000')
    })

    it('handles zero amount', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { formatTossAmount } = await import('./toss-payments')

      expect(formatTossAmount(0)).toBe('\u20a90')
    })
  })

  describe('generateCustomerKey', () => {
    it('generates customer key with agora prefix', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { generateCustomerKey } = await import('./toss-payments')

      expect(generateCustomerKey('user-123')).toBe('agora_user-123')
      expect(generateCustomerKey('abc-def-ghi')).toBe('agora_abc-def-ghi')
    })
  })

  describe('generateOrderId', () => {
    it('generates order ID with default prefix', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { generateOrderId } = await import('./toss-payments')

      const orderId = generateOrderId()

      expect(orderId).toMatch(/^agora_\d+_[a-z0-9]+$/)
    })

    it('generates order ID with custom prefix', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { generateOrderId } = await import('./toss-payments')

      const orderId = generateOrderId('custom')

      expect(orderId).toMatch(/^custom_\d+_[a-z0-9]+$/)
    })

    it('includes subscription ID when provided', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { generateOrderId } = await import('./toss-payments')

      const orderId = generateOrderId('agora', 'sub-123')

      expect(orderId).toMatch(/^agora_sub-123_\d+_[a-z0-9]+$/)
    })

    it('generates unique order IDs', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { generateOrderId } = await import('./toss-payments')

      const orderIds = new Set<string>()
      for (let i = 0; i < 100; i++) {
        orderIds.add(generateOrderId())
      }

      expect(orderIds.size).toBe(100)
    })
  })

  describe('isTossConfigured', () => {
    it('returns true when both keys are configured', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { isTossConfigured } = await import('./toss-payments')

      expect(isTossConfigured()).toBe(true)
    })

    it('returns false when secret key is missing', async () => {
      delete process.env.TOSS_PAYMENTS_SECRET_KEY
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { isTossConfigured } = await import('./toss-payments')

      expect(isTossConfigured()).toBe(false)
    })

    it('returns false when client key is missing', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      vi.resetModules()

      const { isTossConfigured } = await import('./toss-payments')

      expect(isTossConfigured()).toBe(false)
    })

    it('returns false when both keys are missing', async () => {
      delete process.env.TOSS_PAYMENTS_SECRET_KEY
      delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      vi.resetModules()

      const { isTossConfigured } = await import('./toss-payments')

      expect(isTossConfigured()).toBe(false)
    })
  })

  describe('getTossClientKey', () => {
    it('returns the client key when configured', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_client_key_abc'
      vi.resetModules()

      const { getTossClientKey } = await import('./toss-payments')

      expect(getTossClientKey()).toBe('test_client_key_abc')
    })

    it('throws when client key is not configured', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      vi.resetModules()

      const { getTossClientKey } = await import('./toss-payments')

      expect(() => getTossClientKey()).toThrow('NEXT_PUBLIC_TOSS_CLIENT_KEY is not configured')
    })
  })

  describe('verifyWebhookSignature', () => {
    it('returns true for valid signature', async () => {
      const secretKey = 'test_sk_123'
      process.env.TOSS_PAYMENTS_SECRET_KEY = secretKey
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { verifyWebhookSignature } = await import('./toss-payments')

      const payload = '{"eventType":"PAYMENT_STATUS_CHANGED"}'
      const timestamp = '1234567890'
      const signatureData = `${timestamp}${payload}`
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(signatureData)
        .digest('base64')

      expect(verifyWebhookSignature(payload, expectedSignature, timestamp)).toBe(true)
    })

    it('returns false for invalid signature', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { verifyWebhookSignature } = await import('./toss-payments')

      const payload = '{"eventType":"PAYMENT_STATUS_CHANGED"}'
      const timestamp = '1234567890'
      const invalidSignature = 'invalid_signature_here'

      expect(verifyWebhookSignature(payload, invalidSignature, timestamp)).toBe(false)
    })

    it('returns false when payload has been tampered', async () => {
      const secretKey = 'test_sk_123'
      process.env.TOSS_PAYMENTS_SECRET_KEY = secretKey
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { verifyWebhookSignature } = await import('./toss-payments')

      const originalPayload = '{"eventType":"PAYMENT_STATUS_CHANGED"}'
      const timestamp = '1234567890'
      const signatureData = `${timestamp}${originalPayload}`
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(signatureData)
        .digest('base64')

      const tamperedPayload = '{"eventType":"BILLING_STATUS_CHANGED"}'

      expect(verifyWebhookSignature(tamperedPayload, signature, timestamp)).toBe(false)
    })
  })

  describe('parseWebhookPayload', () => {
    it('parses valid JSON payload', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { parseWebhookPayload } = await import('./toss-payments')

      const payload = JSON.stringify({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2024-01-15T12:00:00Z',
        data: {
          paymentKey: 'pk_123',
          orderId: 'order_123',
          status: 'DONE',
        },
      })

      const result = parseWebhookPayload(payload)

      expect(result.eventType).toBe('PAYMENT_STATUS_CHANGED')
      expect(result.data.paymentKey).toBe('pk_123')
      expect(result.data.status).toBe('DONE')
    })

    it('throws for invalid JSON', async () => {
      process.env.TOSS_PAYMENTS_SECRET_KEY = 'test_sk_123'
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_123'
      vi.resetModules()

      const { parseWebhookPayload } = await import('./toss-payments')

      expect(() => parseWebhookPayload('invalid json')).toThrow()
    })
  })
})
