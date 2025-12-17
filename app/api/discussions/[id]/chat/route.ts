import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface DiscussionSettings {
    anonymous?: boolean
    stanceOptions?: string[]
    aiMode?: string
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// System prompts for different AI modes
const getSystemPrompt = (mode: string, discussionTitle: string, discussionDescription: string | null) => {
    const baseContext = `
당신은 "${discussionTitle}" 주제에 대한 토론을 안내하는 AI 튜터입니다.
${discussionDescription ? `토론 설명: ${discussionDescription}` : ''}
학생이 비판적 사고를 발전시키고 자신의 주장을 명확히 표현할 수 있도록 도와주세요.
응답은 한국어로 해주세요. 응답은 간결하고 명확하게 2-4문장으로 작성하세요.
`

    switch (mode) {
        case 'socratic':
            return `${baseContext}
당신의 역할은 소크라테스식 대화를 이끄는 것입니다:
- 학생의 생각을 질문으로 확장시키세요
- "왜 그렇게 생각하나요?", "만약 ~라면 어떨까요?", "다른 관점에서 보면?" 같은 탐구 질문을 하세요
- 직접적인 답을 주지 말고, 학생이 스스로 생각의 모순이나 한계를 발견하도록 이끄세요
- 학생의 논거가 약하면 반론을 부드럽게 제시하여 더 깊은 사고를 유도하세요
- 구체적인 근거나 사례를 요청하세요`

        case 'balanced':
            return `${baseContext}
당신의 역할은 균형 잡힌 토론 파트너입니다:
- 학생의 의견에 공감을 표하고 좋은 점을 인정하세요
- 부드럽게 다른 관점도 소개해주세요
- 필요하면 관련 정보나 사실을 제공하세요
- 질문과 정보 제공의 균형을 유지하세요`

        case 'minimal':
            return `${baseContext}
당신의 역할은 최소한의 개입으로 토론을 촉진하는 것입니다:
- 학생의 발언을 요약하고 확인해주세요
- 토론의 방향을 잡아주는 간단한 질문만 하세요
- 직접적인 피드백이나 정보 제공은 최소화하세요`

        default:
            return `${baseContext}
학생이 자신의 생각을 정리하고 발전시킬 수 있도록 도와주세요.`
    }
}

// POST /api/discussions/[id]/chat - AI chat response
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const body = await request.json()
        const { participantId, userMessage, discussionId } = body

        if (!participantId || !userMessage) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get discussion info
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', discussionId || id)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        // Verify OpenAI API key exists
        if (!process.env.OPENAI_API_KEY) {
            // Fallback to mock response if no API key
            return handleMockResponse(discussionId || id, participantId, supabase)
        }

        // Get conversation history
        const { data: history } = await supabase
            .from('discussion_messages')
            .select('role, content')
            .eq('participant_id', participantId)
            .order('created_at', { ascending: true })
            .limit(20)

        const settings = discussion.settings as DiscussionSettings
        const aiMode = settings?.aiMode || 'socratic'
        const systemPrompt = getSystemPrompt(aiMode, discussion.title, discussion.description)

        // Build messages for OpenAI
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt }
        ]

        // Add conversation history
        if (history) {
            for (const msg of history) {
                if (msg.role === 'user') {
                    messages.push({ role: 'user', content: msg.content })
                } else if (msg.role === 'ai') {
                    messages.push({ role: 'assistant', content: msg.content })
                }
            }
        }

        // Add current message
        messages.push({ role: 'user', content: userMessage })

        // Call OpenAI GPT-5.2
        // GPT-5.2 uses reasoning_effort parameter instead of temperature
        // Options: 'low' (fast), 'medium' (balanced), 'high' (deep reasoning)
        const completion = await openai.chat.completions.create({
            model: 'gpt-5.2-chat-latest',
            messages,
            max_completion_tokens: 500,
            reasoning_effort: 'medium', // Balanced for Socratic dialogue
        } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming)

        const aiResponse = completion.choices[0]?.message?.content || '죄송합니다, 응답을 생성하는데 문제가 발생했습니다.'

        // Save AI response to database
        const { data: aiMessage, error: saveError } = await supabase
            .from('discussion_messages')
            .insert({
                session_id: discussionId || id,
                participant_id: participantId,
                role: 'ai',
                content: aiResponse,
                response_id: completion.id
            })
            .select()
            .single()

        if (saveError) {
            console.error('Error saving AI response:', saveError)
        }

        return NextResponse.json({
            message: aiMessage,
            response: aiResponse
        })
    } catch (error) {
        console.error('AI chat error:', error)

        // Fallback to mock response on error
        const { id } = await params
        const supabase = await createSupabaseRouteClient()
        const body = await request.json()
        return handleMockResponse(body.discussionId || id, body.participantId, supabase)
    }
}

// Mock response fallback when OpenAI is not available
async function handleMockResponse(
    sessionId: string,
    participantId: string,
    supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>
) {
    const mockResponses = [
        '흥미로운 관점이네요. 왜 그렇게 생각하시나요? 구체적인 근거가 있나요?',
        '좋은 의견입니다. 반대 입장에서 생각해보면 어떤 반론이 있을 수 있을까요?',
        '그 주장을 뒷받침하는 구체적인 사례나 데이터가 있나요?',
        '만약 그 전제가 틀리다면, 결론은 어떻게 달라질까요?',
        '다른 사람의 관점에서 이 문제를 바라보면 어떤 점이 다르게 보일까요?'
    ]

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]

    // Save mock AI response
    await supabase
        .from('discussion_messages')
        .insert({
            session_id: sessionId,
            participant_id: participantId,
            role: 'ai',
            content: randomResponse
        })

    return NextResponse.json({
        response: randomResponse,
        mock: true
    })
}
