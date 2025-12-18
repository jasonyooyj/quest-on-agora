// Discussion Session Types

export type DiscussionStatus = "draft" | "active" | "closed";
export type Stance = string; // Changed from union to string to support dynamic stances
export type MessageRole = "user" | "ai" | "instructor" | "system";
export type InterventionType = "nudge" | "evidence_request" | "counterexample" | "custom";
export type AIMode = "socratic" | "debate" | "minimal" | "balanced";

export interface DiscussionSettings {
  anonymous: boolean;
  stanceOptions: string[];
  endTime?: string;
  allowStanceChange?: boolean;
  aiMode?: AIMode;
  stanceLabels?: Record<string, string>;
  maxTurns?: number;
}

export interface DiscussionSession {
  id: string;
  instructorId: string;
  title: string;
  description?: string;
  status: DiscussionStatus;
  joinCode: string;
  settings: DiscussionSettings;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  participantCount?: number;
}

export interface DiscussionParticipant {
  id: string;
  sessionId: string;
  studentId: string;
  displayName?: string;
  realName?: string;
  studentNumber?: string;
  school?: string;
  stance?: Stance;
  stanceStatement?: string;
  evidence?: string[]; // Array of evidence strings
  evidence1?: string; // Legacy support
  evidence2?: string; // Legacy support
  isSubmitted: boolean;
  isOnline: boolean;
  lastActiveAt: string;
  createdAt: string;
  confusionNote?: string;
  needsHelp: boolean;
  helpRequestedAt?: string; // When help was first requested (never cleared)
  messageCount?: number;
}

export interface DiscussionMessage {
  id: string;
  sessionId: string;
  participantId?: string;
  role: MessageRole;
  content: string;
  messageType?: string;
  isVisibleToStudent: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
  participant?: Pick<DiscussionParticipant, "id" | "displayName" | "stance">;
}

export interface PinnedQuote {
  id: string;
  sessionId: string;
  participantId?: string;
  content: string;
  displayName?: string;
  pinnedAt: string;
  sortOrder: number;
}

export interface InstructorNote {
  id: string;
  participantId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicCluster {
  id: string;
  label: string;
  keywords: string[];
  participantCount: number;
  sampleEvidence: string;
  participantIds: string[];
}

export interface StanceDistribution {
  pro: number;
  con: number;
  neutral: number;
  unsubmitted: number;
}

export interface ActivityStats {
  messagesPerMinute: number[];
  timestamps: string[];
  totalMessages: number;
}

// Intervention Templates
export interface InterventionTemplate {
  id: string;
  type: InterventionType;
  label: string;
  prompt: string;
}

export const INTERVENTION_TEMPLATES: InterventionTemplate[] = [
  {
    id: "nudge-1",
    type: "nudge",
    label: "격려 메시지",
    prompt: "지금까지 좋은 생각을 해주셨네요! 조금 더 구체적으로 설명해 주실 수 있을까요?",
  },
  {
    id: "nudge-2",
    type: "nudge",
    label: "힌트 제공",
    prompt: "다른 관점에서도 생각해 보면 어떨까요? 반대 입장의 주장도 고려해 보세요.",
  },
  {
    id: "evidence-1",
    type: "evidence_request",
    label: "근거 요청",
    prompt: "주장을 뒷받침할 수 있는 구체적인 근거나 예시가 있을까요?",
  },
  {
    id: "evidence-2",
    type: "evidence_request",
    label: "출처 요청",
    prompt: "이 정보의 출처는 어디인가요? 신뢰할 수 있는 자료가 있다면 공유해 주세요.",
  },
  {
    id: "counter-1",
    type: "counterexample",
    label: "반례 질문",
    prompt: "만약 [상황]이라면 이 주장은 어떻게 될까요? 예외 상황도 생각해 보세요.",
  },
  {
    id: "counter-2",
    type: "counterexample",
    label: "반대 입장 고려",
    prompt: "반대 입장에서는 어떤 주장을 할 수 있을까요? 그에 대한 반박은 무엇인가요?",
  },
];

// Filter and Sort Options
export type ParticipantFilter = "all" | "pro" | "con" | "neutral" | "unsubmitted";
export type ParticipantSortOption = "recent" | "messages" | "submitted";

export interface ParticipantFilterState {
  stance: ParticipantFilter;
  search: string;
  activeOnly: boolean;
  needsHelpOnly: boolean;
  submittedOnly: boolean;
  sort: ParticipantSortOption;
}
