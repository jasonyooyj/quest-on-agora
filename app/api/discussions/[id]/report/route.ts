import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { openai, AI_MODEL } from '@/lib/openai'
import { DISCUSSION_REPORT_SYSTEM_PROMPT } from '@/lib/prompts'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { requireDiscussionOwner } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface Participant {
  id: string
  display_name: string | null
  stance: string | null
  stance_statement: string | null
  is_submitted: boolean
}

interface Message {
  id: string
  role: string
  content: string
  participant_id: string | null
}

// GET /api/discussions/[id]/report - Generate discussion report
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting for AI endpoints
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ai, 'report')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Verify user is authenticated, is an instructor, and owns this discussion
    try {
      await requireDiscussionOwner(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized'
      const status = message.includes('Forbidden') ? 403 : 401
      return NextResponse.json({ error: message }, { status })
    }

    const supabase = await createSupabaseRouteClient()

    // Get discussion
    const { data: discussion, error: discussionError } = await supabase
      .from('discussion_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (discussionError || !discussion) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
    }

    // Get participants
    const { data: participants } = await supabase
      .from('discussion_participants')
      .select('id, display_name, stance, stance_statement, is_submitted')
      .eq('session_id', id)

    // Get messages
    const { data: messages } = await supabase
      .from('discussion_messages')
      .select('id, role, content, participant_id')
      .eq('session_id', id)
      .order('created_at', { ascending: true })

    // Calculate statistics
    const stats = calculateStats(participants || [], messages || [])

    // Generate AI summary if OpenAI is available
    let aiSummary = null
    if (process.env.OPENAI_API_KEY && messages && messages.length > 0) {
      aiSummary = await generateAISummary(discussion, participants || [], messages)
    }

    return NextResponse.json({
      report: {
        discussion: {
          id: discussion.id,
          title: discussion.title,
          description: discussion.description,
          status: discussion.status,
          createdAt: discussion.created_at,
          closedAt: discussion.closed_at,
          settings: discussion.settings
        },
        statistics: stats,
        participants: participants?.map(p => ({
          displayName: p.display_name,
          stance: p.stance,
          stanceStatement: p.stance_statement,
          isSubmitted: p.is_submitted
        })),
        aiSummary,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function calculateStats(participants: Participant[], messages: Message[]) {
  const totalParticipants = participants.length
  const submittedCount = participants.filter(p => p.is_submitted).length
  const stanceCounts: Record<string, number> = {}

  participants.forEach(p => {
    if (p.stance) {
      stanceCounts[p.stance] = (stanceCounts[p.stance] || 0) + 1
    }
  })

  const totalMessages = messages.length
  const userMessages = messages.filter(m => m.role === 'user').length
  const aiMessages = messages.filter(m => m.role === 'ai').length

  // Calculate average messages per participant
  const participantMessageCounts: Record<string, number> = {}
  messages.filter(m => m.participant_id).forEach(m => {
    if (m.participant_id) {
      participantMessageCounts[m.participant_id] = (participantMessageCounts[m.participant_id] || 0) + 1
    }
  })

  const avgMessagesPerParticipant = totalParticipants > 0
    ? userMessages / totalParticipants
    : 0

  return {
    totalParticipants,
    submittedCount,
    submissionRate: totalParticipants > 0 ? (submittedCount / totalParticipants * 100).toFixed(1) : '0',
    stanceDistribution: stanceCounts,
    totalMessages,
    userMessages,
    aiMessages,
    avgMessagesPerParticipant: avgMessagesPerParticipant.toFixed(1)
  }
}

async function generateAISummary(
  discussion: { title: string; description: string | null },
  participants: Participant[],
  messages: Message[]
) {
  try {
    // Prepare conversation summary for AI
    const conversationSummary = messages
      .slice(0, 50) // Limit to first 50 messages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n')

    const stanceStatements = participants
      .filter(p => p.stance_statement)
      .map(p => `- ${p.stance}: ${p.stance_statement}`)
      .join('\n')

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: DISCUSSION_REPORT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `토론 주제: ${discussion.title}
${discussion.description ? `설명: ${discussion.description}` : ''}

참가자 입장 요약:
${stanceStatements || '(입장 제출 없음)'}

주요 대화 내용:
${conversationSummary}

위 토론에 대해 다음을 분석해주세요:
1. 주요 논점 요약 (2-3문장)
2. 눈에 띄는 주장이나 관점
3. 토론의 전반적인 질과 깊이 평가
4. 개선을 위한 제안 (선택적)

간결하게 답변해주세요.`
        }
      ],
      max_completion_tokens: 1000
    })

    return completion.choices[0]?.message?.content || null
  } catch (error) {
    console.error('Error generating AI summary:', error)
    return null
  }
}
