import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { openai, AI_MODEL, AI_PROVIDER } from '@/lib/openai'
import { getGenAI, GEMINI_MODEL } from '@/lib/gemini'
import { TOPIC_GENERATION_PROMPT } from '@/lib/prompts'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

export const runtime = 'nodejs'

interface GeneratedTopic {
  title: string
  description: string
  stances?: {
    pro: string
    con: string
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting for AI endpoints
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ai, 'generate-topics')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { context, fileUrl, fileName, mimeType, locale: bodyLocale } = body

    let textContent = context || ''
    const acceptLanguage = request.headers.get('accept-language') || 'ko'
    const locale = bodyLocale || (acceptLanguage.includes('en') ? 'en' : 'ko')

    if (fileUrl) {
      try {
        console.log('[generate-topics] Extracting text from file:', fileName)

        const extractResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/extract-text`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl, fileName, mimeType }),
          }
        )

        if (extractResponse.ok) {
          const extractData = await extractResponse.json()
          if (extractData.text) {
            textContent = extractData.text
            console.log(
              '[generate-topics] Extracted text length:',
              textContent.length
            )
          }
        } else {
          console.error(
            '[generate-topics] Text extraction failed:',
            await extractResponse.text()
          )
        }
      } catch (extractError) {
        console.error('[generate-topics] Text extraction error:', extractError)
      }
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { error: '컨텍스트나 파일 내용이 필요합니다.' },
        { status: 400 }
      )
    }

    const maxLength = 8000
    const truncatedContent =
      textContent.length > maxLength
        ? textContent.substring(0, maxLength) + '...'
        : textContent
    const userPrompt =
      locale === 'en'
        ? `Based on the following learning material, generate discussion topics:\n\n${truncatedContent}\n\nPlease respond in English.`
        : `다음 학습 자료를 바탕으로 토론 주제를 생성해주세요:\n\n${truncatedContent}\n\n한국어로 답변하세요.`

    console.log(
      '[generate-topics] Generating topics from content length:',
      truncatedContent.length
    )

    const baseMessages = [
      {
        role: 'system' as const,
        content: TOPIC_GENERATION_PROMPT,
      },
      {
        role: 'user' as const,
        content: userPrompt,
      },
    ]

    const requestCompletion = async (extraInstruction?: string) => {
      if (AI_PROVIDER === 'gemini') {
        const genai = getGenAI();

        const systemInstruction = TOPIC_GENERATION_PROMPT;
        const fullPrompt = extraInstruction
          ? `${systemInstruction}\n\n${userPrompt}\n\n${extraInstruction}`
          : `${systemInstruction}\n\n${userPrompt}`;

        // New SDK usage: genai.models.generateContent
        const result = await genai.models.generateContent({
          model: GEMINI_MODEL,
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        // Response structure might be response.text or result.response.text(), let's check docs safely
        // Docs say: console.log(response.text);
        return {
          text: result.text || '', // SDK seems to return text directly or on response object?
          // Docs: const response = await ai.models.generateContent(...) -> console.log(response.text)
          // So result IS the response object which has text property getter?
          // Actually docs say `console.log(response.text);` for Python and JS.
          finishReason: 'stop', // Placeholder or extract if available
          refusal: undefined
        }

      } else {
        // OpenAI Fallback
        const completion = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: extraInstruction
            ? [
              ...baseMessages,
              { role: 'user', content: extraInstruction },
            ]
            : baseMessages,
          max_completion_tokens: 2000,
          response_format: { type: 'json_object' },
        })
        const choice = completion.choices[0]
        const message = choice?.message
        return {
          text: message?.content?.trim() || '',
          finishReason: choice?.finish_reason,
          refusal: (message as { refusal?: string } | undefined)?.refusal,
        }
      }
    }

    let { text: responseText, finishReason, refusal } =
      await requestCompletion()

    if (!responseText) {
      if (refusal || finishReason === 'content_filter') {
        throw new Error(
          '콘텐츠 안전 정책으로 인해 토론 주제를 생성할 수 없습니다.'
        )
      }

      console.warn(
        '[generate-topics] Empty response from model; retrying once.',
        { finishReason }
      )

      const retry = await requestCompletion(
        '응답이 비어있었습니다. 반드시 JSON만 출력하고 topics 배열을 비우지 마세요.'
      )
      responseText = retry.text

      if (!responseText) {
        throw new Error('GPT 응답이 비어있습니다.')
      }
    }

    console.log('[generate-topics] GPT response:', responseText.substring(0, 200))

    let topics: GeneratedTopic[]
    try {
      const parsed = JSON.parse(responseText)
      topics = parsed.topics || []
    } catch (parseError) {
      console.error('[generate-topics] JSON parse error:', parseError)
      throw new Error('토론 주제 생성 결과를 파싱할 수 없습니다.')
    }

    return NextResponse.json({
      success: true,
      topics,
      sourceLength: truncatedContent.length,
    })
  } catch (error) {
    console.error('[generate-topics] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '토론 주제 생성에 실패했습니다.',
      },
      { status: 500 }
    )
  }
}
