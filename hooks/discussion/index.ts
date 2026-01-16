/**
 * Discussion Hooks Module
 *
 * This module provides React hooks for managing discussion-related state
 * with real-time updates via Supabase subscriptions.
 *
 * The hooks are organized into logical groups:
 * - Session: Discussion session data and actions
 * - Participants: Participant list and stance distribution
 * - Messages: Message feeds and interventions
 * - Pins: Pinned quotes management
 * - Topics: GPT-generated topic clusters
 * - Instructor: Instructor notes on participants
 * - Activity: Activity statistics
 * - Realtime: Connection status monitoring
 */

// Session hooks
export { useDiscussionSession, useSessionActions } from "./useSession";

// Participant hooks
export { useDiscussionParticipants, useStanceDistribution } from "./useParticipants";

// Message hooks
export {
  useParticipantMessages,
  useGlobalMessageFeed,
  useSendIntervention,
} from "./useMessages";

// Pinned quotes hook
export { usePinnedQuotes } from "./usePins";

// Topics hook
export { useDiscussionTopics } from "./useTopics";

// Instructor hook
export { useInstructorNote } from "./useInstructor";

// Activity hook
export { useActivityStats } from "./useActivity";

// Realtime status hook
export { useRealtimeStatus } from "./useRealtime";

// Types and utilities (for advanced usage)
export type { RawRecord, DiscussionMessageRow } from "./types";
export {
  normalizeSession,
  normalizeParticipant,
  normalizeMessage,
  normalizePin,
} from "./types";
