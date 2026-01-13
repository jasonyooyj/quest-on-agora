import { z } from 'zod'

// AI modes available for discussions
export const aiModeSchema = z.enum(['socratic', 'balanced', 'debate', 'minimal'])

// Discussion settings schema
export const discussionSettingsSchema = z.object({
  anonymous: z.boolean().default(true),
  stanceOptions: z.array(z.string()).min(2).max(10).default(['pro', 'con', 'neutral']),
  stanceLabels: z.record(z.string(), z.string()).optional(),
  aiMode: aiModeSchema.default('socratic'),
  aiContext: z.string().max(5000).optional(),
  maxTurns: z.number().min(3).max(50).nullable().default(10),
  duration: z.number().min(3).max(60).nullable().optional(),
})

// Create discussion request schema
export const createDiscussionSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional().nullable(),
  settings: discussionSettingsSchema.optional(),
})

// Update discussion request schema
export const updateDiscussionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  settings: discussionSettingsSchema.partial().optional(),
})

// Join discussion request schema
export const joinDiscussionSchema = z.object({
  joinCode: z.string()
    .length(6, '참여 코드는 6자리입니다')
    .regex(/^[A-Z0-9]+$/, '참여 코드는 영문 대문자와 숫자로만 구성됩니다'),
})

// Chat message request schema
export const sendMessageSchema = z.object({
  participantId: z.string().uuid('유효하지 않은 참가자 ID입니다'),
  userMessage: z.string()
    .min(1, '메시지를 입력해주세요')
    .max(5000, '메시지는 5000자 이내로 입력해주세요'),
  discussionId: z.string().uuid().optional(),
})

// Update participant schema
export const updateParticipantSchema = z.object({
  stance: z.string().max(50).optional(),
  stance_statement: z.string().max(2000).optional(),
  is_submitted: z.boolean().optional(),
  needs_help: z.boolean().optional(),
  is_online: z.boolean().optional(),
})

// Comment schema
export const createCommentSchema = z.object({
  participantId: z.string().uuid(),
  content: z.string().min(1).max(1000, '댓글은 1000자 이내로 입력해주세요'),
})

// Like schema
export const toggleLikeSchema = z.object({
  participantId: z.string().uuid(),
})

// Type exports
export type AiMode = z.infer<typeof aiModeSchema>
export type DiscussionSettings = z.infer<typeof discussionSettingsSchema>
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>
export type UpdateDiscussionInput = z.infer<typeof updateDiscussionSchema>
export type JoinDiscussionInput = z.infer<typeof joinDiscussionSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>
