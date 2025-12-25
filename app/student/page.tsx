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
      draft: 'bg-muted text-muted-foreground',
      active: 'bg-[hsl(var(--sage))] text-white',
      closed: 'bg-foreground/20 text-foreground/60',
    }
    const labels = {
      draft: '준비 중',
      active: '진행 중',
      closed: '종료',
    }
    return (
      <span className={`tag ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getStanceBadge = (stance: string | null, isSubmitted: boolean) => {
    if (!stance) {
      return <span className="text-xs text-muted-foreground">입장 미선택</span>
    }

    const stanceLabels: Record<string, string> = {
      pro: '찬성',
      con: '반대',
      neutral: '중립'
    }

    const stanceColors: Record<string, string> = {
      pro: 'bg-[hsl(var(--sage))] text-white',
      con: 'bg-[hsl(var(--coral))] text-white',
      neutral: 'bg-foreground/20 text-foreground'
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`tag ${stanceColors[stance]}`}>
          {stanceLabels[stance]}
        </span>
        {isSubmitted && (
          <span className="text-xs text-[hsl(var(--sage))]">제출 완료</span>
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
    <div className="min-h-screen bg-background noise-overlay">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center transition-colors">
                <MessageCircle className="w-8 h-8 text-[hsl(var(--coral))] group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Agora
              </span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-11 h-11 border-2 border-foreground flex items-center justify-center hover:bg-muted transition-colors">
                  <User className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {user?.student_number && (
                    <p className="text-xs text-muted-foreground mt-1">학번: {user.student_number}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  설정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-[hsl(var(--coral))]">
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="tag mb-4">학생 대시보드</div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>
            안녕하세요, {user?.name || '학생'}님
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            토론에 참여하고 생각을 나눠보세요
          </p>
        </motion.div>

        {/* Join Discussion Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <div className="brutal-box bg-foreground text-background p-6 md:p-8">
            <div className="flex flex-col gap-4 md:gap-6">
              <div>
                <h2 className="text-lg md:text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  토론에 참여하기
                </h2>
                <p className="text-background/70 text-sm md:text-base">
                  교수님이 공유한 참여 코드를 입력하세요
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="참여 코드 입력"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinDiscussion()}
                    className="input-editorial with-icon pl-12 w-full bg-background text-foreground uppercase"
                    maxLength={8}
                  />
                </div>
                <button
                  onClick={handleJoinDiscussion}
                  disabled={isJoining}
                  className="bg-[hsl(var(--coral))] text-white font-semibold uppercase tracking-wide px-6 py-3 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {isJoining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      참여
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          <div className="brutal-box bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <MessageCircle className="w-6 h-6 text-[hsl(var(--coral))]" />
              <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {discussions.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">참여한 토론</p>
          </div>

          <div className="brutal-box bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-6 h-6 text-[hsl(var(--sage))]" />
              <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {activeCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">진행 중인 토론</p>
          </div>
        </motion.div>

        {/* My Discussions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              내 토론
            </h2>
            <span className="text-sm text-muted-foreground">{discussions.length}개</span>
          </div>

          {discussions.length === 0 ? (
            <div className="brutal-box bg-card p-12 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                아직 참여한 토론이 없습니다
              </h3>
              <p className="text-muted-foreground">
                위에서 참여 코드를 입력하여 첫 토론에 참여해보세요
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {discussions.map((discussion, index) => (
                <motion.div
                  key={discussion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="brutal-box bg-card p-6 group cursor-pointer"
                  onClick={() => router.push(`/student/discussions/${discussion.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>
                          {discussion.title}
                        </h3>
                        {getStatusBadge(discussion.status)}
                      </div>

                      {discussion.description && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {discussion.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {getStanceBadge(discussion.my_stance, discussion.is_submitted)}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(discussion.created_at), 'yyyy년 M월 d일', { locale: ko })}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
