'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { useTranslations, useFormatter } from 'next-intl'
import {
  MessageCircle,
  Users,
  Clock,
  LogOut,
  Settings,
  Hash,
  ArrowRight,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { ProfileMenu } from '@/components/profile/ProfileMenu'

interface Discussion {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'closed'
  created_at: string
  my_stance: string | null
  is_submitted: boolean
  settings: {
    stanceLabels?: Record<string, string>
  }
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  student_number: string | null
  school: string | null
}

export default function StudentDashboard() {
  const t = useTranslations('Student.Dashboard')
  const format = useFormatter()
  const router = useRouter()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const loadUserAndDiscussions = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)

        // Check if student
        if (profile.role !== 'student') {
          router.push('/instructor')
          return
        }
      }

      // Get my discussions (sessions I'm participating in)
      const { data: participations, error } = await supabase
        .from('discussion_participants')
        .select(`
          *,
          session:discussion_sessions(
            id,
            title,
            description,
            status,
            description,
            status,
            settings,
            created_at
          )
        `)
        .eq('student_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching discussions:', error)
      } else {
        const formattedDiscussions = participations?.map(p => ({
          id: p.session.id,
          title: p.session.title,
          description: p.session.description,
          status: p.session.status,
          created_at: p.session.created_at,
          my_stance: p.stance,
          created_at: p.session.created_at,
          my_stance: p.stance,
          is_submitted: p.is_submitted,
          settings: p.session.settings
        })) || []
        setDiscussions(formattedDiscussions)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('toasts.error'))
    } finally {
      setIsLoading(false)
    }
  }, [router, t])

  useEffect(() => {
    loadUserAndDiscussions()
  }, [loadUserAndDiscussions])

  const handleJoinDiscussion = async () => {
    if (!joinCode.trim()) {
      toast.error(t('toasts.enterCode'))
      return
    }

    setIsJoining(true)
    try {
      const supabase = getSupabaseClient()

      // Find discussion by join code
      const { data: session, error: sessionError } = await supabase
        .from('discussion_sessions')
        .select('id, status')
        .eq('join_code', joinCode.toUpperCase())
        .single()

      if (sessionError || !session) {
        toast.error(t('toasts.invalidCode'))
        return
      }

      if (session.status !== 'active') {
        toast.error(t('toasts.notActive'))
        return
      }

      // Check if already participating
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: existing } = await supabase
        .from('discussion_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('student_id', authUser.id)
        .single()

      if (existing) {
        // Already participating, redirect
        router.push(`/student/discussions/${session.id}`)
        return
      }

      // Join the discussion
      const { error: joinError } = await supabase
        .from('discussion_participants')
        .insert({
          session_id: session.id,
          student_id: authUser.id,
          display_name: `Student ${Math.floor(Math.random() * 100) + 1}`
        })

      if (joinError) {
        toast.error(t('toasts.joinFail'))
        return
      }

      toast.success(t('toasts.joinSuccess'))
      router.push(`/student/discussions/${session.id}`)
    } catch (error) {
      console.error('Error joining discussion:', error)
      toast.error(t('toasts.error'))
    } finally {
      setIsJoining(false)
    }
  }

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
      active: 'bg-primary/10 text-primary border-primary/20',
      closed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    }
    const labelKey = status as 'draft' | 'active' | 'closed'

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-tight ${styles[status as keyof typeof styles]}`}>
        {t(`list.status.${labelKey}`)}
      </span>
    )
  }

  const getStanceBadge = (stance: string | null, isSubmitted: boolean, settings?: { stanceLabels?: Record<string, string> }) => {
    if (!stance) {
      return <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('list.stance.unselected')}</span>
    }

    const stanceStyles: Record<string, string> = {
      pro: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      con: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      neutral: 'bg-zinc-100 text-zinc-500 border-zinc-200'
    }

    const stanceKey = stance as 'pro' | 'con' | 'neutral'
    // Use custom label if available, otherwise fallback to translation
    const label = settings?.stanceLabels?.[stance] || t(`list.stance.${stanceKey}`)

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${stanceStyles[stance] || 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
          {label}
        </span>
        {isSubmitted && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            {t('list.stance.submitted')}
          </span>
        )}
      </div>
    )
  }

  const activeCount = discussions.filter(d => d.status === 'active').length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/15 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply hidden md:block" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply hidden md:block" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                <MessageCircle className="relative w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <span className="text-2xl font-bold tracking-tighter bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
                Agora
              </span>
            </Link>

            <ProfileMenu
              name={user?.name}
              email={user?.email}
              role={user?.role}
              meta={user?.student_number ? t('header.studentId', { id: user.student_number }) : undefined}
              items={[
                { label: t('header.settings'), icon: Settings, href: '/settings' },
                { label: t('header.logout'), icon: LogOut, onClick: handleLogout, variant: 'danger' },
              ]}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 relative z-10">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs sm:text-[10px] font-black text-primary tracking-[0.2em] uppercase">{t('tag')}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-zinc-900 mb-4 sm:mb-6 font-display">
            {t.rich('greeting', {
              name: user?.name || '',
              span: (chunks) => <span className="text-primary">{chunks}</span>
            })}
          </h1>
          <p className="text-zinc-600 text-base sm:text-xl max-w-2xl leading-relaxed">
            {t.rich('description', {
              br: () => <br className="hidden md:block" />
            })}
          </p>
        </motion.div>

        {/* Join Discussion Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <div className="glass-panel p-1 border-zinc-200 bg-white/90 shadow-sm">
            <div className="p-5 sm:p-8 md:p-10 flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-900 mb-3">{t('join.title')}</h2>
                <p className="text-zinc-600 leading-relaxed font-medium">
                  {t.rich('join.description', {
                    br: () => <br className="hidden md:block" />
                  })}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative group">
                  <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder={t('join.placeholder')}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinDiscussion()}
                    className="ios-input pl-12 sm:pl-14 h-14 sm:h-16 w-full sm:w-64 text-xl sm:text-2xl font-bold tracking-[0.2em] placeholder:text-zinc-400 placeholder:tracking-normal placeholder:font-normal"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleJoinDiscussion}
                  disabled={isJoining}
                  className="group relative h-14 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold rounded-full px-6 sm:px-10 transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                    {isJoining ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t('join.button')}
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16"
        >
          <div className="glass-panel p-8 bg-white/90 border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {discussions.length}
              </span>
            </div>
            <p className="text-xs sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.total')}</p>
          </div>

          <div className="glass-panel p-8 bg-white/90 border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {activeCount}
              </span>
            </div>
            <p className="text-xs sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.active')}</p>
          </div>

          <div className="glass-panel p-8 bg-white/90 border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-110">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {discussions.filter(d => d.is_submitted).length}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.submitted')}</p>
          </div>
        </motion.div>

        {/* My Discussions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-end justify-between mb-8 px-2">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 mb-1">{t('list.title')}</h2>
              <p className="text-zinc-500 font-medium">{t('list.subtitle')}</p>
            </div>
            <div className="bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200 text-sm font-bold text-zinc-600">
              {discussions.length} {t('list.sessions')}
            </div>
          </div>

          {discussions.length === 0 ? (
            <div className="glass-panel bg-white/90 border-zinc-200 p-20 text-center shadow-sm">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">{t('list.empty.title')}</h3>
              <p className="text-zinc-500 max-w-sm mx-auto">
                {t.rich('list.empty.description', {
                  br: () => <br />
                })}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {discussions.map((discussion, index) => (
                <motion.div
                  key={discussion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + (index * 0.05) }}
                  className="group"
                >
                  <div
                    className="glass-panel bg-white/90 border-zinc-200 p-5 sm:p-6 hover:bg-white hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden active:scale-[0.99] shadow-sm"
                    onClick={() => router.push(`/student/discussions/${discussion.id}`)}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex flex-row items-center justify-between gap-4 sm:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-xl font-bold text-zinc-900 line-clamp-2 group-hover:text-primary transition-colors">
                            {discussion.title}
                          </h3>
                          <div className="shrink-0 pt-1">
                            {getStatusBadge(discussion.status)}
                          </div>
                        </div>

                        {discussion.description && (
                          <p className="text-zinc-500 text-sm mb-6 line-clamp-2 max-w-3xl">
                            {discussion.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-6">
                          {getStanceBadge(discussion.my_stance, discussion.is_submitted, discussion.settings)}
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format.dateTime(new Date(discussion.created_at), { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Mobile: Simple Chevron */}
                        <div className="sm:hidden text-zinc-300 group-hover:text-primary transition-colors">
                          <ChevronRight className="w-6 h-6" />
                        </div>

                        {/* Desktop: Circular Action Button */}
                        <div className="hidden sm:flex w-12 h-12 rounded-full border border-zinc-200 items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white text-zinc-400 transition-all">
                          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
