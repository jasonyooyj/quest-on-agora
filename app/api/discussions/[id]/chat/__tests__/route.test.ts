import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  applyRateLimit: vi.fn().mockReturnValue(null),
  RATE_LIMITS: {
    ai: { windowMs: 60000, maxRequests: 30 },
  },
}))

import { POST } from '../route'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

const mockCreateSupabaseRouteClient = vi.mocked(createSupabaseRouteClient)
const mockGetCurrentUser = vi.mocked(getCurrentUser)

function createRequest(body: unknown) {
  return new NextRequest('https://agora.edu/api/discussions/11111111-1111-1111-1111-111111111111/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('discussion chat route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateSupabaseRouteClient.mockResolvedValue({ from: vi.fn() } as any)
    mockGetCurrentUser.mockResolvedValue(null)

    const response = await POST(
      createRequest({
        participantId: '22222222-2222-2222-2222-222222222222',
        userMessage: 'hello',
      }),
      { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })

  it('returns 403 when authenticated user does not own participant or discussion', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      email: 'student@test.com',
      name: 'Student',
      role: 'student',
    })

    const discussionSingle = vi.fn().mockResolvedValue({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        instructor_id: '44444444-4444-4444-4444-444444444444',
        settings: {},
        title: 'Topic',
        description: null,
      },
      error: null,
    })

    const participantSingle = vi.fn().mockResolvedValue({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        session_id: '11111111-1111-1111-1111-111111111111',
        student_id: '55555555-5555-5555-5555-555555555555',
        stance: 'pro',
      },
      error: null,
    })

    const from = vi.fn((table: string) => {
      if (table === 'discussion_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: discussionSingle,
            }),
          }),
        }
      }

      if (table === 'discussion_participants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: participantSingle,
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }
    })

    mockCreateSupabaseRouteClient.mockResolvedValue({ from } as any)

    const response = await POST(
      createRequest({
        participantId: '22222222-2222-2222-2222-222222222222',
        userMessage: 'hello',
      }),
      { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Forbidden')
  })
})
