'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  MessageCircle,
  Users,
  Clock,
  LogOut,
  User,
  Settings,
  Hash,
  ArrowRight,
  Loader2
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
  created_at: string
  my_stance: string | null
  is_submitted: boolean
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
  const router = useRouter()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

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
          is_submitted: p.is_submitted
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

  const handleJoinDiscussion = async () => {
    if (!joinCode.trim()) {
      toast.error('참여 코드를 입력해주세요')
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
        toast.error('존재하지 않는 참여 코드입니다')
        return
      }

      if (session.status !== 'active') {
        toast.error('이 토론은 현재 참여가 불가능합니다')
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
          display_name: `학생 ${Math.floor(Math.random() * 100) + 1}`
        })

      if (joinError) {
        toast.error('토론 참여에 실패했습니다')
        return
      }

      toast.success('토론에 참여했습니다!')
      router.push(`/student/discussions/${session.id}`)
    } catch (error) {
      console.error('Error joining discussion:', error)
      toast.error('토론 참여 중 오류가 발생했습니다')
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
      draft: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50',
      active: 'bg-primary/10 text-primary border-primary/20',
      closed: 'bg-zinc-900/50 text-zinc-500 border-zinc-800/50',
    }
    const labels = {
      draft: '준비 중',
      active: '진행 중',
      closed: '종료',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-tight ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getStanceBadge = (stance: string | null, isSubmitted: boolean) => {
    if (!stance) {
      return <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">입장 미선택</span>
    }

    const stanceLabels: Record<string, string> = {
      pro: '찬성',
      con: '반대',
      neutral: '중립'
    }

    const stanceStyles: Record<string, string> = {
      pro: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      con: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      neutral: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${stanceStyles[stance]}`}>
          {stanceLabels[stance]}
        </span>
        {isSubmitted && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            제출 완료
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
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
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
                  {user?.student_number && (
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">학번: {user.student_number}</p>
                  )}
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
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 relative z-10">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">학생 대시보드</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white mb-4">
            반가워요, <span className="text-primary">{user?.name}</span>님
          </h1>
          <p className="text-zinc-400 text-xl max-w-2xl leading-relaxed">
            오늘 당신의 논리는 어떤 변화를 만들어낼까요? <br className="hidden md:block" />
            새로운 토론에 참여하고 생각을 확장해보세요.
          </p>
        </motion.div>

        {/* Join Discussion Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <div className="glass-panel p-1 border-white/5 bg-white/[0.02]">
            <div className="p-8 md:p-10 flex flex-col lg:flex-row lg:items-center gap-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">토론 참여하기</h2>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  교수님이 공유한 6자리 참여 코드를 입력하여 <br className="hidden md:block" />
                  새로운 세션에 참여하실 수 있습니다.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative group">
                  <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="참여 코드"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinDiscussion()}
                    className="ios-input pl-14 h-16 w-full sm:w-64 bg-white/[0.03] text-2xl font-bold tracking-[0.2em] focus:bg-white/[0.05] placeholder:text-zinc-700 placeholder:tracking-normal placeholder:font-normal"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleJoinDiscussion}
                  disabled={isJoining}
                  className="group relative h-16 bg-white text-black font-extrabold rounded-full px-10 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-3 text-lg">
                    {isJoining ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        참여하기
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
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
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">누적 참여 토론</p>
          </div>

          <div className="glass-panel p-8 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 transition-transform group-hover:scale-110">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-white">
                {activeCount}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">진행 중인 토론</p>
          </div>

          <div className="glass-panel p-8 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 transition-transform group-hover:scale-110">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-4xl font-bold tracking-tight text-white">
                {discussions.filter(d => d.is_submitted).length}
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">작성된 통찰력</p>
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
              <h2 className="text-3xl font-bold text-white mb-1">내 토론 리스트</h2>
              <p className="text-zinc-500 font-medium">참여 중이거나 완료된 모든 토론 세션</p>
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
              <h3 className="text-2xl font-bold text-white mb-3">참여한 토론이 없습니다</h3>
              <p className="text-zinc-500 max-w-sm mx-auto">
                아직 활성화된 토론이 없습니다. <br />
                참여 코드를 입력하여 첫 토론을 시작해보세요!
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
                    className="glass-panel bg-white/[0.02] border-white/5 p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden active:scale-[0.99]"
                    onClick={() => router.push(`/student/discussions/${discussion.id}`)}
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
                          <p className="text-zinc-500 text-sm mb-6 line-clamp-1 max-w-3xl">
                            {discussion.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-6">
                          {getStanceBadge(discussion.my_stance, discussion.is_submitted)}
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(new Date(discussion.created_at), 'yyyy.MM.dd', { locale: ko })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
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
