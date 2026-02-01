'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Eye,
  Clock,
  Plus,
  AlertCircle,
  X,
  Sparkles,
  Brain,
  Gauge,
  UserCircle2,
  Search,
  FileText,
  Wand2,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Lock,
  MinusCircle
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { ProfileMenuAuto } from '@/components/profile/ProfileMenuAuto'
import { useTranslations, useFormatter, useLocale } from 'next-intl'
import { useSubscription, canCreateDiscussion } from '@/hooks/useSubscription'
import { LimitWarning, UpgradePrompt } from '@/components/subscription'

const discussionSchema = (t: any) => z.object({
  title: z.string().min(2, t('validation.titleMin')).max(100, t('validation.titleMax')),
  description: z.string().max(500, t('validation.descMax')).optional(),
  aiMode: z.enum(['socratic', 'balanced', 'minimal', 'debate']),
})

type DiscussionFormInput = z.infer<ReturnType<typeof discussionSchema>>

const aiModeOptionsBase = [
  { value: 'socratic', icon: Brain, color: 'emerald' },
  { value: 'balanced', icon: Sparkles, color: 'blue' },
  { value: 'debate', icon: Gauge, color: 'rose' },
  { value: 'minimal', icon: UserCircle2, color: 'zinc' },
]

interface GeneratedTopic {
  title: string
  description: string
  stances?: {
    pro: string
    con: string
  }
}

// Draft storage key and interface
const DRAFT_STORAGE_KEY = 'agora-discussion-draft'

interface DraftData {
  title: string
  description: string
  aiMode: string
  anonymous: boolean
  useCustomStances: boolean
  stanceLabels: { pro: string; con: string }
  additionalStances: string[]
  duration: number | null
  showTopicGenerator: boolean
  learningMaterial: string
  generatedTopics: GeneratedTopic[]
  selectedTopicIndex: number | null
  savedAt: number
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function NewDiscussionPage() {
  const t = useTranslations('Instructor.NewDiscussion')
  const locale = useLocale()
  const format = useFormatter()

  const aiModeOptions = aiModeOptionsBase.map(option => ({
    ...option,
    label: t(`phases.aiTutor.modes.${option.value}.label`),
    desc: t(`phases.aiTutor.modes.${option.value}.desc`)
  }))
  const difficultyLabels = {
    easy: t('phases.topic.aiGenerator.difficulty.easy'),
    medium: t('phases.topic.aiGenerator.difficulty.medium'),
    hard: t('phases.topic.aiGenerator.difficulty.hard'),
  }

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Subscription check
  const { subscription, isLoading: isLoadingSubscription } = useSubscription()
  const createCheck = canCreateDiscussion(subscription)
  const [anonymous, setAnonymous] = useState(true)
  const [useCustomStances, setUseCustomStances] = useState(false)
  const [includeNeutral, setIncludeNeutral] = useState(true)
  const [stanceLabels, setStanceLabels] = useState({ pro: t('phases.environment.stances.pro'), con: t('phases.environment.stances.con') })
  const [additionalStances, setAdditionalStances] = useState<string[]>([])
  const [duration, setDuration] = useState<number | null>(15)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [isFetchingPreviews, setIsFetchingPreviews] = useState(false)
  const previewTimeoutRef = useRef<NodeJS.Timeout>(null)

  const getDifficultyTag = (index: number) => {
    if (index <= 1) {
      return {
        label: difficultyLabels.easy,
        className: 'bg-emerald-100 text-emerald-700',
        selectedClassName: 'bg-emerald-400/30 text-emerald-100',
      }
    }
    if (index === 2) {
      return {
        label: difficultyLabels.medium,
        className: 'bg-amber-100 text-amber-700',
        selectedClassName: 'bg-amber-400/30 text-amber-100',
      }
    }
    return {
      label: difficultyLabels.hard,
      className: 'bg-rose-100 text-rose-700',
      selectedClassName: 'bg-rose-400/30 text-rose-100',
    }
  }

  // AI Topic Generation states
  const [showTopicGenerator, setShowTopicGenerator] = useState(false)
  const [learningMaterial, setLearningMaterial] = useState('')
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopic[]>([])
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null)

  // Draft state
  const [hasDraft, setHasDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const draftTimeoutRef = useRef<NodeJS.Timeout>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DiscussionFormInput>({
    resolver: zodResolver(discussionSchema(t)),
    defaultValues: {
      aiMode: 'socratic',
    },
  })

  const selectedAiMode = watch('aiMode')
  const title = watch('title')
  const description = watch('description')

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasDraft(false)
      setDraftSavedAt(null)
    } catch (error) {
      console.error('Error clearing draft:', error)
    }
  }, [])

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      const draftData: DraftData = {
        title: title || '',
        description: description || '',
        aiMode: selectedAiMode,
        anonymous,
        useCustomStances,
        stanceLabels,
        additionalStances,
        duration,
        showTopicGenerator,
        learningMaterial,
        generatedTopics,
        selectedTopicIndex,
        savedAt: Date.now(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
      setHasDraft(true)
      setDraftSavedAt(new Date())
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }, [title, description, selectedAiMode, anonymous, useCustomStances, stanceLabels, additionalStances, duration, showTopicGenerator, learningMaterial, generatedTopics, selectedTopicIndex])

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft)

        // Restore form fields
        if (draft.title) setValue('title', draft.title)
        if (draft.description) setValue('description', draft.description)
        if (draft.aiMode) setValue('aiMode', draft.aiMode as 'socratic' | 'balanced' | 'minimal' | 'debate')

        // Restore state values
        setAnonymous(draft.anonymous ?? true)
        setUseCustomStances(draft.useCustomStances ?? false)
        setStanceLabels(draft.stanceLabels ?? { pro: t('phases.environment.stances.pro'), con: t('phases.environment.stances.con') })
        setAdditionalStances(draft.additionalStances ?? [])
        setDuration(draft.duration ?? 15)
        setShowTopicGenerator(draft.showTopicGenerator ?? false)
        setLearningMaterial(draft.learningMaterial ?? '')
        setGeneratedTopics(draft.generatedTopics ?? [])
        setSelectedTopicIndex(draft.selectedTopicIndex ?? null)

        setHasDraft(true)
        setDraftSavedAt(new Date(draft.savedAt))

        toast.success(t('draft.loaded'))
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    } finally {
      setIsLoadingDraft(false)
    }
  }, [setValue, t])

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    if (isLoadingDraft) return // Don't save while loading

    // Only save if there's meaningful content
    const hasContent = title || description || learningMaterial || additionalStances.length > 0 || useCustomStances
    if (!hasContent) return

    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current)
    }

    draftTimeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 1000) // 1 second debounce

    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
    }
  }, [title, description, selectedAiMode, anonymous, useCustomStances, stanceLabels, additionalStances, duration, showTopicGenerator, learningMaterial, generatedTopics, selectedTopicIndex, saveDraft, isLoadingDraft])

  useEffect(() => {
    if (!title || title.length < 5) {
      setPreviews({})
      return
    }

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }

    previewTimeoutRef.current = setTimeout(async () => {
      setIsFetchingPreviews(true)
      try {
        const response = await fetch('/api/instructor/discussion-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, locale })
        })
        const data = await response.json()
        if (data.previews) {
          setPreviews(data.previews)
        }
      } catch (error) {
        console.error('Error fetching previews:', error)
      } finally {
        setIsFetchingPreviews(false)
      }
    }, 1500) // 1.5s debounce to avoid over-calling

    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current)
    }
  }, [title, description, locale])

  const handleGenerateTopics = async () => {
    if (!learningMaterial.trim()) {
      toast.error(t('toasts.enterMaterial'))
      return
    }

    setIsGeneratingTopics(true)
    setGeneratedTopics([])
    setSelectedTopicIndex(null)

    try {
      const response = await fetch('/api/discussions/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: learningMaterial, locale })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('toasts.errorGenerating'))
      }

      if (data.topics && data.topics.length > 0) {
        setGeneratedTopics(data.topics)
        toast.success(t('toasts.generated', { count: data.topics.length }))
      } else {
        toast.error(t('toasts.noTopics'))
      }
    } catch (error) {
      console.error('Error generating topics:', error)
      toast.error(error instanceof Error ? error.message : t('toasts.errorGenerating'))
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  const handleSelectTopic = (index: number) => {
    const topic = generatedTopics[index]
    setSelectedTopicIndex(index)

    // Auto-fill the form
    setValue('title', topic.title)
    setValue('description', topic.description)

    // If topic has custom stances, enable and set them
    if (topic.stances) {
      setUseCustomStances(true)
      setStanceLabels({
        pro: topic.stances.pro,
        con: topic.stances.con
      })
    }

    toast.success(t('phases.topic.aiGenerator.selectHint'))
  }

  // Shared discussion creation logic
  const createDiscussion = async (data: DiscussionFormInput) => {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return null
    }

    const joinCode = generateJoinCode()
    const maxTurns = duration === null ? null : Math.max(5, duration)

    const labels: Record<string, string> = {
      pro: stanceLabels.pro,
      con: stanceLabels.con,
      neutral: t('phases.environment.stances.neutral', { default: 'Neutral' })
    }

    const stanceOptions = ['pro', 'con']
    if (includeNeutral) {
      stanceOptions.push('neutral')
    }

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
      toast.error(t('toasts.createError'))
      return null
    }

    // Clear draft on successful creation
    clearDraft()
    return discussion
  }

  const onSubmit = async (data: DiscussionFormInput) => {
    setIsLoading(true)
    try {
      const discussion = await createDiscussion(data)
      if (!discussion) return

      toast.success(t('toasts.success'))
      router.push(`/instructor/discussions/${discussion.id}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('toasts.createError'))
    } finally {
      setIsLoading(false)
    }
  }

  const onPreview = async (data: DiscussionFormInput) => {
    setIsPreviewLoading(true)
    try {
      const discussion = await createDiscussion(data)
      if (!discussion) return

      // Create preview participant and redirect to preview page
      const previewResponse = await fetch(`/api/discussions/${discussion.id}/preview`, {
        method: 'POST',
      })

      if (!previewResponse.ok) {
        toast.error(t('toasts.createError'))
        return
      }

      toast.success(t('toasts.success'))
      router.push(`/instructor/discussions/${discussion.id}/preview`)
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('toasts.createError'))
    } finally {
      setIsPreviewLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-200/30 rounded-full filter blur-[150px] pointer-events-none mix-blend-multiply" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200 h-20 flex items-center">
        <div className="max-w-[1400px] mx-auto w-full px-8 flex items-center justify-between">
          <Link href="/instructor" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
              <MessageCircle className="relative w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>
            <span className="text-2xl font-bold tracking-tighter bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
              Agora
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Draft Status Indicator */}
            <AnimatePresence>
              {hasDraft && draftSavedAt && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <Save className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      {t('draft.saved', { time: format.dateTime(draftSavedAt, { hour: '2-digit', minute: '2-digit' }) })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft()
                      // Reset form to defaults
                      setValue('title', '')
                      setValue('description', '')
                      setValue('aiMode', 'socratic')
                      setAnonymous(true)
                      setUseCustomStances(false)
                      setStanceLabels({ pro: t('phases.environment.stances.pro'), con: t('phases.environment.stances.con') })
                      setAdditionalStances([])
                      setDuration(15)
                      setShowTopicGenerator(false)
                      setLearningMaterial('')
                      setGeneratedTopics([])
                      setSelectedTopicIndex(null)
                      toast.success(t('draft.cleared'))
                    }}
                    className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all active:scale-95 text-zinc-500"
                    title={t('draft.cleared')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Link
              href="/instructor"
              className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-95 text-zinc-500 hover:text-zinc-900"
            >
              <X className="w-5 h-5" />
            </Link>
            <ProfileMenuAuto />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
            <div className="px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              {t('header')}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 text-center text-zinc-900 font-display">
            {t('title')}
          </h1>
          <p className="text-zinc-600 text-xl font-medium mb-16 text-center max-w-2xl mx-auto leading-relaxed">
            {t.rich('description', {
              brClass: () => <br />
            })}
          </p>

          {/* Limit Warning Banner */}
          <AnimatePresence>
            {!isLoadingSubscription && !createCheck.allowed && (
              <UpgradePrompt
                type={createCheck.reason === 'active_limit' ? 'activeDiscussions' : 'discussion'}
                current={createCheck.current}
                limit={createCheck.limit ?? undefined}
                variant="banner"
                className="mb-8"
              />
            )}
            {!isLoadingSubscription && createCheck.allowed && subscription && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-4 mb-8"
              >
                <LimitWarning
                  type="discussion"
                  current={subscription.usage.discussionsCreatedThisMonth}
                  limit={subscription.limits.maxDiscussionsPerMonth}
                />
                <LimitWarning
                  type="activeDiscussions"
                  current={subscription.usage.activeDiscussions}
                  limit={subscription.limits.maxActiveDiscussions}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            {/* Phase 1: Topic & Description */}
            <div className="glass-panel p-10 border-zinc-200 shadow-sm relative overflow-hidden group bg-white/90 backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none group-hover:bg-primary/15 transition-all duration-700 mix-blend-multiply" />

              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{t('phases.topic.title')}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('phases.topic.subtitle')}</p>
                </div>
              </div>

              <div className="space-y-10">
                {/* AI Topic Generator Toggle */}
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowTopicGenerator(!showTopicGenerator)}
                    className={`w-full p-6 rounded-[2rem] border transition-all flex items-center justify-between group/toggle ${showTopicGenerator
                      ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200'
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showTopicGenerator ? 'bg-violet-500 text-white' : 'bg-zinc-200 text-zinc-500 group-hover/toggle:bg-zinc-300'
                        }`}>
                        <Wand2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${showTopicGenerator ? 'text-violet-900' : 'text-zinc-700'}`}>
                          {t('phases.topic.aiGenerator.button')}
                        </p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {t('phases.topic.aiGenerator.subtitle')}
                        </p>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showTopicGenerator ? 'bg-violet-200 text-violet-700' : 'bg-zinc-200 text-zinc-500'
                      }`}>
                      {showTopicGenerator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showTopicGenerator && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 border border-violet-200 space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-violet-600" />
                              <label className="text-sm font-bold text-violet-700">{t('phases.topic.aiGenerator.label')}</label>
                            </div>
                            <textarea
                              value={learningMaterial}
                              onChange={(e) => setLearningMaterial(e.target.value)}
                              placeholder={t('phases.topic.aiGenerator.placeholder')}
                              className="w-full min-h-[160px] p-5 rounded-xl bg-white/80 border border-violet-200 text-zinc-900 placeholder:text-zinc-400 font-medium text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all resize-none"
                            />
                            <p className="text-[10px] text-violet-600 font-medium px-1">
                              {t('phases.topic.aiGenerator.hint')}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateTopics}
                            disabled={isGeneratingTopics || !learningMaterial.trim()}
                            className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold flex items-center justify-center gap-3 hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                          >
                            {isGeneratingTopics ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('phases.topic.aiGenerator.generating')}
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                {t('phases.topic.aiGenerator.generateButton')}
                              </>
                            )}
                          </button>

                          {/* Generated Topics List */}
                          <AnimatePresence>
                            {generatedTopics.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4 pt-4 border-t border-violet-200"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-violet-700">
                                    {t('phases.topic.aiGenerator.results', { count: generatedTopics.length })}
                                  </p>
                                  <p className="text-[10px] text-violet-500 font-medium">
                                    {t('phases.topic.aiGenerator.selectHint')}
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  {generatedTopics.map((topic, index) => {
                                    const difficulty = getDifficultyTag(index)
                                    const isSelected = selectedTopicIndex === index

                                    return (
                                      <motion.button
                                        key={index}
                                        type="button"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={() => handleSelectTopic(index)}
                                        className={`w-full p-4 sm:p-5 rounded-xl text-left transition-all group/topic ${isSelected
                                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                                          : 'bg-white border border-violet-200 hover:border-violet-400 hover:shadow-md'
                                          }`}
                                      >
                                        {/* Header: 번호 + 난이도 뱃지 */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-violet-100 text-violet-600 group-hover/topic:bg-violet-200'
                                            }`}>
                                            {isSelected ? (
                                              <Check className="w-4 h-4" />
                                            ) : (
                                              <span className="text-sm font-bold">{index + 1}</span>
                                            )}
                                          </div>
                                          <span
                                            className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide ${isSelected
                                              ? difficulty.selectedClassName
                                              : difficulty.className
                                              }`}
                                          >
                                            {difficulty.label}
                                          </span>
                                        </div>
                                        {/* 제목 */}
                                        <p className={`font-bold text-sm leading-snug mb-2 ${isSelected ? 'text-white' : 'text-zinc-800'
                                          }`}>
                                          {topic.title}
                                        </p>
                                        {/* 설명 */}
                                        <p className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-white/80' : 'text-zinc-500'
                                          }`}>
                                          {topic.description}
                                        </p>
                                        {/* 입장 뱃지 */}
                                        {topic.stances && (
                                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isSelected
                                              ? 'bg-emerald-400/30 text-emerald-100'
                                              : 'bg-emerald-100 text-emerald-700'
                                              }`}>
                                              {topic.stances.pro}
                                            </span>
                                            <span className={`text-[10px] ${isSelected ? 'text-white/50' : 'text-zinc-400'
                                              }`}>vs</span>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isSelected
                                              ? 'bg-rose-400/30 text-rose-100'
                                              : 'bg-rose-100 text-rose-700'
                                              }`}>
                                              {topic.stances.con}
                                            </span>
                                          </div>
                                        )}
                                      </motion.button>
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider */}
                {showTopicGenerator && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('phases.topic.aiGenerator.manualInput')}</span>
                    <div className="flex-1 h-px bg-zinc-200" />
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-sm font-black text-zinc-500 uppercase tracking-widest block px-1">{t('phases.topic.topicLabel')} <span className="text-primary">*</span></label>
                  <div className="relative group/input">
                    <input
                      type="text"
                      placeholder={t('phases.topic.topicPlaceholder')}
                      className="ios-input w-full h-16 px-6 text-xl font-bold placeholder:text-zinc-400 text-zinc-900"
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
                  <label className="text-sm font-black text-zinc-500 uppercase tracking-widest block px-1">{t('phases.topic.descLabel')}</label>
                  <textarea
                    placeholder={t('phases.topic.descPlaceholder')}
                    className="ios-input w-full min-h-[180px] p-6 text-lg font-medium leading-relaxed placeholder:text-zinc-400 text-zinc-900"
                    {...register('description')}
                  />
                </div>
              </div>
            </div>

            {/* Phase 2: AI Tutor Configuration */}
            <div className="glass-panel p-10 border-zinc-200 shadow-sm relative overflow-hidden group bg-white/90 backdrop-blur-xl">
              <div className="absolute top-0 left-0 w-80 h-80 bg-purple-200/50 rounded-full blur-[100px] -ml-40 -mt-40 pointer-events-none group-hover:bg-purple-200/70 transition-all duration-700 mix-blend-multiply" />

              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{t('phases.aiTutor.title')}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('phases.aiTutor.subtitle')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {aiModeOptions.map((mode) => {
                  const Icon = mode.icon
                  return (
                    <label
                      key={mode.value}
                      className={`flex flex-col p-6 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group/card ${selectedAiMode === mode.value
                        ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
                        }`}
                    >
                      <input
                        type="radio"
                        value={mode.value}
                        className="peer sr-only"
                        {...register('aiMode')}
                      />

                      <div className="relative z-10">
                        <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center transition-all duration-500 ${selectedAiMode === mode.value ? 'bg-primary text-white' : 'bg-zinc-200 text-zinc-500 group-hover/card:bg-zinc-300'
                          }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className={`font-black text-sm tracking-tight mb-1 ${selectedAiMode === mode.value ? 'text-zinc-900' : 'text-zinc-600'}`}>
                          {mode.label}
                        </div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
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

              {/* Real-time Preview Section */}
              <div className="mt-12 pt-12 border-t border-zinc-200">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">{t('phases.aiTutor.preview.title')}</h3>
                  </div>
                  {isFetchingPreviews && (
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('phases.aiTutor.preview.generating')}
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {title && title.length >= 2 ? (
                    <motion.div
                      key="preview-content"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="grid grid-cols-1 gap-6"
                    >
                      <div className="relative p-8 rounded-[2rem] bg-zinc-900 text-zinc-100 shadow-2xl overflow-hidden group/preview">
                        <div className="absolute top-0 right-0 p-4">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedAiMode === 'socratic' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            selectedAiMode === 'balanced' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              selectedAiMode === 'debate' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                'bg-zinc-700 text-zinc-400 border border-zinc-600'
                            }`}>
                            {t('phases.aiTutor.preview.active', { mode: aiModeOptions.find(o => o.value === selectedAiMode)?.label || '' })}
                          </div>
                        </div>

                        <div className="flex items-start gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${selectedAiMode === 'socratic' ? 'bg-emerald-500 text-white' :
                            selectedAiMode === 'balanced' ? 'bg-blue-500 text-white' :
                              selectedAiMode === 'debate' ? 'bg-rose-500 text-white' :
                                'bg-zinc-700 text-zinc-300'
                            }`}>
                            {(() => {
                              const Icon = aiModeOptions.find(o => o.value === selectedAiMode)?.icon || Brain
                              return <Icon className="w-6 h-6" />
                            })()}
                          </div>
                          <div className="space-y-4 flex-1">
                            <div className="space-y-2">
                              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{t('phases.aiTutor.preview.aiTutor')}</p>
                              {previews[selectedAiMode] ? (
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-lg font-medium leading-relaxed italic"
                                >
                                  &quot;{previews[selectedAiMode]}&quot;
                                </motion.p>
                              ) : (
                                <div className="space-y-3 pt-2">
                                  <div className="h-4 bg-zinc-800 rounded-full w-3/4 animate-pulse" />
                                  <div className="h-4 bg-zinc-800 rounded-full w-1/2 animate-pulse" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Background flare */}
                        <div className={`absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none opacity-20 ${selectedAiMode === 'socratic' ? 'bg-emerald-500' :
                          selectedAiMode === 'balanced' ? 'bg-blue-500' :
                            selectedAiMode === 'debate' ? 'bg-rose-500' :
                              'bg-zinc-500'
                          }`} />
                      </div>
                      <p className="mt-2 text-center text-xs text-zinc-400 font-medium">
                        {t('phases.aiTutor.preview.hint')}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-12 rounded-[2rem] border border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 gap-4"
                    >
                      <Sparkles className="w-8 h-8 opacity-20" />
                      <p className="text-sm font-medium">{t('phases.aiTutor.preview.placeholder')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Phase 3: Advanced Options */}
            <div className="glass-panel p-10 border-zinc-200 shadow-sm relative overflow-hidden group bg-white/90 backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-200/50 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none group-hover:bg-indigo-200/70 transition-all duration-700 mix-blend-multiply" />

              <div className="flex items-center gap-3 mb-12">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{t('phases.environment.title')}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('phases.environment.subtitle')}</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Anonymous */}
                <div className="flex items-center justify-between p-8 rounded-[3rem] bg-zinc-50 border border-zinc-200 transition-all hover:bg-zinc-100 hover:border-zinc-300">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 shadow-inner">
                      <EyeOff className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-zinc-900">{t('phases.environment.anonymous.title')}</p>
                      <p className="text-sm text-zinc-500 font-medium">{t('phases.environment.anonymous.desc')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={anonymous}
                    onCheckedChange={setAnonymous}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Include Neutral Stance */}
                <div className="flex items-center justify-between p-8 rounded-[3rem] bg-zinc-50 border border-zinc-200 transition-all hover:bg-zinc-100 hover:border-zinc-300">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 shadow-inner">
                      <MinusCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-zinc-900">{t('phases.environment.includeNeutral.title')}</p>
                      <p className="text-sm text-zinc-500 font-medium">{t('phases.environment.includeNeutral.desc')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={includeNeutral}
                    onCheckedChange={setIncludeNeutral}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Stances */}
                <div className={`p-8 rounded-[3rem] bg-zinc-50 border border-zinc-200 transition-all ${useCustomStances ? 'border-primary/30 bg-primary/5' : 'hover:bg-zinc-100'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-zinc-900">{t('phases.environment.customStance.title')}</p>
                        <p className="text-sm text-zinc-500 font-medium">{t('phases.environment.customStance.desc')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={useCustomStances}
                      onCheckedChange={setUseCustomStances}
                      className="data-[state=checked]:bg-primary"
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
                        <div className="space-y-8 pt-8 border-t border-zinc-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('phases.environment.stances.proLabel')}</label>
                              </div>
                              <input
                                type="text"
                                value={stanceLabels.pro}
                                onChange={(e) => setStanceLabels({ ...stanceLabels, pro: e.target.value })}
                                className="ios-input w-full h-14 px-5 text-lg font-bold text-zinc-900"
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('phases.environment.stances.conLabel')}</label>
                              </div>
                              <input
                                type="text"
                                value={stanceLabels.con}
                                onChange={(e) => setStanceLabels({ ...stanceLabels, con: e.target.value })}
                                className="ios-input w-full h-14 px-5 text-lg font-bold text-zinc-900"
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
                                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block px-1">{t('phases.environment.stances.additionalLabel', { n: index + 1 })}</label>
                                  <input
                                    type="text"
                                    value={stance}
                                    onChange={(e) => {
                                      const newStances = [...additionalStances]
                                      newStances[index] = e.target.value
                                      setAdditionalStances(newStances)
                                    }}
                                    className="ios-input w-full h-14 px-5 font-bold text-zinc-900"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdditionalStances(additionalStances.filter((_, i) => i !== index))
                                  }}
                                  className="w-14 h-14 rounded-[1.25rem] bg-rose-100 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                                >
                                  <X className="w-6 h-6" />
                                </button>
                              </motion.div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setAdditionalStances([...additionalStances, t('phases.environment.stances.add')])}
                              className="w-full py-5 rounded-[1.25rem] bg-zinc-100 border border-dashed border-zinc-300 text-zinc-500 text-sm font-black flex items-center justify-center gap-3 hover:bg-zinc-200 hover:border-zinc-400 hover:text-zinc-900 transition-all group"
                            >
                              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                              {t('phases.environment.stances.add')}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Duration */}
                <div className="p-10 rounded-[3.5rem] bg-zinc-50 border border-zinc-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none mix-blend-multiply" />

                  <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-zinc-900">{t('phases.environment.duration.title')}</p>
                        <p className="text-sm text-zinc-500 font-medium">{t('phases.environment.duration.desc')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-zinc-900 leading-none">{duration === null ? '∞' : duration}</div>
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{duration === null ? t('phases.environment.duration.unlimited') : t('phases.environment.duration.minutes')}</div>
                    </div>
                  </div>

                  <div className="px-2 mb-12 relative z-10">
                    <input
                      type="range"
                      min="3"
                      max="63"
                      step="3"
                      value={duration === null ? 63 : duration}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        setDuration(value > 60 ? null : value)
                      }}
                      className="w-full h-2 bg-zinc-200 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-black text-zinc-500 tracking-widest uppercase px-1 mt-4">
                      <span>{t('phases.environment.duration.labels.quick')}</span>
                      <span>{t('phases.environment.duration.labels.target')}</span>
                      <span>{t('phases.environment.duration.labels.unlimited')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="p-8 rounded-[2.5rem] bg-white/80 border border-zinc-200 backdrop-blur-md relative group/stat overflow-hidden shadow-sm">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase block mb-2">{t('phases.environment.duration.stats.interaction')}</span>
                      <div className="text-4xl font-black text-zinc-900 flex items-baseline gap-2">
                        {duration === null ? '∞' : Math.max(5, duration)}
                        <span className="text-sm font-black text-zinc-500 uppercase">{duration === null ? '' : t('phases.environment.duration.stats.turns')}</span>
                      </div>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-white/80 border border-zinc-200 backdrop-blur-md relative group/stat overflow-hidden shadow-sm">
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase block mb-2">{t('phases.environment.duration.stats.precision')}</span>
                      <div className="text-4xl font-black text-zinc-900 flex items-baseline gap-2">
                        {duration === null ? t('phases.environment.duration.stats.max') : duration >= 30 ? t('phases.environment.duration.stats.high') : t('phases.environment.duration.stats.mid')}
                        <span className="text-sm font-black text-zinc-500 uppercase">{t('phases.environment.duration.stats.level')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Guidelines */}
            <div className="p-8 rounded-[3rem] bg-primary/5 border border-primary/20 flex items-start gap-8 group">
              <div className="w-14 h-14 rounded-[1.5rem] bg-primary/20 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-black text-zinc-900">{t('guidelines.title')}</p>
                <p className="text-sm text-zinc-600 leading-relaxed mt-2 font-medium">
                  {t.rich('guidelines.desc', {
                    strongClass: (chunks) => <strong className="text-zinc-900">{chunks}</strong>
                  })}
                </p>
              </div>
            </div>

            {/* Submit Block */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 pt-12 pb-20">
              <button
                type="submit"
                disabled={isLoading || isPreviewLoading || !createCheck.allowed}
                className="h-20 w-full md:w-[350px] rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xl flex items-center justify-center gap-4 transition-all hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] hover:-translate-y-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {t('buttons.submitting')}
                  </>
                ) : !createCheck.allowed ? (
                  <>
                    <Lock className="w-6 h-6" />
                    {t('buttons.limitReached')}
                  </>
                ) : (
                  <>
                    {t('buttons.submit')}
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSubmit(onPreview)}
                disabled={isLoading || isPreviewLoading || !createCheck.allowed}
                className="h-16 w-full md:w-[200px] rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-lg flex items-center justify-center gap-3 transition-all hover:bg-zinc-200 hover:border-zinc-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('buttons.previewSubmitting')}
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {t('buttons.preview')}
                  </>
                )}
              </button>
              <Link
                href="/instructor"
                className="h-14 px-8 rounded-full border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 font-bold transition-all flex items-center justify-center"
              >
                {t('buttons.cancel')}
              </Link>
            </div>
          </form>
        </motion.div>
      </main>

      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none" />
    </div>
  )
}
