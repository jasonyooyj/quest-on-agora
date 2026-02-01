'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useFormatter } from 'next-intl'
import {
  Plus,
  Users,
  Clock,
  MoreVertical,
  Copy,
  Trash2,
  Settings,
  LogOut,
  ArrowRight,
  Activity,
  Link2,
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { DashboardLayout, LoadingScreen } from '@/components/dashboard'
import { useSubscription, canCreateDiscussion } from '@/hooks/useSubscription'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { SubscriptionCard, LimitWarning, UpgradePrompt } from '@/components/subscription'

interface Discussion {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'closed'
  join_code: string
  created_at: string
  updated_at: string
  participant_count?: number
}

export default function InstructorDashboard() {
  const t = useTranslations('Instructor.Dashboard')
  const format = useFormatter()
  const router = useRouter()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  const { user, authUser, isLoading: isAuthLoading, supabase, logout } = useDashboardAuth({
    requiredRole: 'instructor',
    redirectOnRoleMismatch: '/student',
  })

  const { subscription, isLoading: isLoadingSubscription } = useSubscription()
  const [isLoadingData, setIsLoadingData] = useState(true)

  const loadDiscussions = useCallback(async () => {
    if (!authUser) return

    try {
      const { data: discussionsData, error } = await supabase
        .from('discussion_sessions')
        .select(`
          *,
          discussion_participants(count)
        `)
        .eq('instructor_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching discussions:', JSON.stringify(error, null, 2))
        toast.error(t('toasts.fetchError'))
      } else {
        const formattedDiscussions = discussionsData?.map(d => ({
          ...d,
          participant_count: d.discussion_participants?.[0]?.count || 0
        })) || []
        setDiscussions(formattedDiscussions)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('toasts.dataError'))
    } finally {
      setIsLoadingData(false)
    }
  }, [authUser, supabase, t])

  useEffect(() => {
    if (authUser && !isAuthLoading) {
      loadDiscussions()
    }
  }, [authUser, isAuthLoading, loadDiscussions])

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(t('toasts.codeCopied'))
    } catch {
      toast.error(t('toasts.copyFailed'))
    }
  }

  const handleCopyUrl = async (code: string) => {
    try {
      const url = `${window.location.origin}/join/${code}`
      await navigator.clipboard.writeText(url)
      toast.success(t('toasts.urlCopied'))
    } catch {
      toast.error(t('toasts.copyFailed'))
    }
  }

  const handleDeleteDiscussion = async (id: string, title: string) => {
    if (!confirm(t('list.confirmDelete', { title }))) return

    try {
      const { error } = await supabase
        .from('discussion_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success(t('toasts.deleteSuccess'))
      setDiscussions(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error(t('toasts.deleteFailed'))
    }
  }

  const statusLabels = {
    draft: t('list.status.draft'),
    active: t('list.status.active'),
    closed: t('list.status.closed'),
  }

  const activeCount = discussions.filter(d => d.status === 'active').length
  const totalParticipants = discussions.reduce((acc, d) => acc + (d.participant_count || 0), 0)

  const createCheck = canCreateDiscussion(subscription)

  const handleNewDiscussion = () => {
    if (!createCheck.allowed) {
      setShowUpgradePrompt(true)
      return
    }
    router.push('/instructor/discussions/new')
  }

  if (isAuthLoading || isLoadingData) {
    return <LoadingScreen message={t('loading')} />
  }

  const headerActions = (
    <button
      onClick={handleNewDiscussion}
      className="group relative h-12 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-full px-6 transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      <span>{t('header.newDiscussion')}</span>
    </button>
  )

  return (
    <DashboardLayout
      user={user ?? undefined}
      headerActions={headerActions}
      onLogout={logout}
      translations={{
        settings: t('header.settings'),
        logout: t('header.logout'),
      }}
      profileMenuItems={[
        { label: t('header.settings'), icon: Settings, href: '/settings' },
        { label: t('header.logout'), icon: LogOut, onClick: logout, variant: 'danger' },
      ]}
    >
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8"
      >
        <div className="flex-1 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase">{t('tag')}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-900 mb-6 font-display">
            {t.rich('greeting', {
              name: user?.name || '',
              spanClass: (chunks) => <span className="text-primary">{chunks}</span>
            })}
          </h1>
          <p className="text-zinc-600 text-xl max-w-2xl leading-relaxed">
            {t.rich('description', {
              brClass: () => <br className="hidden md:block" />
            })}
          </p>
        </div>

        {subscription && (
          <div className="flex-shrink-0 w-full xl:w-auto min-w-[320px]">
            <LimitWarning
              type="activeDiscussions"
              current={subscription.usage.activeDiscussions}
              limit={subscription.limits.maxActiveDiscussions}
              className="w-full text-base p-6 shadow-xl shadow-zinc-200/50 border-zinc-100 bg-white/80 backdrop-blur-xl"
            />
          </div>
        )}
      </motion.div>

      {/* Upgrade Prompt Modal */}
      <AnimatePresence>
        {showUpgradePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowUpgradePrompt(false)}
          >
            <motion.div onClick={(e) => e.stopPropagation()}>
              <UpgradePrompt
                type={createCheck.reason === 'active_limit' ? 'activeDiscussions' : 'discussion'}
                current={createCheck.current}
                limit={createCheck.limit ?? undefined}
                variant="modal"
                onDismiss={() => setShowUpgradePrompt(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription Card & Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16"
      >
        {/* Subscription Usage Card */}
        <div className="lg:col-span-1">
          {subscription && !isLoadingSubscription ? (
            <SubscriptionCard subscription={subscription} compact />
          ) : (
            <div className="p-4 rounded-2xl border border-zinc-200 bg-white/90 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-200" />
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded bg-zinc-200" />
                  <div className="h-3 w-16 rounded bg-zinc-200" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full rounded bg-zinc-200" />
                <div className="h-2 w-3/4 rounded bg-zinc-200" />
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 bg-white/90 border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {discussions.length}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.totalSessions')}</p>
          </div>

          <div className="glass-panel p-8 bg-white/90 border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm relative">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
                <Activity className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {activeCount}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.activeSessions')}</p>
          </div>

          <div className="glass-panel p-8 bg-white/90 border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-110">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {totalParticipants}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{t('stats.totalParticipants')}</p>
          </div>
        </div>
      </motion.div>

      {/* Discussions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-end justify-between mb-8 px-2">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-1">{t('manage.title')}</h2>
            <p className="text-zinc-500 font-medium">{t('manage.subtitle')}</p>
          </div>
          <div className="bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200 text-sm font-bold text-zinc-600">
            {discussions.length} {t('stats.sessions')}
          </div>
        </div>

        {discussions.length === 0 ? (
          <div className="glass-panel bg-white/90 border-zinc-200 p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-zinc-400" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-3">{t('empty.title')}</h3>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
              {t('empty.description')}
            </p>
            <Link href="/instructor/discussions/new">
              <button className="group relative h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold rounded-full px-8 transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:-translate-y-1 active:scale-95">
                <span className="relative z-10 flex items-center gap-2">
                  {t('empty.button')}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {discussions.map((discussion, index) => (
              <motion.div
                key={discussion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + (index * 0.05) }}
                className="group"
              >
                <div
                  className="glass-panel bg-white/90 border-zinc-200 p-6 hover:bg-white hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden active:scale-[0.99] shadow-sm"
                  onClick={() => router.push(`/instructor/discussions/${discussion.id}`)}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                        <h3
                          className="text-xl font-bold text-zinc-900 truncate group-hover:text-primary transition-colors flex-1 min-w-0"
                          title={discussion.title}
                        >
                          {discussion.title}
                        </h3>
                        <StatusBadge status={discussion.status} labels={statusLabels} />
                      </div>

                      {discussion.description && (
                        <p className="text-zinc-500 text-sm mb-6 line-clamb-1 max-w-3xl">
                          {discussion.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-200 bg-zinc-100 px-3 py-1 rounded-lg transition-colors hover:bg-zinc-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(discussion.join_code);
                          }}>
                          <span>{t('list.joinCode', { code: discussion.join_code })}</span>
                          <Copy className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/20 bg-primary/10 px-3 py-1 rounded-lg transition-colors hover:bg-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(discussion.join_code);
                          }}>
                          <Link2 className="w-3 h-3" />
                          <span>{t('list.copyUrl')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <Users className="w-3.5 h-3.5" />
                          <span>{discussion.participant_count || 0}{t('stats.participating')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format.dateTime(new Date(discussion.created_at), { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 glass-panel bg-white/95 border-zinc-200 p-2 shadow-2xl backdrop-blur-xl">
                          <DropdownMenuItem
                            className="rounded-xl focus:bg-zinc-100 focus:text-zinc-900 cursor-pointer py-2.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyCode(discussion.join_code)
                            }}
                          >
                            <Copy className="w-4 h-4 mr-3 text-zinc-500" />
                            {t('list.menu.copyCode')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer py-2.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyUrl(discussion.join_code)
                            }}
                          >
                            <Link2 className="w-4 h-4 mr-3 text-primary" />
                            {t('list.menu.copyUrl')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-200" />
                          <DropdownMenuItem
                            className="rounded-xl focus:bg-red-500/10 focus:text-red-500 text-red-500 cursor-pointer py-2.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDiscussion(discussion.id, discussion.title)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            {t('list.menu.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white text-zinc-400 transition-all">
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
    </DashboardLayout>
  )
}
