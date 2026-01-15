import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}))

// Mock Supabase
vi.mock('./supabase-server', () => ({
  createSupabaseAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn(),
  }),
}))

// Mock subscription
vi.mock('./subscription', () => ({
  getPlanById: vi.fn(),
}))

const originalEnv = { ...process.env }

describe('stripe', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getStripeClient', () => {
    it('throws error when STRIPE_SECRET_KEY is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY
      vi.resetModules()

      const { getStripeClient } = await import('./stripe')

      expect(() => getStripeClient()).toThrow('STRIPE_SECRET_KEY is not configured')
    })

    it('creates client when STRIPE_SECRET_KEY is configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { getStripeClient } = await import('./stripe')

      expect(() => getStripeClient()).not.toThrow()
    })

    it('returns the same client instance on subsequent calls', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { getStripeClient } = await import('./stripe')

      const client1 = getStripeClient()
      const client2 = getStripeClient()

      expect(client1).toBe(client2)
    })
  })

  describe('formatStripeAmount', () => {
    it('formats USD amounts correctly (cents to dollars)', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { formatStripeAmount } = await import('./stripe')

      expect(formatStripeAmount(1000, 'usd')).toBe('$10.00')
      expect(formatStripeAmount(2599, 'usd')).toBe('$25.99')
      expect(formatStripeAmount(100, 'usd')).toBe('$1.00')
    })

    it('formats KRW amounts correctly (no decimal conversion)', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { formatStripeAmount } = await import('./stripe')

      expect(formatStripeAmount(10000, 'krw')).toBe('\u20a910,000')
      expect(formatStripeAmount(25900, 'krw')).toBe('\u20a925,900')
    })

    it('formats EUR amounts correctly', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { formatStripeAmount } = await import('./stripe')

      const result = formatStripeAmount(1000, 'eur')
      // EUR formatting varies by locale, just check it contains the value
      expect(result).toContain('10')
    })
  })

  describe('toStripeAmount', () => {
    it('converts USD dollars to cents', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { toStripeAmount } = await import('./stripe')

      expect(toStripeAmount(10, 'usd')).toBe(1000)
      expect(toStripeAmount(25.99, 'usd')).toBe(2599)
      expect(toStripeAmount(0.5, 'usd')).toBe(50)
    })

    it('keeps KRW as-is (no decimal conversion)', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { toStripeAmount } = await import('./stripe')

      expect(toStripeAmount(10000, 'krw')).toBe(10000)
      expect(toStripeAmount(25900, 'krw')).toBe(25900)
    })

    it('handles case-insensitive currency codes', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { toStripeAmount } = await import('./stripe')

      expect(toStripeAmount(10, 'USD')).toBe(1000)
      expect(toStripeAmount(10000, 'KRW')).toBe(10000)
    })
  })

  describe('fromStripeAmount', () => {
    it('converts USD cents to dollars', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { fromStripeAmount } = await import('./stripe')

      expect(fromStripeAmount(1000, 'usd')).toBe(10)
      expect(fromStripeAmount(2599, 'usd')).toBe(25.99)
      expect(fromStripeAmount(50, 'usd')).toBe(0.5)
    })

    it('keeps KRW as-is', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      vi.resetModules()

      const { fromStripeAmount } = await import('./stripe')

      expect(fromStripeAmount(10000, 'krw')).toBe(10000)
      expect(fromStripeAmount(25900, 'krw')).toBe(25900)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('throws error when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      delete process.env.STRIPE_WEBHOOK_SECRET
      vi.resetModules()

      const { verifyWebhookSignature } = await import('./stripe')

      expect(() =>
        verifyWebhookSignature('payload', 'sig')
      ).toThrow('STRIPE_WEBHOOK_SECRET is not configured')
    })
  })
})
