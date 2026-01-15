-- Migration: Add Performance Indexes
-- Description: Adds missing indexes to optimize common query patterns
-- Date: 2026-01-16
-- Applied: 2026-01-16
-- Priority: High - addresses N+1 and slow query issues identified in performance review

-- ============================================
-- Discussion Sessions Indexes
-- ============================================

-- Index for usage calculation fallback (counting discussions created this month)
CREATE INDEX IF NOT EXISTS idx_discussion_sessions_created_at
ON discussion_sessions(created_at DESC);

-- Composite index for instructor dashboard queries (active discussions, status filtering)
CREATE INDEX IF NOT EXISTS idx_discussion_sessions_instructor_status
ON discussion_sessions(instructor_id, status);

-- Index for instructor's discussion list with creation date ordering
CREATE INDEX IF NOT EXISTS idx_discussion_sessions_instructor_created
ON discussion_sessions(instructor_id, created_at DESC);

-- ============================================
-- Discussion Participants Indexes
-- ============================================

-- Composite index for submission stats and gallery queries
CREATE INDEX IF NOT EXISTS idx_discussion_participants_session_submitted
ON discussion_participants(session_id, is_submitted);

-- Index for online participant counts
CREATE INDEX IF NOT EXISTS idx_discussion_participants_session_online
ON discussion_participants(session_id, is_online)
WHERE is_online = true;

-- ============================================
-- Discussion Messages Indexes
-- ============================================

-- Composite index for message history queries with ordering
CREATE INDEX IF NOT EXISTS idx_discussion_messages_session_created
ON discussion_messages(session_id, created_at DESC);

-- Index for participant message filtering
CREATE INDEX IF NOT EXISTS idx_discussion_messages_participant
ON discussion_messages(participant_id, created_at DESC);

-- ============================================
-- Profiles Indexes
-- ============================================

-- Index for admin stats queries (counting by role)
CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role);
