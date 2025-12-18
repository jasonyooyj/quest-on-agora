'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Settings2,
  Users,
  EyeOff,
  Clock
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

const discussionSchema = z.object({
  title: z.string().min(2, '제목을 2자 이상 입력해주세요').max(100, '제목은 100자 이하로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이하로 입력해주세요').optional(),
  aiMode: z.enum(['socratic', 'balanced', 'minimal']),
})

type DiscussionFormInput = z.input<typeof discussionSchema>
type DiscussionFormOutput = z.output<typeof discussionSchema>

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars (0, O, 1, I)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function NewDiscussionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [anonymous, setAnonymous] = useState(true)

  const { register, handleSubmit, formState: { errors } } = useForm<DiscussionFormInput>({
    resolver: zodResolver(discussionSchema),
    defaultValues: {
      aiMode: 'socratic',
    },
  })

  const onSubmit = async (data: DiscussionFormInput) => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const joinCode = generateJoinCode()

      const { data: discussion, error } = await supabase
        .from('discussion_sessions')
        .insert({
          instructor_id: user.id,
          title: data.title,
          description: data.description || null,
          status: 'draft',
          join_code: joinCode,
          settings: {
            anonymous: anonymous,
            stanceOptions: ['pro', 'con', 'neutral'],
            aiMode: data.aiMode,
          },
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating discussion:', error)
        toast.error('토론 생성에 실패했습니다')
        return
      }

      toast.success('토론이 생성되었습니다!')
      router.push(`/instructor/discussions/${discussion.id}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('토론 생성 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background noise-overlay">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <Link href="/instructor" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center transition-colors">
                <MessageCircle className="w-8 h-8 text-[hsl(var(--coral))] group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Agora
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 lg:px-12 py-12">
        {/* Back Link */}
        <Link
          href="/instructor"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드로 돌아가기
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="tag mb-4">새 토론</div>
          <h1 className="mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            토론 만들기
          </h1>
          <p className="text-muted-foreground text-lg mb-10">
            학생들과 함께할 새로운 토론을 설정하세요
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Title */}
            <div className="brutal-box bg-card p-6">
              <label className="block text-sm font-semibold uppercase tracking-wider mb-3">
                토론 주제 *
              </label>
              <input
                type="text"
                placeholder="예: 기본소득제 도입의 필요성"
                className="input-editorial w-full"
                {...register('title')}
              />
              {errors.title && (
                <p className="mt-2 text-sm text-[hsl(var(--coral))]">{errors.title.message}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                학생들에게 보여질 토론 주제입니다
              </p>
            </div>

            {/* Description */}
            <div className="brutal-box bg-card p-6">
              <label className="block text-sm font-semibold uppercase tracking-wider mb-3">
                설명 (선택)
              </label>
              <textarea
                placeholder="토론에 대한 배경 설명이나 참고 자료 안내를 입력하세요..."
                className="input-editorial w-full min-h-[120px] resize-y"
                {...register('description')}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-[hsl(var(--coral))]">{errors.description.message}</p>
              )}
            </div>

            {/* Settings */}
            <div className="brutal-box bg-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings2 className="w-5 h-5 text-[hsl(var(--coral))]" />
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  토론 설정
                </h3>
              </div>

              <div className="space-y-6">
                {/* Anonymous Mode */}
                <div className="flex items-center justify-between p-4 border-2 border-border">
                  <div className="flex items-center gap-4">
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">익명 모드</p>
                      <p className="text-sm text-muted-foreground">
                        학생 이름 대신 "학생 1, 학생 2..."로 표시됩니다
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={anonymous}
                    onCheckedChange={setAnonymous}
                  />
                </div>

                {/* AI Mode */}
                <div className="p-4 border-2 border-border">
                  <div className="flex items-center gap-4 mb-4">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">AI 대화 모드</p>
                      <p className="text-sm text-muted-foreground">
                        AI가 학생들과 어떻게 대화할지 설정합니다
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'socratic', label: '소크라테스', desc: '질문으로 사고 유도' },
                      { value: 'balanced', label: '균형', desc: '양측 관점 제시' },
                      { value: 'minimal', label: '최소', desc: '필요시에만 개입' },
                    ].map((mode) => (
                      <label
                        key={mode.value}
                        className="flex flex-col p-3 border-2 border-border cursor-pointer hover:border-foreground transition-colors has-[:checked]:bg-foreground has-[:checked]:text-background"
                      >
                        <input
                          type="radio"
                          value={mode.value}
                          className="sr-only"
                          {...register('aiMode')}
                        />
                        <span className="font-semibold">{mode.label}</span>
                        <span className="text-xs opacity-70">{mode.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="p-4 border-l-4 border-[hsl(var(--coral))] bg-[hsl(var(--coral))]/5">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[hsl(var(--coral))] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">토론은 초안 상태로 생성됩니다</p>
                  <p className="text-sm text-muted-foreground">
                    생성 후 "시작하기" 버튼을 눌러야 학생들이 참여할 수 있습니다
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Link href="/instructor">
                <button type="button" className="btn-brutal">
                  취소
                </button>
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-brutal-fill flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    토론 만들기
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
