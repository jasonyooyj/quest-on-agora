import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/compression', () => ({
  compressData: vi.fn((value: unknown) => ({
    data: `compressed:${JSON.stringify(value)}`,
    metadata: {
      originalSize: 10,
      compressedSize: 5,
      compressionRatio: 0.5,
      format: 'gzip',
      version: 1,
      compressedAt: new Date().toISOString(),
    },
  })),
}))

vi.mock('@/lib/rate-limiter', () => ({
  applyRateLimit: vi.fn().mockReturnValue(null),
  RATE_LIMITS: {
    api: { windowMs: 60000, maxRequests: 100 },
  },
}))

import { POST } from '../route'
import { getCurrentUser } from '@/lib/auth'

const mockGetCurrentUser = vi.mocked(getCurrentUser)

function createRequest(body: unknown) {
  return new NextRequest('https://agora.edu/api/supa', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('supa route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  })

  it('returns 401 for update_exam when user is unauthenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const response = await POST(createRequest({
      action: 'update_exam',
      data: {
        id: 'exam-123',
        update: { title: 'New title' },
      },
    }))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })

  it('returns 403 for update_exam when user is not an instructor', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'student-123',
      email: 'student@test.com',
      name: 'Student',
      role: 'student',
    })

    const response = await POST(createRequest({
      action: 'update_exam',
      data: {
        id: 'exam-123',
        update: { title: 'New title' },
      },
    }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Instructor access required')
  })

  it('returns 400 for update_exam when payload has no mutable fields', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'inst-123',
      email: 'inst@test.com',
      name: 'Instructor',
      role: 'instructor',
    })

    const response = await POST(createRequest({
      action: 'update_exam',
      data: {
        id: 'exam-123',
        update: { attackerField: true },
      },
    }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('No valid fields to update')
  })

  it('returns 403 for create_or_get_session when caller is not a student', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'inst-123',
      email: 'inst@test.com',
      name: 'Instructor',
      role: 'instructor',
    })

    const response = await POST(createRequest({
      action: 'create_or_get_session',
      data: {
        examId: 'exam-123',
        studentId: 'victim-student',
      },
    }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Student access required')
  })
})
