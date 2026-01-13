-- ============================================
-- Comprehensive RLS Policies for Quest on Agora
-- ============================================
-- Run this script to set up proper Row Level Security
-- IMPORTANT: Run with service_role or as database owner
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Users can only view/update their own profile

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during onboarding)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role has full access to profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 2. DISCUSSION_SESSIONS TABLE
-- ============================================
-- Instructors can manage their own sessions
-- Students can view sessions they participate in

ALTER TABLE discussion_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can view own sessions" ON discussion_sessions;
DROP POLICY IF EXISTS "Instructors can insert own sessions" ON discussion_sessions;
DROP POLICY IF EXISTS "Instructors can update own sessions" ON discussion_sessions;
DROP POLICY IF EXISTS "Instructors can delete own sessions" ON discussion_sessions;
DROP POLICY IF EXISTS "Students can view participating sessions" ON discussion_sessions;
DROP POLICY IF EXISTS "Service role has full access to sessions" ON discussion_sessions;

-- Instructors can view their own sessions
CREATE POLICY "Instructors can view own sessions" ON discussion_sessions
  FOR SELECT USING (auth.uid() = instructor_id);

-- Students can view sessions they participate in
CREATE POLICY "Students can view participating sessions" ON discussion_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_participants
      WHERE discussion_participants.session_id = discussion_sessions.id
      AND discussion_participants.student_id = auth.uid()
    )
  );

-- Instructors can create sessions
CREATE POLICY "Instructors can insert own sessions" ON discussion_sessions
  FOR INSERT WITH CHECK (auth.uid() = instructor_id);

-- Instructors can update their own sessions
CREATE POLICY "Instructors can update own sessions" ON discussion_sessions
  FOR UPDATE USING (auth.uid() = instructor_id);

-- Instructors can delete their own sessions
CREATE POLICY "Instructors can delete own sessions" ON discussion_sessions
  FOR DELETE USING (auth.uid() = instructor_id);

-- Service role has full access
CREATE POLICY "Service role has full access to sessions" ON discussion_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 3. DISCUSSION_PARTICIPANTS TABLE
-- ============================================
-- Students can view/manage their own participation
-- Instructors can view participants in their sessions

ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own participation" ON discussion_participants;
DROP POLICY IF EXISTS "Students can insert own participation" ON discussion_participants;
DROP POLICY IF EXISTS "Students can update own participation" ON discussion_participants;
DROP POLICY IF EXISTS "Instructors can view session participants" ON discussion_participants;
DROP POLICY IF EXISTS "Instructors can update session participants" ON discussion_participants;
DROP POLICY IF EXISTS "Service role has full access to participants" ON discussion_participants;

-- Students can view their own participation
CREATE POLICY "Students can view own participation" ON discussion_participants
  FOR SELECT USING (auth.uid() = student_id);

-- Instructors can view participants in their sessions
CREATE POLICY "Instructors can view session participants" ON discussion_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_participants.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Students can join sessions (insert participation)
CREATE POLICY "Students can insert own participation" ON discussion_participants
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own participation (stance, evidence, etc.)
CREATE POLICY "Students can update own participation" ON discussion_participants
  FOR UPDATE USING (auth.uid() = student_id);

-- Instructors can update participants in their sessions
CREATE POLICY "Instructors can update session participants" ON discussion_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_participants.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to participants" ON discussion_participants
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 4. DISCUSSION_MESSAGES TABLE
-- ============================================
-- Students can view/create messages in sessions they participate in
-- Instructors can view all messages in their sessions

ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view session messages" ON discussion_messages;
DROP POLICY IF EXISTS "Students can insert own messages" ON discussion_messages;
DROP POLICY IF EXISTS "Instructors can view session messages" ON discussion_messages;
DROP POLICY IF EXISTS "Instructors can insert session messages" ON discussion_messages;
DROP POLICY IF EXISTS "Instructors can update session messages" ON discussion_messages;
DROP POLICY IF EXISTS "Service role has full access to messages" ON discussion_messages;

-- Students can view messages in sessions they participate in
CREATE POLICY "Students can view session messages" ON discussion_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_participants
      WHERE discussion_participants.session_id = discussion_messages.session_id
      AND discussion_participants.student_id = auth.uid()
    )
  );

-- Students can create messages (through their participant ID)
CREATE POLICY "Students can insert own messages" ON discussion_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM discussion_participants
      WHERE discussion_participants.id = discussion_messages.participant_id
      AND discussion_participants.student_id = auth.uid()
    )
  );

-- Instructors can view all messages in their sessions
CREATE POLICY "Instructors can view session messages" ON discussion_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_messages.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Instructors can insert messages (interventions, system messages)
CREATE POLICY "Instructors can insert session messages" ON discussion_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_messages.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Instructors can update messages in their sessions
CREATE POLICY "Instructors can update session messages" ON discussion_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_messages.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to messages" ON discussion_messages
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 5. DISCUSSION_PINNED_QUOTES TABLE
-- ============================================

ALTER TABLE discussion_pinned_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can manage pinned quotes" ON discussion_pinned_quotes;
DROP POLICY IF EXISTS "Students can view pinned quotes" ON discussion_pinned_quotes;
DROP POLICY IF EXISTS "Service role has full access to pinned quotes" ON discussion_pinned_quotes;

-- Instructors can view/manage pinned quotes in their sessions
CREATE POLICY "Instructors can manage pinned quotes" ON discussion_pinned_quotes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_pinned_quotes.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Students can view pinned quotes in sessions they participate in
CREATE POLICY "Students can view pinned quotes" ON discussion_pinned_quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_participants
      WHERE discussion_participants.session_id = discussion_pinned_quotes.session_id
      AND discussion_participants.student_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to pinned quotes" ON discussion_pinned_quotes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 6. DISCUSSION_INSTRUCTOR_NOTES TABLE
-- ============================================

ALTER TABLE discussion_instructor_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can manage own notes" ON discussion_instructor_notes;
DROP POLICY IF EXISTS "Service role has full access to instructor notes" ON discussion_instructor_notes;

-- Instructors can manage notes for participants in their sessions
CREATE POLICY "Instructors can manage own notes" ON discussion_instructor_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM discussion_participants
      JOIN discussion_sessions ON discussion_sessions.id = discussion_participants.session_id
      WHERE discussion_participants.id = discussion_instructor_notes.participant_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to instructor notes" ON discussion_instructor_notes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 7. DISCUSSION_COMMENTS TABLE
-- ============================================

ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments in their sessions" ON discussion_comments;
DROP POLICY IF EXISTS "Users can create comments" ON discussion_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON discussion_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON discussion_comments;
DROP POLICY IF EXISTS "Service role has full access to comments" ON discussion_comments;

-- Users can view comments in sessions they have access to
CREATE POLICY "Users can view comments in their sessions" ON discussion_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_comments.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM discussion_participants
      WHERE discussion_participants.session_id = discussion_comments.session_id
      AND discussion_participants.student_id = auth.uid()
    )
  );

-- Users can create comments
CREATE POLICY "Users can create comments" ON discussion_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON discussion_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON discussion_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to comments" ON discussion_comments
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 8. DISCUSSION_LIKES TABLE
-- ============================================

ALTER TABLE discussion_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view likes in their sessions" ON discussion_likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON discussion_likes;
DROP POLICY IF EXISTS "Service role has full access to likes" ON discussion_likes;

-- Users can view likes in sessions they have access to
CREATE POLICY "Users can view likes in their sessions" ON discussion_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_sessions
      WHERE discussion_sessions.id = discussion_likes.session_id
      AND discussion_sessions.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM discussion_participants
      WHERE discussion_participants.session_id = discussion_likes.session_id
      AND discussion_participants.student_id = auth.uid()
    )
  );

-- Users can create/delete their own likes
CREATE POLICY "Users can manage own likes" ON discussion_likes
  FOR ALL USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to likes" ON discussion_likes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 9. EXAM_NODES TABLE (Fixed)
-- ============================================
-- Current policy: instructor_id IS NOT NULL (INSECURE!)
-- Fixed policy: instructor_id = auth.uid()::text

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Instructors can view their own nodes" ON exam_nodes;
DROP POLICY IF EXISTS "Instructors can insert their own nodes" ON exam_nodes;
DROP POLICY IF EXISTS "Instructors can update their own nodes" ON exam_nodes;
DROP POLICY IF EXISTS "Instructors can delete their own nodes" ON exam_nodes;
DROP POLICY IF EXISTS "Service role has full access to exam nodes" ON exam_nodes;

-- Fixed: Instructors can only view their OWN nodes
CREATE POLICY "Instructors can view their own nodes" ON exam_nodes
  FOR SELECT USING (instructor_id = auth.uid()::text);

-- Fixed: Instructors can only insert their OWN nodes
CREATE POLICY "Instructors can insert their own nodes" ON exam_nodes
  FOR INSERT WITH CHECK (instructor_id = auth.uid()::text);

-- Fixed: Instructors can only update their OWN nodes
CREATE POLICY "Instructors can update their own nodes" ON exam_nodes
  FOR UPDATE USING (instructor_id = auth.uid()::text);

-- Fixed: Instructors can only delete their OWN nodes
CREATE POLICY "Instructors can delete their own nodes" ON exam_nodes
  FOR DELETE USING (instructor_id = auth.uid()::text);

-- Service role has full access
CREATE POLICY "Service role has full access to exam nodes" ON exam_nodes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 10. EXAMS TABLE
-- ============================================

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can view own exams" ON exams;
DROP POLICY IF EXISTS "Instructors can insert own exams" ON exams;
DROP POLICY IF EXISTS "Instructors can update own exams" ON exams;
DROP POLICY IF EXISTS "Instructors can delete own exams" ON exams;
DROP POLICY IF EXISTS "Service role has full access to exams" ON exams;

-- Instructors can view their own exams
CREATE POLICY "Instructors can view own exams" ON exams
  FOR SELECT USING (instructor_id = auth.uid()::text);

-- Instructors can create exams
CREATE POLICY "Instructors can insert own exams" ON exams
  FOR INSERT WITH CHECK (instructor_id = auth.uid()::text);

-- Instructors can update their own exams
CREATE POLICY "Instructors can update own exams" ON exams
  FOR UPDATE USING (instructor_id = auth.uid()::text);

-- Instructors can delete their own exams
CREATE POLICY "Instructors can delete own exams" ON exams
  FOR DELETE USING (instructor_id = auth.uid()::text);

-- Service role has full access
CREATE POLICY "Service role has full access to exams" ON exams
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SUMMARY OF SECURITY FIXES
-- ============================================
-- 1. profiles: Added proper RLS (users can only access their own profile)
-- 2. discussion_sessions: Added RLS (instructors own sessions, students view participating)
-- 3. discussion_participants: Added RLS (students manage own, instructors view session participants)
-- 4. discussion_messages: Added RLS (based on session participation)
-- 5. discussion_pinned_quotes: Added RLS (instructors manage, students view)
-- 6. discussion_instructor_notes: Added RLS (instructors only)
-- 7. discussion_comments: Added RLS (session-based access)
-- 8. discussion_likes: Added RLS (session-based view, user-based manage)
-- 9. exam_nodes: FIXED - Changed from "IS NOT NULL" to proper auth.uid() comparison
-- 10. exams: Added RLS with proper instructor ownership check
-- ============================================
