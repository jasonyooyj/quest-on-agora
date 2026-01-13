import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { AI_MODEL } from '@/lib/openai'

// Standard prompts from chat route
const getSystemPrompt = (
    mode: string,
    discussionTitle: string,
    discussionDescription: string | null
) => {
    const baseContext = `
당신의 역할은 "${discussionTitle}" 주제에 대한 토론을 안내하는 AI 튜터입니다.
${discussionDescription ? `토론 설명: ${discussionDescription}` : ''}
학생이 비판적 사고를 발전시키고 자신의 주장을 명확히 표현할 수 있도록 도와주세요.
응답은 한국어로 해주세요. 응답은 간결하고 명확하게 2-4문장으로 작성하세요.
중요: 이것은 토론의 시작이며, 당신의 첫 번째 메시지입니다. 학생의 흥미를 유발하고 토론을 시작하게 하세요.
`

    switch (mode) {
        case 'socratic':
            return `${baseContext}
당신의 역할은 소크라테스입니다. 학생의 내면에 있는 무의식적인 전제와 믿음을 스스로 발견하도록 이끄는 '산파술(Maieutics)'을 수행하세요:
- 학생이 당연하게 여기는 가정에 대해 "왜?"라고 끊임없이 물으세요.
- 표면적인 답변 너머에 있는 근본적인 가치관이나 신념을 탐구하세요.
- 절대 정답을 주지 말고, 오직 질문을 통해서만 대화를 이끌어가세요.`

        case 'balanced':
            return `${baseContext}
당신의 역할은 균형 잡힌 토론 파트너입니다:
- 학생이 주제에 대해 어떻게 생각하는지 부드럽게 물어보세요.
- 열린 마음으로 다양한 관점이 있음을 시사하며 대화를 시작하세요.`

        case 'minimal':
            return `${baseContext}
당신의 역할은 최소한의 개입으로 토론을 촉진하는 것입니다:
- 주제를 가볍게 제시하고 학생의 자유로운 발언을 유도하세요.`

        default:
            return `${baseContext}
학생이 자신의 생각을 자유롭게 표현할 수 있도록 질문으로 대화를 시작하세요.`
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { title, description } = body

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                previews: {
                    socratic: "OpenAI API 키가 설정되지 않아 예시를 불러올 수 없습니다.",
                    balanced: "OpenAI API 키가 설정되지 않아 예시를 불러올 수 없습니다.",
                    debate: "OpenAI API 키가 설정되지 않아 예시를 불러올 수 없습니다.",
                    minimal: "OpenAI API 키가 설정되지 않아 예시를 불러올 수 없습니다."
                }
            })
        }

        const chat = new ChatOpenAI({
            modelName: AI_MODEL,
            temperature: 0.7,
            openAIApiKey: process.env.OPENAI_API_KEY,
        })

        const modes = ['socratic', 'balanced', 'debate', 'minimal']
        const previewPromises = modes.map(async (mode) => {
            if (mode === 'debate') {
                const debatePrompt = PromptTemplate.fromTemplate(`
당신은 "{discussionTitle}" 주제에 대해 학생과 치열하게 논쟁하는 '악마의 변호인(Devil's Advocate)'입니다.
${description ? `토론 설명: ${description}` : ''}

이것은 토론의 시작입니다. 학생에게 도전적인 질문이나 반대 관점을 제시하며 대화를 시작하십시오.
- "하지만", "그렇다면", "간과하고 있는 점은" 등의 뉘앙스를 담은 질문으로 시작하십시오.
- 학생의 입장이 아직 정의되지 않았으므로, 일반적인 통념에 반대하는 입장을 취해 질문하십시오.

최종 답변만 한국어로 출력하십시오. (사고 과정은 내부적으로만 수행하고 출력하지 마십시오)
`)
                const chain = RunnableSequence.from([
                    debatePrompt,
                    chat,
                    new StringOutputParser()
                ])

                return {
                    mode,
                    content: await chain.invoke({
                        discussionTitle: title
                    })
                }
            } else {
                const systemPrompt = getSystemPrompt(mode, title, description)
                const messages = [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "토론을 시작해줘." }
                ]
                const response = await chat.invoke(messages)
                return {
                    mode,
                    content: response.content as string
                }
            }
        })

        const results = await Promise.all(previewPromises)
        const previews = results.reduce((acc, { mode, content }) => {
            acc[mode] = content
            return acc
        }, {} as Record<string, string>)

        return NextResponse.json({ previews })

    } catch (error) {
        console.error('Preview generation error:', error)
        return NextResponse.json({ error: 'Failed to generate previews' }, { status: 500 })
    }
}
