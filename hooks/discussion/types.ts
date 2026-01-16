"use client";

import type {
  DiscussionSession,
  DiscussionParticipant,
  DiscussionMessage,
  PinnedQuote,
} from "@/types/discussion";

// RawRecord is intentionally `any` for external API/DB data transformation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawRecord = Record<string, any>;

// Database row type for discussion_messages table (snake_case)
export interface DiscussionMessageRow {
  id: string;
  session_id: string;
  participant_id: string | null;
  role: string;
  content: string;
  message_type: string | null;
  is_visible_to_student: boolean | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

export const normalizeSession = (raw: RawRecord): DiscussionSession => ({
  id: raw.id,
  instructorId: raw.instructorId ?? raw.instructor_id,
  title: raw.title,
  description: raw.description ?? undefined,
  status: raw.status,
  joinCode: raw.joinCode ?? raw.join_code,
  settings: raw.settings,
  createdAt: raw.createdAt ?? raw.created_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
  closedAt: raw.closedAt ?? raw.closed_at,
  participantCount: raw.participantCount ?? raw.participant_count,
});

export const normalizeParticipant = (raw: RawRecord): DiscussionParticipant => {
  if ("sessionId" in raw) {
    return raw as DiscussionParticipant;
  }

  return {
    id: raw.id,
    sessionId: raw.session_id,
    studentId: raw.student_id,
    displayName: raw.display_name ?? undefined,
    realName: raw.real_name ?? undefined,
    studentNumber: raw.student_number ?? undefined,
    school: raw.school ?? undefined,
    stance: raw.stance ?? undefined,
    stanceStatement: raw.stance_statement ?? undefined,
    evidence: raw.evidence ?? undefined,
    evidence1: raw.evidence_1 ?? undefined,
    evidence2: raw.evidence_2 ?? undefined,
    isSubmitted: raw.is_submitted,
    isOnline: raw.is_online,
    lastActiveAt: raw.last_active_at,
    createdAt: raw.created_at,
    confusionNote: raw.confusion_note ?? undefined,
    needsHelp: raw.needs_help,
    helpRequestedAt: raw.help_requested_at ?? undefined,
    messageCount: raw.message_count ?? undefined,
  };
};

export const normalizeMessage = (raw: RawRecord): DiscussionMessage => {
  if ("sessionId" in raw) {
    return raw as DiscussionMessage;
  }

  return {
    id: raw.id,
    sessionId: raw.session_id,
    participantId: raw.participant_id ?? undefined,
    role: raw.role,
    content: raw.content,
    messageType: raw.message_type ?? undefined,
    isVisibleToStudent: raw.is_visible_to_student ?? true,
    createdAt: raw.created_at,
    metadata: raw.metadata ?? undefined,
    participant: raw.participant
      ? {
          id: raw.participant.id ?? undefined,
          displayName: raw.participant.display_name ?? undefined,
          stance: raw.participant.stance ?? undefined,
        }
      : undefined,
  };
};

export const normalizePin = (
  raw: RawRecord,
  sessionId: string,
  index: number
): PinnedQuote & { participant?: { display_name?: string; stance?: string } } => ({
  id: raw.id,
  sessionId,
  participantId: raw.participant_id ?? undefined,
  content: raw.content ?? raw.quote,
  displayName: raw.display_name ?? raw.participant?.display_name ?? undefined,
  pinnedAt: raw.pinned_at ?? raw.pinnedAt,
  sortOrder: raw.sort_order ?? raw.sortOrder ?? index,
  participant: raw.participant ?? undefined,
});
