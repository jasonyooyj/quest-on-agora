import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import { AI_MODEL, AI_PROVIDER } from '@/lib/openai'
import { getGeminiChatModel } from '@/lib/gemini'
import { sendMessageSchema } from '@/lib/validations/discussion'
import { IterableReadableStream } from "@langchain/core/utils/stream"
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

import type { DiscussionSettings } from '@/types/discussion'

interface RouteParams {
    params: Promise<{ id: string }>
}

// System prompts for standard modes
import { getDiscussionPromptTemplate, getWrapupPromptTemplate } from '@/lib/prompts'

// System prompts for standard modes
// Now handling via imported getDiscussionSystemPrompt

export async function POST(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting for AI endpoints
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ai, 'ai-chat')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id } = await params
        const supabase = await createSupabaseRouteClient()

        const body = await request.json()
        const validation = sendMessageSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 })
        }

        const { participantId, userMessage, discussionId } = validation.data
        const stream = body.stream === true
        const locale = body.locale || 'ko'
        const language = locale === 'en' ? 'English' : '한국어'

        // Get discussion info
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('*')
            .eq('id', discussionId || id)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        // Verify API key exists based on provider
        if (AI_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
            return handleMockResponse(discussionId || id, participantId, supabase)
        }
        if (AI_PROVIDER === 'gemini' && !process.env.GOOGLE_API_KEY) {
            return handleMockResponse(discussionId || id, participantId, supabase)
        }

        // Save user message if not starting (starting message is empty)
        // Use admin client to bypass RLS for reliable message saving
        if (userMessage && userMessage.trim()) {
            const adminClient = await createSupabaseAdminClient()
            const { data: savedMessage, error: saveError } = await adminClient
                .from('discussion_messages')
                .insert({
                    session_id: discussionId || id,
                    participant_id: participantId,
                    role: 'user',
                    content: userMessage,
                    message_type: 'text',
                    is_visible_to_student: true
                })
                .select()
                .single()

            if (saveError || !savedMessage) {
                console.error('Error saving user message:', saveError)
                return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
            }
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

        const settings = discussion.settings as DiscussionSettings | null
        // Use custom label if available, fallback to raw stance key, then to '미정'
        const stanceLabel = participant?.stance
            ? (settings?.stanceLabels?.[participant.stance] || participant.stance)
            : '미정'
        const aiMode = settings?.aiMode || 'socratic'
        const userTurns = history?.filter(m => m.role === 'user').length || 0
        // If duration is null (unlimited), maxTurns should be ignored
        const isUnlimited = settings?.duration === null
        const maxTurns = settings?.maxTurns || 15
        // Wrap-up triggers one turn before maxTurns
        const isClosing = !isUnlimited && userTurns >= maxTurns - 1

        // Initialize Chat Model based on provider
        const chat = AI_PROVIDER === 'gemini'
            ? getGeminiChatModel({ streaming: stream })
            : new ChatOpenAI({
                modelName: AI_MODEL,
                openAIApiKey: process.env.OPENAI_API_KEY,
                streaming: stream,
            })

        // Handle streaming response
        if (stream) {
            const encoder = new TextEncoder()
            let fullResponse = ''
            const sessionId = discussionId || id

            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        let aiStream: IterableReadableStream<string>

                        // Convert history to LangChain message format for proper placeholder injection
                        const historyMessages = history?.map(m =>
                            m.role === 'user'
                                ? new HumanMessage(m.content)
                                : new AIMessage(m.content)
                        ) || []

                        // Determine if this is a starting message or a response
                        const isStarting = !userTurns && (!userMessage || userMessage.trim() === '')
                        const inputMessage = userMessage || ''

                        // Use wrap-up prompt if this is the final turn
                        const promptTemplate = isClosing
                            ? getWrapupPromptTemplate(aiMode)
                            : getDiscussionPromptTemplate(aiMode, isStarting)

                        const chain = RunnableSequence.from([
                            promptTemplate,
                            chat,
                            new StringOutputParser()
                        ])

                        aiStream = await chain.stream({
                            discussionTitle: discussion.title,
                            description: discussion.description || '',
                            studentStance: stanceLabel,
                            history: historyMessages,
                            input: inputMessage,
                            language
                        })

                        for await (const chunk of aiStream) {
                            fullResponse += chunk
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
                        }

                        // Save to database after streaming completes
                        // Use admin client to bypass RLS for reliable message saving
                        const adminClientForSave = await createSupabaseAdminClient()
                        await adminClientForSave
                            .from('discussion_messages')
                            .insert({
                                session_id: sessionId,
                                participant_id: participantId,
                                role: 'ai',
                                content: fullResponse,
                                response_id: 'langchain-streamed'
                            })

                        // Include isClosing flag so frontend knows to offer extension option
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isClosing })}

`))
                        controller.close()
                    } catch (error) {
                        console.error('Streaming error:', error)
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`))
                        controller.close()
                    }
                }
            })

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            })
        }

        // Non-streaming response (original behavior)
        let aiResponse = ''

        // Determine if this is a starting message or a response
        const isStarting = !userTurns && (!userMessage || userMessage.trim() === '')
        const inputMessage = userMessage || '' // Ensure string for template

        // Convert history to LangChain message format for proper placeholder injection
        const historyMessages = history?.map(m =>
            m.role === 'user'
                ? new HumanMessage(m.content)
                : new AIMessage(m.content)
        ) || []

        // Use wrap-up prompt if this is the final turn
        const promptTemplate = isClosing
            ? getWrapupPromptTemplate(aiMode)
            : getDiscussionPromptTemplate(aiMode, isStarting)

        const chain = RunnableSequence.from([
            promptTemplate,
            chat,
            new StringOutputParser()
        ])

        aiResponse = await chain.invoke({
            discussionTitle: discussion.title,
            description: discussion.description || '',
            studentStance: stanceLabel,
            history: historyMessages,
            input: inputMessage,
            language
        })

        // Save AI response to database
        // Use admin client to bypass RLS for reliable message saving
        const adminClientNonStream = await createSupabaseAdminClient()
        const { data: aiMessage, error: saveError } = await adminClientNonStream
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
    _supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>
) {
    const mockResponses = [
        '흥미로운 관점이네요. 왜 그렇게 생각하시나요? 구체적인 근거가 있나요?',
        '좋은 의견입니다. 반대 입장에서 생각해보면 어떤 반론이 있을 수 있을까요?',
        '그 주장을 뒷받침하는 구체적인 사례나 데이터가 있나요?',
        '만약 그 전제가 틀리다면, 결론은 어떻게 달라질까요?',
        '다른 사람의 관점에서 이 문제를 바라보면 어떤 점이 다르게 보일까요?'
    ]

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]

    // Use admin client to bypass RLS for reliable message saving
    const adminClient = await createSupabaseAdminClient()
    await adminClient
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
