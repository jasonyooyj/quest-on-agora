/**
 * Discussion Hooks - Backwards Compatibility Re-exports
 *
 * This file re-exports all hooks from the modular hooks/discussion/ directory
 * to maintain backwards compatibility with existing imports.
 *
 * New code should import directly from '@/hooks/discussion' for better tree-shaking.
 *
 * @example
 * // Legacy import (still works)
 * import { useDiscussionSession } from '@/hooks/useDiscussion'
 *
 * // Recommended import
 * import { useDiscussionSession } from '@/hooks/discussion'
 */

"use client";

export {
  // Session hooks
  useDiscussionSession,
  useSessionActions,
  // Participant hooks
  useDiscussionParticipants,
  useStanceDistribution,
  // Message hooks
  useParticipantMessages,
  useGlobalMessageFeed,
  useSendIntervention,
  // Pinned quotes hook
  usePinnedQuotes,
  // Topics hook
  useDiscussionTopics,
  // Instructor hook
  useInstructorNote,
  // Activity hook
  useActivityStats,
  // Realtime status hook
  useRealtimeStatus,
} from "./discussion";
