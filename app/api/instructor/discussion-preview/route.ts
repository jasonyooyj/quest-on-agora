import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { AI_MODEL } from '@/lib/openai'

// Standard prompts from chat route
import { getDiscussionPromptTemplate } from '@/lib/prompts'

// Standard prompts from chat route
// Now handling via imported getDiscussionSystemPrompt

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
            const promptTemplate = getDiscussionPromptTemplate(mode, true) // isStarting = true

            const chain = RunnableSequence.from([
                promptTemplate,
                chat,
                new StringOutputParser()
            ])

            return {
                mode,
                content: await chain.invoke({
                    discussionTitle: title,
                    description: description || '',
                    studentStance: '', // Not used in opening but passed for safety if needed
                    history: '',
                    input: ''
                })
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
