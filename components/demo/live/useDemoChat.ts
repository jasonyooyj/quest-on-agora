'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useDemo, type DemoMessage } from './DemoContext'

interface UseDemoChatOptions {
  onTurnComplete?: (turnCount: number) => void
}

export function useDemoChat(options: UseDemoChatOptions = {}) {
  const locale = useLocale()
  const {
    studentMessages,
    selectedStance,
    turnCount,
    addStudentMessage,
    incrementTurn,
  } = useDemo()

  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (userMessage: string) => {
    if (sending) return

    const isAutoStart = userMessage === ''

    // Add user message to local state (not DB)
    if (!isAutoStart && userMessage.trim()) {
      addStudentMessage({ role: 'user', content: userMessage })
    }

    setSending(true)
    setStreamingContent('')
    setError(null)

    try {
      // Convert messages to API format
      const history = studentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      // Add current message to history if not auto-start
      if (!isAutoStart && userMessage.trim()) {
        history.push({ role: 'user' as const, content: userMessage })
      }

      const response = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMessage,
          history,
          stance: selectedStance || 'neutral',
          locale,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to get response')
      }

      // Handle non-streaming response (fallback)
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        addStudentMessage({ role: 'ai', content: data.response })
        if (!isAutoStart) {
          incrementTurn()
          options.onTurnComplete?.(turnCount + 1)
        }
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.chunk) {
                fullContent += data.chunk
                setStreamingContent(prev => prev + data.chunk)
              }
              if (data.done) {
                addStudentMessage({ role: 'ai', content: fullContent })
                setStreamingContent('')
                if (!isAutoStart) {
                  incrementTurn()
                  options.onTurnComplete?.(turnCount + 1)
                }
              }
              if (data.error) {
                throw new Error(data.error)
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err) {
      console.error('Demo chat error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setStreamingContent('')
    } finally {
      setSending(false)
    }
  }, [sending, studentMessages, selectedStance, locale, addStudentMessage, incrementTurn, turnCount, options])

  return {
    messages: studentMessages,
    sending,
    streamingContent,
    error,
    sendMessage,
    turnCount,
  }
}
