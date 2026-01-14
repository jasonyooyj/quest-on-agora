'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Loader2, MessageSquare, AlertCircle, Clock } from 'lucide-react'
import { saveJoinIntent, clearJoinIntent } from '@/lib/join-intent'

type JoinStatus = 'loading' | 'joining' | 'error' | 'unauthorized' | 'draft' | 'closed'

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [status, setStatus] = useState<JoinStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const handleJoin = async () => {
      const supabase = getSupabaseClient()

      // Check authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        // Save join intent and redirect to login
        saveJoinIntent(code)
        setStatus('unauthorized')
        // Small delay to show message before redirect
        setTimeout(() => {
          router.push(`/login?redirect=/join/${code}`)
        }, 1000)
        return
      }

      // User is authenticated, try to join
      setStatus('joining')

      try {
        const response = await fetch(`/api/join/${code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle specific error cases
          if (data.needsOnboarding) {
            saveJoinIntent(code)
            router.push('/onboarding')
            return
          }

          if (data.code === 'DRAFT_MODE') {
            setStatus('draft')
            setErrorMessage(data.error)
            return
          }

          if (data.code === 'DISCUSSION_CLOSED') {
            setStatus('closed')
            setErrorMessage(data.error)
            return
          }

          // Check if user is not a student (instructor trying to join)
          if (
            response.status === 403 &&
            data.error === '학생만 토론에 참여할 수 있습니다'
          ) {
            toast.error(data.error)
            router.push('/instructor')
            return
          }

          setStatus('error')
          setErrorMessage(data.error || '토론 참여 중 오류가 발생했습니다')
          toast.error(data.error || '토론 참여 중 오류가 발생했습니다')
          return
        }

        // Success - clear join intent and redirect
        clearJoinIntent()

        if (data.alreadyJoined) {
          toast.info('이미 참여 중인 토론입니다')
        } else {
          toast.success('토론에 참여했습니다!')
        }

        router.push(`/student/discussions/${data.discussionId}`)
      } catch (error) {
        console.error('Join error:', error)
        setStatus('error')
        setErrorMessage('토론 참여 중 오류가 발생했습니다')
        toast.error('토론 참여 중 오류가 발생했습니다')
      }
    }

    handleJoin()
  }, [code, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Agora</h1>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-zinc-400" />
              <p className="text-zinc-600">인증 확인 중...</p>
            </div>
          )}

          {status === 'unauthorized' && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-zinc-400" />
              <p className="text-zinc-600 mb-2">로그인이 필요합니다</p>
              <p className="text-zinc-400 text-sm">로그인 페이지로 이동합니다...</p>
            </div>
          )}

          {status === 'joining' && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-zinc-900 font-medium mb-2">토론 참여 중</p>
              <p className="text-zinc-500 text-sm">
                참여 코드: <span className="font-mono font-bold">{code}</span>
              </p>
            </div>
          )}

          {status === 'draft' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-zinc-900 font-medium mb-2">토론이 아직 시작되지 않았습니다</p>
              <p className="text-zinc-500 text-sm mb-2">
                참여 코드: <span className="font-mono font-bold">{code}</span>
              </p>
              <p className="text-amber-600 text-sm font-medium mb-6">
                교수자에게 토론 시작을 요청해주세요
              </p>
              <button
                onClick={() => router.push('/student')}
                className="px-6 py-2.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-lg font-medium transition-colors"
              >
                대시보드로 이동
              </button>
            </div>
          )}

          {status === 'closed' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 mb-4">
                <AlertCircle className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-zinc-900 font-medium mb-2">토론 종료</p>
              <p className="text-zinc-500 text-sm mb-6">{errorMessage}</p>
              <button
                onClick={() => router.push('/student')}
                className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                대시보드로 이동
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-zinc-900 font-medium mb-2">참여 실패</p>
              <p className="text-zinc-500 text-sm mb-6">{errorMessage}</p>
              <button
                onClick={() => router.push('/student')}
                className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                대시보드로 이동
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-400 text-sm mt-6">
          AI 기반 토론 플랫폼
        </p>
      </div>
    </div>
  )
}
