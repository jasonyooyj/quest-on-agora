'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Plus,
  MessageCircle,
  Users,
  Clock,
  MoreVertical,
  Copy,
  Trash2,
  Settings,
  LogOut,
  User,
  ArrowRight,
  Activity
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

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

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
}

export default function InstructorDashboard() {
  const router = useRouter()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserAndDiscussions()
  }, [])

  const loadUserAndDiscussions = async () => {
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

        // Check if instructor
        if (profile.role !== 'instructor') {
          router.push('/student')
          return
        }
      }

      // Get discussions
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
        toast.error('토론 목록을 불러오는데 실패했습니다')
      } else {
        const formattedDiscussions = discussionsData?.map(d => ({
          ...d,
          participant_count: d.discussion_participants?.[0]?.count || 0
        })) || []
        setDiscussions(formattedDiscussions)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('참여 코드가 복사되었습니다')
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  const handleDeleteDiscussion = async (id: string, title: string) => {
    if (!confirm(`"${title}" 토론을 삭제하시겠습니까?`)) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('discussion_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('토론이 삭제되었습니다')
      setDiscussions(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error('삭제에 실패했습니다')
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
      draft: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50',
      active: 'bg-primary/10 text-primary border-primary/20',
      closed: 'bg-zinc-900/50 text-zinc-500 border-zinc-800/50',
    }
    const labels = {
      draft: '초안',
      active: '진행 중',
      closed: '종료',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-tight ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const activeCount = discussions.filter(d => d.status === 'active').length
  const totalParticipants = discussions.reduce((acc, d) => acc + (d.participant_count || 0), 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30 relative overflow-hidden">
      {/* Bioluminescent background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] animate-blob pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                <MessageCircle className="relative w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <span className="text-2xl font-bold tracking-tighter bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                Agora
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link href="/instructor/discussions/new">
                <button className="group relative h-12 bg-white text-black font-bold rounded-full px-6 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>새 토론</span>
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all active:scale-95">
                    <User className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 glass-panel bg-[#121214]/90 border-white/5 p-2 shadow-2xl backdrop-blur-xl">
                  <div className="px-4 py-3 mb-2">
                    <p className="text-sm font-bold text-white mb-0.5">{user?.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="rounded-xl focus:bg-white/5 focus:text-white cursor-pointer py-2.5">
                    <Settings className="w-4 h-4 mr-3 text-zinc-400" />
                    설정
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer py-2.5">
                    <LogOut className="w-4 h-4 mr-3" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 relative z-10">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase">Instructor Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6 font-display">
            안녕하세요, <span className="text-primary">{user?.name}</span>님
          </h1>
          <p className="text-zinc-400 text-xl max-w-2xl leading-relaxed">
            학생들의 비판적 사고를 이끄는 새로운 토론 주제를 <br className="hidden md:block" />
            지금 바로 설계하고 실시간으로 분석해보세요.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          <div className="glass-panel p-8 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-white">
                {discussions.length}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">전체 토론 세션</p>
          </div>

          <div className="glass-panel p-8 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 transition-transform group-hover:scale-110">
                <Activity className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-white">
                {activeCount}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">실시간 진행 중</p>
          </div>

          <div className="glass-panel p-8 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 transition-transform group-hover:scale-110">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-white">
                {totalParticipants}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">총 누적 참여자</p>
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
              <h2 className="text-3xl font-bold text-white mb-1">토론 관리</h2>
              <p className="text-zinc-500 font-medium">관리 중인 모든 토론 세션의 현황입니다</p>
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 text-sm font-bold text-zinc-400">
              {discussions.length} Sessions
            </div>
          </div>

          {discussions.length === 0 ? (
            <div className="glass-panel bg-white/[0.02] border-white/5 p-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">생성된 토론이 없습니다</h3>
              <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
                첫 번째 토론을 만들어 학생들과 의미 있는 대화를 시작하세요.
              </p>
              <Link href="/instructor/discussions/new">
                <button className="group relative h-14 bg-white text-black font-extrabold rounded-full px-8 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:scale-95">
                  <span className="relative z-10 flex items-center gap-2">
                    첫 토론 만들기
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
                    className="glass-panel bg-white/[0.02] border-white/5 p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden active:scale-[0.99]"
                    onClick={() => router.push(`/instructor/discussions/${discussion.id}`)}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="text-xl font-bold text-white truncate group-hover:text-primary transition-colors">
                            {discussion.title}
                          </h3>
                          {getStatusBadge(discussion.status)}
                        </div>

                        {discussion.description && (
                          <p className="text-zinc-500 text-sm mb-6 line-clamb-1 max-w-3xl">
                            {discussion.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-6">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-white/5 bg-white/5 px-3 py-1 rounded-lg transition-colors group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(discussion.join_code);
                            }}>
                            <span>참여 코드: {discussion.join_code}</span>
                            <Copy className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                            <Users className="w-3.5 h-3.5" />
                            <span>{discussion.participant_count || 0}명 참여</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(new Date(discussion.created_at), 'yyyy.MM.dd', { locale: ko })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 glass-panel bg-[#121214]/90 border-white/5 p-2 shadow-2xl backdrop-blur-xl">
                            <DropdownMenuItem
                              className="rounded-xl focus:bg-white/5 focus:text-white cursor-pointer py-2.5"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyCode(discussion.join_code)
                              }}
                            >
                              <Copy className="w-4 h-4 mr-3 text-zinc-400" />
                              코드 복사
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                              className="rounded-xl focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer py-2.5"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDiscussion(discussion.id, discussion.title)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-3" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white text-zinc-500 transition-all">
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
