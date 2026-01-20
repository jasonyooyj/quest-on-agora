-- Migration: Add Preview Mode Support
-- Description: Adds is_preview column to discussion_participants table
-- for instructor preview mode functionality
-- Date: 2026-01-19
-- Priority: Medium - new feature for instructor experience testing

-- ============================================
-- Discussion Participants - Preview Mode
-- ============================================

-- Add is_preview column to mark preview participants
ALTER TABLE discussion_participants
ADD COLUMN IF NOT EXISTS is_preview BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN discussion_participants.is_preview IS
'When true, this participant is an instructor preview session.
Preview participants should be excluded from statistics and reports.';

-- Create partial index for filtering out preview participants in queries
-- This index only includes non-preview participants for efficient statistics queries
CREATE INDEX IF NOT EXISTS idx_participants_exclude_preview
ON discussion_participants(session_id, is_preview)
WHERE is_preview = false;

-- Create index for quickly finding preview participants (for cleanup)
CREATE INDEX IF NOT EXISTS idx_participants_preview_only
ON discussion_participants(session_id)
WHERE is_preview = true;
