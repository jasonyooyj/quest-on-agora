import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase client
vi.mock('./supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { getCurrentUser, requireAuth, requireRole, type AuthUser } from './auth'
import { createSupabaseServerClient } from './supabase-server'

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
}

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as any)
  })

  describe('getCurrentUser', () => {
    it('returns null when no user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await getCurrentUser()
      expect(result).toBeNull()
    })

    it('returns user with profile data when profile exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
        student_number: 'S001',
        school: 'Test School',
        avatar_url: 'https://example.com/avatar.jpg',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })

      const singleMock = vi.fn().mockResolvedValue({ data: mockProfile })
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      mockSupabaseClient.from.mockReturnValue({ select: selectMock })

      const result = await getCurrentUser()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
        studentNumber: 'S001',
        school: 'Test School',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
    })

    it('returns default student role when profile does not exist', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'New User' },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })

      const singleMock = vi.fn().mockResolvedValue({ data: null })
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      mockSupabaseClient.from.mockReturnValue({ select: selectMock })

      const result = await getCurrentUser()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'New User',
        role: 'student',
      })
    })

    it('handles missing user metadata gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })

      const singleMock = vi.fn().mockResolvedValue({ data: null })
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      mockSupabaseClient.from.mockReturnValue({ select: selectMock })

      const result = await getCurrentUser()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: '',
        role: 'student',
      })
    })
  })

  describe('requireAuth', () => {
    it('returns user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })

      const singleMock = vi.fn().mockResolvedValue({ data: mockProfile })
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      mockSupabaseClient.from.mockReturnValue({ select: selectMock })

      const result = await requireAuth()

      expect(result.id).toBe('user-123')
    })

    it('throws error when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })
  })

  describe('requireRole', () => {
    it('returns user when role matches', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test Instructor' },
      }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test Instructor',
        role: 'instructor',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })

      const singleMock = vi.fn().mockResolvedValue({ data: mockProfile })
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      mockSupabaseClient.from.mockReturnValue({ select: selectMock })

      const result = await requireRole('instructor')

      expect(result.role).toBe('instructor')
    })

    it('throws error when role does not match', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test Student' },
      }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test Student',
        role: 'student',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })

      const singleMock = vi.fn().mockResolvedValue({ data: mockProfile })
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      mockSupabaseClient.from.mockReturnValue({ select: selectMock })

      await expect(requireRole('instructor')).rejects.toThrow(
        'Forbidden: requires instructor role'
      )
    })

    it('throws unauthorized when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      await expect(requireRole('instructor')).rejects.toThrow('Unauthorized')
    })
  })
})
