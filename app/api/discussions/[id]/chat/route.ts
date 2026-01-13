import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import { AI_MODEL } from '@/lib/openai'
import { sendMessageSchema } from '@/lib/validations/discussion'
import { IterableReadableStream } from "@langchain/core/utils/stream"

interface RouteParams {
    params: Promise<{ id: string }>
}

interface DiscussionSettings {
    anonymous?: boolean
    stanceOptions?: string[]
    aiMode?: string
}

// System prompts for standard modes
import { getDiscussionPromptTemplate } from '@/lib/prompts'

// System prompts for standard modes
// Now handling via imported getDiscussionSystemPrompt

export async function POST(request: NextRequest, { params }: RouteParams) {
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
        // If duration is null (unlimited), maxTurns should be ignored
        const isUnlimited = settings?.duration === null
        const maxTurns = settings?.maxTurns || 10
        const isClosing = !isUnlimited && userTurns >= maxTurns - 1

        // Initialize ChatOpenAI with streaming if requested
        const chat = new ChatOpenAI({
            modelName: AI_MODEL,
            temperature: aiMode === 'debate' ? 0.7 : 0.5,
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

                        // Unified LinkChain Logic for ALL modes
                        const historyText = history?.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n') || ''

                        const promptTemplate = getDiscussionPromptTemplate(aiMode)

                        const chain = RunnableSequence.from([
                            promptTemplate,
                            chat,
                            new StringOutputParser()
                        ])

                        aiStream = await chain.stream({
                            discussionTitle: discussion.title,
                            description: discussion.description || '', // Added description
                            studentStance: stanceLabel || 'Unknown',
                            history: historyText,
                            input: userMessage
                        })

                        for await (const chunk of aiStream) {
                            fullResponse += chunk
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
                        }

                        // Save to database after streaming completes
                        const supabaseForSave = await createSupabaseRouteClient()
                        await supabaseForSave
                            .from('discussion_messages')
                            .insert({
                                session_id: sessionId,
                                participant_id: participantId,
                                role: 'ai',
                                content: fullResponse,
                                response_id: 'langchain-streamed'
                            })

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
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

        // Unified Logic for Non-streaming
        const historyText = history?.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n') || ''
        const promptTemplate = getDiscussionPromptTemplate(aiMode)

        const chain = RunnableSequence.from([
            promptTemplate,
            chat,
            new StringOutputParser()
        ])

        aiResponse = await chain.invoke({
            discussionTitle: discussion.title,
            description: discussion.description || '',
            studentStance: stanceLabel || 'Unknown',
            history: historyText,
            input: userMessage
        })

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
