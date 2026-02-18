/**
 * Zod schemas and types for discussion-related requests.
 */

import { z } from 'zod'

/**
 * Allowed AI modes for discussions.
 */
export const aiModeSchema = z.enum(['socratic', 'balanced', 'debate', 'minimal'])

/**
 * Schema for discussion settings payloads.
 */
export const discussionSettingsSchema = z.object({
  anonymous: z.boolean().default(true),
  stanceOptions: z.array(z.string()).min(2).max(10).default(['pro', 'con', 'neutral']),
  stanceLabels: z.record(z.string(), z.string()).optional(),
  aiMode: aiModeSchema.default('socratic'),
  aiContext: z.string().max(5000).optional(),
  maxTurns: z.number().min(3).max(100).nullable().default(15),
  duration: z.number().min(3).max(60).nullable().optional(),
})

/**
 * Schema for create discussion requests.
 */
export const createDiscussionSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional().nullable(),
  settings: discussionSettingsSchema.optional(),
})

/**
 * Schema for update discussion requests.
 */
export const updateDiscussionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  settings: discussionSettingsSchema.partial().optional(),
})

/**
 * Schema for join discussion requests.
 */
export const joinDiscussionSchema = z.object({
  joinCode: z.string()
    .length(6, '참여 코드는 6자리입니다')
    .regex(/^[A-Z0-9]+$/, '참여 코드는 영문 대문자와 숫자로만 구성됩니다'),
})

/**
 * Schema for chat message requests.
 */
export const sendMessageSchema = z.object({
  participantId: z.string().uuid('유효하지 않은 참가자 ID입니다'),
  userMessage: z.string()
    .max(5000, '메시지는 5000자 이내로 입력해주세요')
    .optional(),
  discussionId: z.string().uuid().optional(),
})

/**
 * Schema for participant update requests.
 */
export const updateParticipantSchema = z.object({
  stance: z.string().max(50).optional(),
  stance_statement: z.string().max(2000).optional(),
  final_reflection: z.string().max(5000).optional(),
  is_submitted: z.boolean().optional(),
  needs_help: z.boolean().optional(),
  is_online: z.boolean().optional(),
  requested_extension: z.boolean().optional(),
})

/**
 * Schema for discussion comments.
 */
export const createCommentSchema = z.object({
  participantId: z.string().uuid(),
  content: z.string().min(1).max(1000, '댓글은 1000자 이내로 입력해주세요'),
})

/**
 * Schema for toggling likes.
 */
export const toggleLikeSchema = z.object({
  participantId: z.string().uuid(),
})

/**
 * Type exports derived from discussion schemas.
 */
export type AiMode = z.infer<typeof aiModeSchema>
export type DiscussionSettings = z.infer<typeof discussionSettingsSchema>
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>
export type UpdateDiscussionInput = z.infer<typeof updateDiscussionSchema>
export type JoinDiscussionInput = z.infer<typeof joinDiscussionSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>
