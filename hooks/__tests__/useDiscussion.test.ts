// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock Supabase client
vi.mock('@/lib/supabase-client', () => ({
  createSupabaseClient: vi.fn(() => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  })),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as typeof fetch

import {
  useDiscussionSession,
  useDiscussionParticipants,
  useParticipantMessages,
  useGlobalMessageFeed,
  useStanceDistribution,
  usePinnedQuotes,
  useInstructorNote,
  useActivityStats,
  useDiscussionTopics,
} from '../useDiscussion'

// Wrapper component with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  Wrapper.displayName = 'TestQueryClientWrapper'

  return Wrapper
}

describe('useDiscussion hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('useDiscussionSession', () => {
    it('should fetch and normalize discussion session', async () => {
      const mockSession = {
        id: 'session-123',
        instructor_id: 'instructor-456',
        title: 'Test Discussion',
        description: 'A test description',
        status: 'active',
        join_code: 'ABC123XYZ789',
        settings: { aiMode: 'socratic' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T01:00:00Z',
        closed_at: null,
        participant_count: 10,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })

      const { result } = renderHook(() => useDiscussionSession('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        id: 'session-123',
        instructorId: 'instructor-456',
        title: 'Test Discussion',
        status: 'active',
        joinCode: 'ABC123XYZ789',
      })
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const { result } = renderHook(() => useDiscussionSession('invalid-session'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Failed to fetch discussion session')
    })

    it('should not fetch when sessionId is empty', async () => {
      const { result } = renderHook(() => useDiscussionSession(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetched).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('useDiscussionParticipants', () => {
    it('should fetch and normalize participants', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          session_id: 'session-123',
          student_id: 'student-1',
          display_name: 'Student 1',
          stance: 'agree',
          is_submitted: true,
          is_online: true,
          last_active_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          needs_help: false,
          message_count: 5,
        },
        {
          id: 'participant-2',
          session_id: 'session-123',
          student_id: 'student-2',
          display_name: 'Student 2',
          stance: 'disagree',
          is_submitted: true,
          is_online: false,
          last_active_at: '2026-01-01T00:30:00Z',
          created_at: '2026-01-01T00:00:00Z',
          needs_help: true,
          message_count: 3,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ participants: mockParticipants }),
      })

      const { result } = renderHook(() => useDiscussionParticipants('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0]).toMatchObject({
        id: 'participant-1',
        sessionId: 'session-123',
        displayName: 'Student 1',
        stance: 'agree',
      })
    })

    it('should return empty array when no participants', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ participants: [] }),
      })

      const { result } = renderHook(() => useDiscussionParticipants('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useParticipantMessages', () => {
    it('should fetch and normalize messages for a participant', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: 'session-123',
          participant_id: 'participant-1',
          role: 'user',
          content: 'Hello, this is my first message',
          created_at: '2026-01-01T00:00:00Z',
          participant: { id: 'participant-1', display_name: 'Student 1', stance: 'agree' },
        },
        {
          id: 'msg-2',
          session_id: 'session-123',
          participant_id: 'participant-1',
          role: 'ai',
          content: 'That is an interesting point...',
          created_at: '2026-01-01T00:01:00Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      })

      const { result } = renderHook(
        () => useParticipantMessages('session-123', 'participant-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0]).toMatchObject({
        id: 'msg-1',
        sessionId: 'session-123',
        participantId: 'participant-1',
        role: 'user',
      })
    })
  })

  describe('useGlobalMessageFeed', () => {
    it('should fetch recent messages across all participants', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: 'session-123',
          participant_id: 'participant-1',
          role: 'user',
          content: 'Message 1',
          created_at: '2026-01-01T00:00:00Z',
          participant: { display_name: 'Student 1' },
        },
        {
          id: 'msg-2',
          session_id: 'session-123',
          participant_id: 'participant-2',
          role: 'user',
          content: 'Message 2',
          created_at: '2026-01-01T00:01:00Z',
          participant: { display_name: 'Student 2' },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      })

      const { result } = renderHook(
        () => useGlobalMessageFeed('session-123', 50),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(2)
    })
  })

  describe('useStanceDistribution', () => {
    it('should fetch stance distribution data', async () => {
      const mockDistribution: Record<string, number> = {
        agree: 15,
        disagree: 10,
        neutral: 5,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ distribution: mockDistribution }),
      })

      const { result } = renderHook(() => useStanceDistribution('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockDistribution)
    })
  })

  describe('usePinnedQuotes', () => {
    it('should fetch pinned quotes', async () => {
      const mockQuotes = [
        {
          id: 'quote-1',
          participant_id: 'participant-1',
          content: 'This is an important quote',
          display_name: 'Student 1',
          pinned_at: '2026-01-01T00:30:00Z',
          sort_order: 0,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quotes: mockQuotes }),
      })

      const { result } = renderHook(() => usePinnedQuotes('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // The hook returns data in a specific format - verify the API was called
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/discussions/session-123'))
    })
  })

  describe('useInstructorNote', () => {
    it('should fetch instructor note for a participant', async () => {
      const mockNote = {
        id: 'note-1',
        participant_id: 'participant-1',
        content: 'This student needs extra support',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T01:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ note: mockNote }),
      })

      const { result } = renderHook(() => useInstructorNote('participant-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify the API was called with the correct participant ID
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('participant-1'))
    })
  })

  describe('useActivityStats', () => {
    it('should fetch activity statistics', async () => {
      const mockStats = {
        intervals: [
          { time: '00:00', messages: 5 },
          { time: '00:05', messages: 12 },
          { time: '00:10', messages: 8 },
        ],
        totalMessages: 25,
        activeParticipants: 15,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: mockStats }),
      })

      const { result } = renderHook(() => useActivityStats('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify the API was called
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/discussions/session-123'))
    })
  })

  describe('useDiscussionTopics', () => {
    it('should fetch AI-generated topic clusters', async () => {
      const mockTopics = {
        clusters: [
          {
            id: 'topic-1',
            title: 'Economic Impact',
            keywords: ['economy', 'jobs', 'growth'],
            messageCount: 15,
          },
          {
            id: 'topic-2',
            title: 'Environmental Concerns',
            keywords: ['environment', 'sustainability', 'climate'],
            messageCount: 12,
          },
        ],
        generatedAt: '2026-01-01T01:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ topics: mockTopics }),
      })

      const { result } = renderHook(() => useDiscussionTopics('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.clusters).toHaveLength(2)
    })
  })

  describe('normalizer functions', () => {
    it('should handle snake_case to camelCase conversion', async () => {
      const mockSession = {
        id: 'session-123',
        instructor_id: 'instructor-456',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T01:00:00Z',
        join_code: 'CODE123456',
        participant_count: 5,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })

      const { result } = renderHook(() => useDiscussionSession('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.instructorId).toBe('instructor-456')
      expect(result.current.data?.joinCode).toBe('CODE123456')
      expect(result.current.data?.participantCount).toBe(5)
    })

    it('should handle already camelCase data', async () => {
      const mockSession = {
        id: 'session-123',
        instructorId: 'instructor-456', // Already camelCase
        createdAt: '2026-01-01T00:00:00Z',
        joinCode: 'CODE123456',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })

      const { result } = renderHook(() => useDiscussionSession('session-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.instructorId).toBe('instructor-456')
      expect(result.current.data?.joinCode).toBe('CODE123456')
    })
  })
})
