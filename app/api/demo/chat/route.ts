import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { HumanMessage, AIMessage } from "@langchain/core/messages"
import { AI_MODEL, AI_PROVIDER } from '@/lib/openai'
import { getGeminiChatModel } from '@/lib/gemini'
import { applyRateLimit, checkRateLimit, getClientIP, type RateLimitConfig } from '@/lib/rate-limiter'
import { getDiscussionPromptTemplate } from '@/lib/prompts'

// Stricter rate limits for demo endpoint
const DEMO_RATE_LIMITS: Record<string, RateLimitConfig> = {
  perMinute: { limit: 5, windowSeconds: 60 },    // 5 requests per minute
  perHour: { limit: 20, windowSeconds: 3600 },   // 20 requests per hour
}

interface DemoMessage {
  role: 'user' | 'ai'
  content: string
}

interface DemoChatRequest {
  userMessage: string
  history: DemoMessage[]
  stance: string
  locale?: string
}

export async function POST(request: NextRequest) {
  // Apply strict rate limiting for demo
  const clientIP = getClientIP(request)

  // Check per-minute limit
  const minuteResult = checkRateLimit(`demo-min:${clientIP}`, DEMO_RATE_LIMITS.perMinute)
  if (!minuteResult.success) {
    return NextResponse.json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: '데모는 분당 5회까지 사용할 수 있습니다.',
      retryAfter: Math.ceil((minuteResult.resetAt - Date.now()) / 1000),
    }, { status: 429 })
  }

  // Check hourly limit
  const hourResult = checkRateLimit(`demo-hour:${clientIP}`, DEMO_RATE_LIMITS.perHour)
  if (!hourResult.success) {
    return NextResponse.json({
      error: 'Hourly limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: '데모는 시간당 20회까지 사용할 수 있습니다. 전체 기능을 사용하려면 회원가입하세요.',
      retryAfter: Math.ceil((hourResult.resetAt - Date.now()) / 1000),
    }, { status: 429 })
  }

  try {
    const body: DemoChatRequest = await request.json()
    const { userMessage, history = [], stance, locale = 'ko' } = body
    const language = locale === 'en' ? 'English' : '한국어'

    // Validate input
    if (!userMessage && history.length > 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify API key exists
    if (AI_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
      return handleMockResponse()
    }
    if (AI_PROVIDER === 'gemini' && !process.env.GOOGLE_API_KEY) {
      return handleMockResponse()
    }

    // Demo topic from mockData
    const discussionTitle = locale === 'en'
      ? 'Can AI Replace Human Creativity?'
      : '인공지능이 인간의 창의성을 대체할 수 있는가?'
    const description = locale === 'en'
      ? 'Discuss the advancement and limitations of AI in art, music, and writing.'
      : 'AI 예술, 음악, 글쓰기의 발전과 한계에 대해 토론합니다.'

    // Convert history to LangChain message format
    const historyMessages = history.map(m =>
      m.role === 'user'
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    )

    // Determine if this is a starting message
    const isStarting = history.length === 0 && (!userMessage || userMessage.trim() === '')
    const inputMessage = userMessage || ''

    // Use socratic mode for demo (most engaging)
    const aiMode = 'socratic'
    const promptTemplate = getDiscussionPromptTemplate(aiMode, isStarting)

    // Initialize Chat Model
    const chat = AI_PROVIDER === 'gemini'
      ? getGeminiChatModel({ streaming: true })
      : new ChatOpenAI({
          modelName: AI_MODEL,
          openAIApiKey: process.env.OPENAI_API_KEY,
          streaming: true,
        })

    const chain = RunnableSequence.from([
      promptTemplate,
      chat,
      new StringOutputParser()
    ])

    // Streaming response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await chain.stream({
            discussionTitle,
            description,
            studentStance: stance || '미정',
            history: historyMessages,
            input: inputMessage,
            language
          })

          for await (const chunk of aiStream) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
          }

          // No DB save for demo - just complete the stream
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('Demo streaming error:', error)
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

  } catch (error) {
    console.error('Demo chat error:', error)
    return handleMockResponse()
  }
}

// Mock response fallback when API is not available
function handleMockResponse() {
  const mockResponses = [
    '흥미로운 관점이네요. 왜 그렇게 생각하시나요? 구체적인 근거가 있나요?',
    '좋은 의견입니다. 반대 입장에서 생각해보면 어떤 반론이 있을 수 있을까요?',
    '그 주장을 뒷받침하는 구체적인 사례나 데이터가 있나요?',
    '만약 그 전제가 틀리다면, 결론은 어떻게 달라질까요?',
    '다른 사람의 관점에서 이 문제를 바라보면 어떤 점이 다르게 보일까요?'
  ]

  const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]

  return NextResponse.json({
    response: randomResponse,
    mock: true
  })
}
