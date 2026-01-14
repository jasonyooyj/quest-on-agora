-- Migration: Grant permissions for discussion_comments and discussion_likes tables
-- Date: 2026-01-14
-- Issue: "permission denied for table discussion_comments" error when adding comments in gallery

-- Grant permissions to authenticated role for discussion_comments
GRANT SELECT, INSERT, UPDATE, DELETE ON discussion_comments TO authenticated;

-- Grant permissions to authenticated role for discussion_likes
GRANT SELECT, INSERT, UPDATE, DELETE ON discussion_likes TO authenticated;

-- Also grant to anon role for read access
GRANT SELECT ON discussion_comments TO anon;
GRANT SELECT ON discussion_likes TO anon;
