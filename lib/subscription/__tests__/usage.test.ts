import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies before importing
vi.mock('../../supabase-server', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { incrementUsage, decrementUsage } from '../usage'
import { createSupabaseAdminClient } from '../../supabase-server'

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient)

// Helper to create chainable mock - supports Supabase query builder pattern
function createChainableMock(finalValue: unknown) {
  const createChain = (): Record<string, unknown> => ({
    select: vi.fn(() => createChain()),
    eq: vi.fn(() => createChain()),
    not: vi.fn(() => createChain()),
    in: vi.fn(() => createChain()),
    gte: vi.fn(() => createChain()),
    order: vi.fn(() => createChain()),
    limit: vi.fn(() => createChain()),
    single: vi.fn().mockResolvedValue(finalValue),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  })
  return createChain()
}

describe('subscription/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('incrementUsage', () => {
    it('should increment usage using RPC when available', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'discussions_created', 1)

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_user_id: 'user-123',
        p_organization_id: null,
        p_field: 'discussions_created',
        p_amount: 1,
      }))
    })

    it('should use organization_id when user is part of organization', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { organization_id: 'org-123' },
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'discussions_created', 1)

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_user_id: null,
        p_organization_id: 'org-123',
      }))
    })

    it('should fallback to manual increment when RPC not available', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: { code: '42883' } }) // Function not found
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return createChainableMock({ data: null })
          }
          if (table === 'usage_records') {
            const chain = createChainableMock({
              data: {
                id: 'usage-123',
                discussions_created: 5,
                active_discussions: 2,
                total_participants: 30,
              },
            })
            return {
              ...chain,
              update: updateMock,
            }
          }
          return createChainableMock({ data: null })
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'discussions_created', 1)

      expect(rpcMock).toHaveBeenCalled()
      // Manual increment should have been called as fallback
      expect(mockClient.from).toHaveBeenCalledWith('usage_records')
    })

    it('should create new usage record if none exists in manual fallback', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null })
      const rpcMock = vi.fn().mockResolvedValue({ error: { code: '42883' } })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return createChainableMock({ data: null })
          }
          if (table === 'usage_records') {
            const chain = createChainableMock({ data: null })
            return {
              ...chain,
              insert: insertMock,
            }
          }
          return createChainableMock({ data: null })
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'discussions_created', 1)

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        organization_id: null,
        discussions_created: 1,
        active_discussions: 0,
        total_participants: 0,
        total_messages: 0,
      }))
    })

    it('should increment active_discussions type', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'active_discussions', 1)

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_field: 'active_discussions',
        p_amount: 1,
      }))
    })

    it('should increment total_participants type', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'total_participants', 5)

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_field: 'total_participants',
        p_amount: 5,
      }))
    })

    it('should use default amount of 1', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await incrementUsage('user-123', 'discussions_created')

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_amount: 1,
      }))
    })
  })

  describe('decrementUsage', () => {
    it('should call incrementUsage with negative amount', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await decrementUsage('user-123', 'active_discussions', 1)

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_field: 'active_discussions',
        p_amount: -1,
      }))
    })

    it('should use default decrement amount of 1', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }
        }),
        rpc: rpcMock,
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await decrementUsage('user-123', 'active_discussions')

      expect(rpcMock).toHaveBeenCalledWith('increment_usage', expect.objectContaining({
        p_amount: -1,
      }))
    })
  })
})
