import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import { AI_MODEL } from '@/lib/openai'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface DiscussionSettings {
    anonymous?: boolean
    stanceOptions?: string[]
    aiMode?: string
}

// System prompts for standard modes
const getSystemPrompt = (
    mode: string,
    discussionTitle: string,
    discussionDescription: string | null,
    stanceLabel?: string,
    isClosing?: boolean
) => {
    const baseContext = `
당신의 역할은 "${discussionTitle}" 주제에 대한 토론을 안내하는 AI 튜터입니다.
${discussionDescription ? `토론 설명: ${discussionDescription}` : ''}
${stanceLabel ? `현재 대화 중인 학생의 입장: "${stanceLabel}"` : ''}
학생이 비판적 사고를 발전시키고 자신의 주장을 명확히 표현할 수 있도록 도와주세요.
응답은 한국어로 해주세요. 응답은 간결하고 명확하게 2-4문장으로 작성하세요.
${isClosing ? '중요: 이제 토론을 마무리할 시간입니다. 학생의 의견을 정리해주거나, 마지막으로 깊이 생각해볼 만한 질문을 던지며 대화를 정중히 종료하세요.' : ''}
`

    switch (mode) {
        case 'socratic':
            return `${baseContext}
당신의 역할은 소크라테스식 대화를 이끄는 것입니다:
- 학생의 생각을 질문으로 확장시키세요
- "왜 그렇게 생각하나요?", "만약 ~라면 어떨까요?", "다른 관점에서 보면?" 같은 탐구 질문을 하세요
- 직접적인 답을 주지 말고, 학생이 스스로 생각의 모순이나 한계를 발견하도록 이끄세요`

        case 'balanced':
            return `${baseContext}
당신의 역할은 균형 잡힌 토론 파트너입니다:
- 학생의 의견에 공감을 표하고 좋은 점을 인정하세요
- 부드럽게 다른 관점도 소개해주세요
- 질문과 정보 제공의 균형을 유지하세요`

        case 'minimal':
            return `${baseContext}
당신의 역할은 최소한의 개입으로 토론을 촉진하는 것입니다:
- 학생의 발언을 요약하고 확인해주세요
- 직접적인 피드백이나 정보 제공은 최소화하세요`

        default: // debate will be handled separately w/ Chain of Thought, but fallback here if needed
            return `${baseContext}
학생이 자신의 생각을 정리하고 발전시킬 수 있도록 도와주세요.`
    }
}

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
            return handleMockResponse(discussionId || id, participantId, supabase)
        }

        // Get conversation history
        const { data: history } = await supabase
            .from('discussion_messages')
            .select('role, content')
            .eq('participant_id', participantId)
            .order('created_at', { ascending: true })

        // Get student information
        const { data: participant } = await supabase
            .from('discussion_participants')
            .select('stance')
            .eq('id', participantId)
            .single()

        const settings = discussion.settings as any
        const stanceLabel = participant?.stance ? settings?.stanceLabels?.[participant.stance] : undefined
        const aiMode = settings?.aiMode || 'socratic'
        const userTurns = history?.filter(m => m.role === 'user').length || 0
        const maxTurns = settings?.maxTurns || 10
        const isClosing = userTurns >= maxTurns - 1

        // Initialize ChatOpenAI
        const chat = new ChatOpenAI({
            modelName: AI_MODEL, // Updated to global setting
            temperature: aiMode === 'debate' ? 0.7 : 0.5, // Higher temp for debate creativity
            openAIApiKey: process.env.OPENAI_API_KEY,
        })

        let aiResponse = ''

        if (aiMode === 'debate') {
            // --- LangChain Chain of Thought for Debate Mode ---
            // 1. Define the CoT Prompt Template in Korean
            const debatePrompt = PromptTemplate.fromTemplate(`
당신은 "{discussionTitle}" 주제에 대해 학생과 치열하게 논쟁하는 '악마의 변호인(Devil's Advocate)'입니다.
학생의 입장: "{studentStance}" (만약 학생의 입장이 불분명하다면, 그들의 발언을 통해 추론하고 반대 입장을 취하십시오)

현재 대화 내역:
{history}

학생의 마지막 발언: "{input}"

다음 단계에 따라 논리적으로 사고한 후 답변하십시오 (Chain of Thought):
1. [주장 분석]: 학생의 핵심 주장과 논거가 무엇인지 파악하십시오.
2. [약점 포착]: 논리적 비약, 근거 부족, 편향된 시각 등 공격할 지점을 찾으십시오.
3. [반론 구성]: 학생의 입장과 정반대되는 강력한 반론을 구성하십시오.
4. [답변 생성]: 예의를 갖추되 절대 물러서지 말고, 날카로운 질문이나 반박으로 응수하십시오.
   - 학생의 말에 쉽게 동의하거나 "좋은 의견입니다"라고 하지 마십시오.
   - "하지만", "그렇다면", "간과하고 있는 점은" 등의 표현을 사용하십시오.

최종 답변만 한국어로 출력하십시오. (사고 과정은 내부적으로만 수행하고 출력하지 마십시오)
`);

            // 2. Format history for template
            const historyText = history?.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n') || '';

            // 3. Create Chain
            const chain = RunnableSequence.from([
                debatePrompt,
                chat,
                new StringOutputParser()
            ]);

            // 4. Run Chain
            aiResponse = await chain.invoke({
                discussionTitle: discussion.title,
                studentStance: stanceLabel || 'Unknown',
                history: historyText,
                input: userMessage
            });

        } else {
            // --- Standard Mode (Socratic, Balanced, Minimal) ---
            const systemPrompt = getSystemPrompt(aiMode, discussion.title, discussion.description, stanceLabel, isClosing)

            const messages = [
                new SystemMessage(systemPrompt),
                ...(history?.map(m =>
                    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
                ) || []),
                new HumanMessage(userMessage)
            ]

            const response = await chat.invoke(messages)
            aiResponse = response.content as string
        }

        // Save AI response to database
        const { data: aiMessage, error: saveError } = await supabase
            .from('discussion_messages')
            .insert({
                session_id: discussionId || id,
                participant_id: participantId,
                role: 'ai',
                content: aiResponse,
                response_id: 'langchain-generated'
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
