import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { ChatOpenAI } from "@langchain/openai"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { AI_MODEL } from '@/lib/openai'
import { KEY_POINTS_EXTRACTION_PROMPT } from '@/lib/prompts'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

interface RouteParams {
    params: Promise<{ id: string }>
}

// POST /api/discussions/[id]/extract-keypoints
// Extract key discussion points from conversation history for final reflection
export async function POST(request: NextRequest, { params }: RouteParams) {
    // Apply rate limiting for AI endpoints
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ai, 'extract-keypoints')
    if (rateLimitResponse) return rateLimitResponse

    try {
        const { id: sessionId } = await params
        const supabase = await createSupabaseRouteClient()

        const body = await request.json()
        const { participantId } = body

        if (!participantId) {
            return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get discussion info
        const { data: discussion } = await supabase
            .from('discussion_sessions')
            .select('id, title, description, settings')
            .eq('id', sessionId)
            .single()

        if (!discussion) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
        }

        // Get participant info
        const { data: participant } = await supabase
            .from('discussion_participants')
            .select('id, stance, user_id')
            .eq('id', participantId)
            .single()

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Verify user owns this participant record
        if (participant.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get conversation history
        const { data: messages } = await supabase
            .from('discussion_messages')
            .select('role, content')
            .eq('participant_id', participantId)
            .order('created_at', { ascending: true })

        if (!messages || messages.length === 0) {
            return NextResponse.json({
                keyPoints: ['아직 대화 내용이 없습니다.']
            })
        }

        // Build conversation history text
        const historyText = messages.map(m =>
            `${m.role === 'user' ? '학생' : 'AI'}: ${m.content}`
        ).join('\n\n')

        const settings = discussion.settings as any
        const stanceLabel = participant.stance
            ? (settings?.stanceLabels?.[participant.stance] || participant.stance)
            : '미정'

        // Check if OpenAI key exists
        if (!process.env.OPENAI_API_KEY) {
            // Return mock key points if no API key
            return NextResponse.json({
                keyPoints: [
                    '이 토론에서 다룬 주요 논점을 정리해보세요.',
                    '자신의 입장이 어떻게 발전했는지 생각해보세요.',
                    '새롭게 알게 된 관점이나 정보가 있었나요?'
                ]
            })
        }

        // Use LangChain to extract key points
        const chat = new ChatOpenAI({
            modelName: AI_MODEL,
            temperature: 0.3,
            openAIApiKey: process.env.OPENAI_API_KEY,
        })

        const chain = RunnableSequence.from([
            KEY_POINTS_EXTRACTION_PROMPT,
            chat,
            new StringOutputParser()
        ])

        const result = await chain.invoke({
            discussionTitle: discussion.title,
            description: discussion.description || '',
            studentStance: stanceLabel,
            history: historyText,
        })

        // Parse JSON response
        try {
            const parsed = JSON.parse(result)
            const keyPoints = parsed.keyPoints || []

            // Save extracted key points to participant record
            await supabase
                .from('discussion_participants')
                .update({ reflection_key_points: keyPoints })
                .eq('id', participantId)

            return NextResponse.json({ keyPoints })
        } catch (parseError) {
            console.error('Failed to parse key points:', parseError)
            // Return a fallback if parsing fails
            return NextResponse.json({
                keyPoints: [
                    result.slice(0, 200) // Return raw result truncated
                ]
            })
        }

    } catch (error) {
        console.error('Extract keypoints error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
