import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = process.env.ADMIN_EMAILS

// We need to reset the module to test different ADMIN_EMAILS values
describe('admin', () => {
  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv
    vi.resetModules()
  })

  describe('isAdmin', () => {
    it('returns true for admin email', async () => {
      process.env.ADMIN_EMAILS = 'admin@school.edu,professor@school.edu'
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('admin@school.edu')).toBe(true)
      expect(isAdmin('professor@school.edu')).toBe(true)
    })

    it('returns true for admin email case-insensitively', async () => {
      process.env.ADMIN_EMAILS = 'admin@school.edu'
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('ADMIN@SCHOOL.EDU')).toBe(true)
      expect(isAdmin('Admin@School.Edu')).toBe(true)
    })

    it('returns false for non-admin email', async () => {
      process.env.ADMIN_EMAILS = 'admin@school.edu'
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('user@school.edu')).toBe(false)
      expect(isAdmin('notadmin@school.edu')).toBe(false)
    })

    it('returns false for null or undefined email', async () => {
      process.env.ADMIN_EMAILS = 'admin@school.edu'
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin(null)).toBe(false)
      expect(isAdmin(undefined)).toBe(false)
    })

    it('returns false for empty string email', async () => {
      process.env.ADMIN_EMAILS = 'admin@school.edu'
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('')).toBe(false)
    })

    it('handles empty ADMIN_EMAILS', async () => {
      process.env.ADMIN_EMAILS = ''
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('anyone@example.com')).toBe(false)
    })

    it('handles missing ADMIN_EMAILS env var', async () => {
      delete process.env.ADMIN_EMAILS
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('anyone@example.com')).toBe(false)
    })

    it('handles whitespace in ADMIN_EMAILS', async () => {
      process.env.ADMIN_EMAILS = ' admin@school.edu , professor@school.edu '
      vi.resetModules()
      const { isAdmin } = await import('./admin')

      expect(isAdmin('admin@school.edu')).toBe(true)
      expect(isAdmin('professor@school.edu')).toBe(true)
    })
  })

  describe('ADMIN_EMAILS parsing', () => {
    it('parses comma-separated emails correctly', async () => {
      process.env.ADMIN_EMAILS = 'a@test.com,b@test.com,c@test.com'
      vi.resetModules()
      const { ADMIN_EMAILS } = await import('./admin')

      expect(ADMIN_EMAILS).toHaveLength(3)
      expect(ADMIN_EMAILS).toContain('a@test.com')
      expect(ADMIN_EMAILS).toContain('b@test.com')
      expect(ADMIN_EMAILS).toContain('c@test.com')
    })

    it('filters out empty entries', async () => {
      process.env.ADMIN_EMAILS = 'a@test.com,,b@test.com,,'
      vi.resetModules()
      const { ADMIN_EMAILS } = await import('./admin')

      expect(ADMIN_EMAILS).toHaveLength(2)
      expect(ADMIN_EMAILS).toContain('a@test.com')
      expect(ADMIN_EMAILS).toContain('b@test.com')
    })

    it('converts emails to lowercase', async () => {
      process.env.ADMIN_EMAILS = 'Admin@Test.Com,USER@EXAMPLE.ORG'
      vi.resetModules()
      const { ADMIN_EMAILS } = await import('./admin')

      expect(ADMIN_EMAILS).toContain('admin@test.com')
      expect(ADMIN_EMAILS).toContain('user@example.org')
    })
  })
})
