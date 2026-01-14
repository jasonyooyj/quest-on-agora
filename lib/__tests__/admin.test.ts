import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAdmin, ADMIN_EMAILS } from '../admin'

// Mock the Supabase server client since we can't test server-side functions in unit tests
vi.mock('../supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

describe('admin', () => {
  describe('isAdmin', () => {
    beforeEach(() => {
      // Reset for each test
      vi.resetModules()
    })

    it('should return false for null email', () => {
      expect(isAdmin(null)).toBe(false)
    })

    it('should return false for undefined email', () => {
      expect(isAdmin(undefined)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isAdmin('')).toBe(false)
    })

    it('should be case-insensitive', () => {
      // This test depends on ADMIN_EMAILS being set
      if (ADMIN_EMAILS.length > 0) {
        const adminEmail = ADMIN_EMAILS[0]
        expect(isAdmin(adminEmail.toUpperCase())).toBe(true)
        expect(isAdmin(adminEmail.toLowerCase())).toBe(true)
      }
    })

    it('should return false for non-admin email', () => {
      expect(isAdmin('random-user@example.com')).toBe(false)
    })

    it('should handle whitespace in email', () => {
      expect(isAdmin('  ')).toBe(false)
    })
  })

  describe('ADMIN_EMAILS', () => {
    it('should be an array', () => {
      expect(Array.isArray(ADMIN_EMAILS)).toBe(true)
    })

    it('should contain only lowercase emails', () => {
      ADMIN_EMAILS.forEach((email) => {
        expect(email).toBe(email.toLowerCase())
      })
    })

    it('should not contain empty strings', () => {
      ADMIN_EMAILS.forEach((email) => {
        expect(email.length).toBeGreaterThan(0)
      })
    })
  })
})
