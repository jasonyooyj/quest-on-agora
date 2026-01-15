-- Enable realtime for discussion tables
-- This is required for Supabase Realtime to work with UPDATE/DELETE events
-- Migration applied: 2026-01-15

-- Set replica identity to FULL for tables that need realtime updates
-- This allows Supabase Realtime to include all column values in change events
ALTER TABLE discussion_sessions REPLICA IDENTITY FULL;
ALTER TABLE discussion_participants REPLICA IDENTITY FULL;
ALTER TABLE discussion_messages REPLICA IDENTITY FULL;
ALTER TABLE discussion_pinned_quotes REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
-- This is required for Supabase Realtime subscriptions to receive changes
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_pinned_quotes;
