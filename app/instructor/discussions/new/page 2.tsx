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
  aiMode: z.enum(['socratic', 'balanced', 'minimal', 'debate']),
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
  const [useCustomStances, setUseCustomStances] = useState(false)
  const [stanceLabels, setStanceLabels] = useState({ pro: '찬성', con: '반대' })
  const [additionalStances, setAdditionalStances] = useState<string[]>([])
  const [duration, setDuration] = useState(15)

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
      const maxTurns = Math.max(3, Math.round(duration / 3))

      // Build stance labels map and options array
      const labels: Record<string, string> = {
        pro: stanceLabels.pro,
        con: stanceLabels.con,
        neutral: '중립'
      }

      const stanceOptions = ['pro', 'con', 'neutral']

      additionalStances.forEach((label, index) => {
        const id = `stance_${String.fromCharCode(99 + index)}` // stance_c, stance_d...
        labels[id] = label
        stanceOptions.push(id)
      })

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
            stanceOptions,
            stanceLabels: labels,
            aiMode: data.aiMode,
            maxTurns,
            duration,
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

              <div className="space-y-8">
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

                {/* Custom Stances */}
                <div className="p-4 border-2 border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">커스텀 입장 설정</p>
                        <p className="text-sm text-muted-foreground">
                          "찬성/반대" 대신 직접 입장 이름을 지정합니다
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={useCustomStances}
                      onCheckedChange={setUseCustomStances}
                    />
                  </div>

                  {useCustomStances && (
                    <div className="space-y-4 pt-2 border-t-2 border-dashed border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase mb-1 block">입장 A (찬성측)</label>
                          <input
                            type="text"
                            value={stanceLabels.pro}
                            onChange={(e) => setStanceLabels({ ...stanceLabels, pro: e.target.value })}
                            className="input-editorial w-full py-2 px-3 text-sm"
                            placeholder="예: 기술 낙관론"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase mb-1 block">입장 B (반대측)</label>
                          <input
                            type="text"
                            value={stanceLabels.con}
                            onChange={(e) => setStanceLabels({ ...stanceLabels, con: e.target.value })}
                            className="input-editorial w-full py-2 px-3 text-sm"
                            placeholder="예: 기술 비관론"
                          />
                        </div>
                      </div>

                      {/* Additional Stances */}
                      <div className="space-y-3">
                        {additionalStances.map((stance, index) => (
                          <div key={index} className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-bold uppercase mb-1 block">입장 {String.fromCharCode(67 + index)}</label>
                              <input
                                type="text"
                                value={stance}
                                onChange={(e) => {
                                  const newStances = [...additionalStances]
                                  newStances[index] = e.target.value
                                  setAdditionalStances(newStances)
                                }}
                                className="input-editorial w-full py-2 px-3 text-sm"
                                placeholder="예: 중립적 관점"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalStances(additionalStances.filter((_, i) => i !== index))
                              }}
                              className="btn-brutal h-[42px] px-3 text-[hsl(var(--coral))]"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAdditionalStances([...additionalStances, '신규 입장'])}
                          className="btn-brutal w-full py-2 text-sm border-dashed"
                        >
                          + 입장 추가
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration Slider */}
                <div className="p-4 border-2 border-border">
                  <div className="flex items-center gap-4 mb-6">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">토론 시간 설정</p>
                      <p className="text-sm text-muted-foreground">
                        예상 토론 시간은 AI와의 문답 횟수를 결정합니다
                      </p>
                    </div>
                  </div>

                  <div className="px-2">
                    <input
                      type="range"
                      min="3"
                      max="60"
                      step="3"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-[hsl(var(--coral))]"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold font-mono">
                      <span>3분</span>
                      <span>30분</span>
                      <span>60분</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted/30 border-2 border-border flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">선택한 시간</span>
                      <div className="text-2xl font-bold font-mono text-[hsl(var(--coral))]">{duration}분</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">예상 문답 횟수</span>
                      <div className="text-2xl font-bold font-mono text-foreground">{Math.max(3, Math.round(duration / 3))}회</div>
                    </div>
                  </div>
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
                      { value: 'debate', label: '디베이트', desc: '적극적인 반론 제기' },
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
            <div className="p-4 border-l-4 border-foreground bg-muted/20">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-foreground text-background flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">!</div>
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
