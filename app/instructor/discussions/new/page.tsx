'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Settings2,
  Users,
  EyeOff,
  Clock,
  Plus,
  AlertCircle,
  X,
  Sparkles,
  Brain,
  Gauge,
  UserCircle2
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

const aiModeOptions = [
  { value: 'socratic', label: '소크라테스', desc: '산파술 기반 깊은 탐구', icon: Brain, color: 'emerald' },
  { value: 'balanced', label: '균형잡힌', desc: '다각도 관점의 조화', icon: Sparkles, color: 'blue' },
  { value: 'debate', label: '디베이트', desc: '도전적이고 예리한 반론', icon: Gauge, color: 'rose' },
  { value: 'minimal', label: '최소 개입', desc: '자율적인 토론 환경', icon: UserCircle2, color: 'zinc' },
]

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DiscussionFormInput>({
    resolver: zodResolver(discussionSchema),
    defaultValues: {
      aiMode: 'socratic',
    },
  })

  const selectedAiMode = watch('aiMode')

  const onSubmit = async (data: DiscussionFormInput) => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const joinCode = generateJoinCode()
      const maxTurns = Math.max(3, Math.round(duration / 3))

      const labels: Record<string, string> = {
        pro: stanceLabels.pro,
        con: stanceLabels.con,
        neutral: '중립'
      }

      const stanceOptions = ['pro', 'con', 'neutral']

      additionalStances.forEach((label, index) => {
        const id = `stance_${String.fromCharCode(99 + index)}`
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
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30 relative overflow-hidden flex flex-col">
      {/* Bioluminescent background blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full filter blur-[120px] animate-blob pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-500/5 rounded-full filter blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 h-24 flex items-center">
        <div className="max-w-[1400px] mx-auto w-full px-8 flex items-center justify-between">
          <Link href="/instructor" className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-500">
              <MessageCircle className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tighter block leading-none">Agora</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Instructor Platform</span>
            </div>
          </Link>

          <Link
            href="/instructor"
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Create Discussion
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 text-center text-white font-display">
            새로운 토론 시작하기
          </h1>
          <p className="text-zinc-400 text-xl font-medium mb-16 text-center max-w-2xl mx-auto leading-relaxed">
            학생들의 사고를 자극할 매력적인 주제를 설정하고, <br />
            맞춤형 AI 튜터와 함께 깊이 있는 대화를 설계하세요.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            {/* Phase 1: Topic & Description */}
            <div className="glass-panel p-10 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden group bg-[#121214]/80">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />

              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">토론 주제 설정</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Phase 01: Core Topic</p>
                </div>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-sm font-black text-zinc-500 uppercase tracking-widest block px-1">토론 주제 <span className="text-primary">*</span></label>
                  <div className="relative group/input">
                    <input
                      type="text"
                      placeholder="예: 인공지능 윤리와 기본소득제 도입의 필요성"
                      className="ios-input w-full bg-white/[0.03] border-white/5 h-16 px-6 text-xl font-bold placeholder:text-zinc-600 focus:bg-white/[0.05]"
                      {...register('title')}
                    />
                    <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
                  </div>
                  {errors.title && (
                    <p className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1.5 px-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-zinc-500 uppercase tracking-widest block px-1">상세 설명 (선택)</label>
                  <textarea
                    placeholder="배경 지식, 참고 링크, 또는 학생들에게 전하고 싶은 핵심 질문을 작성하세요..."
                    className="ios-input w-full bg-white/[0.03] border-white/5 min-h-[180px] p-6 text-lg font-medium leading-relaxed placeholder:text-zinc-600 focus:bg-white/[0.05]"
                    {...register('description')}
                  />
                </div>
              </div>
            </div>

            {/* Phase 2: AI Tutor Configuration */}
            <div className="glass-panel p-10 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden group bg-[#121214]/80">
              <div className="absolute top-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] -ml-40 -mt-40 pointer-events-none group-hover:bg-purple-500/10 transition-all duration-700" />

              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI 튜터 튜닝</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Phase 02: AI Intelligence</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {aiModeOptions.map((mode) => {
                  const Icon = mode.icon
                  return (
                    <label
                      key={mode.value}
                      className={`flex flex-col p-6 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group/card ${selectedAiMode === mode.value
                        ? 'bg-white/5 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                        }`}
                    >
                      <input
                        type="radio"
                        value={mode.value}
                        className="peer sr-only"
                        {...register('aiMode')}
                      />

                      <div className="relative z-10">
                        <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center transition-all duration-500 ${selectedAiMode === mode.value ? 'bg-primary text-black' : 'bg-white/5 text-zinc-500 group-hover/card:bg-white/10'
                          }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className={`font-black text-sm tracking-tight mb-1 ${selectedAiMode === mode.value ? 'text-white' : 'text-zinc-400'}`}>
                          {mode.label}
                        </div>
                        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-tight">
                          {mode.desc}
                        </div>
                      </div>

                      {selectedAiMode === mode.value && (
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Phase 3: Advanced Options */}
            <div className="glass-panel p-10 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden group bg-[#121214]/80">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-700" />

              <div className="flex items-center gap-3 mb-12">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">토론 환경 전문 설정</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Phase 03: Environment</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Anonymous */}
                <div className="flex items-center justify-between p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04] hover:border-white/10">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner">
                      <EyeOff className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">익명 모드 활성화</p>
                      <p className="text-sm text-zinc-500 font-medium">참여자들의 실명을 숨기고 익명으로 토론을 진행합니다.</p>
                    </div>
                  </div>
                  <Switch
                    checked={anonymous}
                    onCheckedChange={setAnonymous}
                    className="data-[state=checked]:bg-primary h-7 w-12"
                  />
                </div>

                {/* Stances */}
                <div className={`p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 transition-all ${useCustomStances ? 'border-primary/20 bg-primary/[0.02]' : 'hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white">커스텀 입장 & 팀 설정</p>
                        <p className="text-sm text-zinc-500 font-medium">기본 찬반 외에 추가적인 팀이나 관점을 정의할 수 있습니다.</p>
                      </div>
                    </div>
                    <Switch
                      checked={useCustomStances}
                      onCheckedChange={setUseCustomStances}
                      className="data-[state=checked]:bg-primary h-7 w-12"
                    />
                  </div>

                  <AnimatePresence>
                    {useCustomStances && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-8 pt-8 border-t border-white/5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Option A (Pro)</label>
                              </div>
                              <input
                                type="text"
                                value={stanceLabels.pro}
                                onChange={(e) => setStanceLabels({ ...stanceLabels, pro: e.target.value })}
                                className="ios-input w-full bg-white/[0.03] border-white/5 h-14 px-5 text-lg font-bold"
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Option B (Con)</label>
                              </div>
                              <input
                                type="text"
                                value={stanceLabels.con}
                                onChange={(e) => setStanceLabels({ ...stanceLabels, con: e.target.value })}
                                className="ios-input w-full bg-white/[0.03] border-white/5 h-14 px-5 text-lg font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {additionalStances.map((stance, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-end gap-4"
                              >
                                <div className="flex-1 space-y-3">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block px-1">Additional Option {index + 1}</label>
                                  <input
                                    type="text"
                                    value={stance}
                                    onChange={(e) => {
                                      const newStances = [...additionalStances]
                                      newStances[index] = e.target.value
                                      setAdditionalStances(newStances)
                                    }}
                                    className="ios-input w-full bg-white/[0.03] border-white/5 h-14 px-5 font-bold"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdditionalStances(additionalStances.filter((_, i) => i !== index))
                                  }}
                                  className="w-14 h-14 rounded-[1.25rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                                >
                                  <X className="w-6 h-6" />
                                </button>
                              </motion.div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setAdditionalStances([...additionalStances, '신규 옵션'])}
                              className="w-full py-5 rounded-[1.25rem] bg-white/5 border border-dashed border-white/10 text-zinc-500 text-sm font-black flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all group"
                            >
                              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                              새로운 입장 추가하기
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Duration */}
                <div className="p-10 rounded-[3.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

                  <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white">토론 유효 시간</p>
                        <p className="text-sm text-zinc-500 font-medium">참여자 개개인의 평균 활동 시간을 설정합니다.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-white leading-none">{duration}</div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">MINUTES</div>
                    </div>
                  </div>

                  <div className="px-2 mb-12 relative z-10">
                    <input
                      type="range"
                      min="3"
                      max="60"
                      step="3"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-black text-zinc-600 tracking-widest uppercase px-1 mt-4">
                      <span>Quick (3m)</span>
                      <span>Target (30m)</span>
                      <span>Deep (60m)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 backdrop-blur-md relative group/stat overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase block mb-2">예상 상호작용</span>
                      <div className="text-4xl font-black text-white flex items-baseline gap-2">
                        {Math.max(3, Math.round(duration / 3))}
                        <span className="text-sm font-black text-zinc-600 uppercase">Turns</span>
                      </div>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 backdrop-blur-md relative group/stat overflow-hidden">
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase block mb-2">분석 정밀도</span>
                      <div className="text-4xl font-black text-white flex items-baseline gap-2">
                        {duration >= 30 ? 'HIGH' : 'MID'}
                        <span className="text-sm font-black text-zinc-600 uppercase">Level</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Guidelines */}
            <div className="p-8 rounded-[3rem] bg-primary/5 border border-primary/10 flex items-start gap-8 group">
              <div className="w-14 h-14 rounded-[1.5rem] bg-primary/20 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-black text-white">운영 가이드라인</p>
                <p className="text-sm text-zinc-500 leading-relaxed mt-2 font-medium">
                  토론 세션은 생성 완료 후 <strong>'대기 상태'</strong>로 저장됩니다. 교수자용 대시보드에서 <strong>"토론 시작"</strong> 버튼을
                  눌러야만 코드가 활성화되며 학생들이 입장을 시작할 수 있습니다. 이미 생성된 주제는 나중에 언제든 수정이 가능합니다.
                </p>
              </div>
            </div>

            {/* Submit Block */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 pt-12 pb-20">
              <button
                type="submit"
                disabled={isLoading}
                className="h-20 w-full md:w-[350px] rounded-full bg-white text-black font-black text-xl flex items-center justify-center gap-4 transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] hover:-translate-y-1.5 active:scale-95 disabled:opacity-50 group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    토론 공간 개설하기
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
              <Link
                href="/instructor"
                className="h-14 px-8 rounded-full border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 font-bold transition-all flex items-center justify-center"
              >
                나중에 만들기 (취소)
              </Link>
            </div>
          </form>
        </motion.div>
      </main>

      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none" />
    </div>
  )
}
