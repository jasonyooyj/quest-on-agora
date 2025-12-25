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
      draft: 'bg-muted text-muted-foreground',
      active: 'bg-[hsl(var(--sage))] text-white',
      closed: 'bg-foreground/20 text-foreground/60',
    }
    const labels = {
      draft: '초안',
      active: '진행 중',
      closed: '종료',
    }
    return (
      <span className={`tag ${styles[status as keyof typeof styles]}`}>
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

            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/instructor/discussions/new">
                <button className="btn-brutal-fill text-sm flex items-center gap-2 min-h-[44px]">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">새 토론</span>
                </button>
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
          <div className="tag mb-4">대시보드</div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>
            안녕하세요, {user?.name || '교수'}님
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            오늘도 의미 있는 토론을 시작해보세요
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="brutal-box bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <MessageCircle className="w-6 h-6 text-[hsl(var(--coral))]" />
              <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {discussions.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">전체 토론</p>
          </div>

          <div className="brutal-box bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-6 h-6 text-[hsl(var(--sage))]" />
              <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {activeCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">진행 중</p>
          </div>

          <div className="brutal-box bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-6 h-6 text-[hsl(var(--gold))]" />
              <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {totalParticipants}
              </span>
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">총 참여자</p>
          </div>
        </motion.div>

        {/* Discussions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
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
                아직 토론이 없습니다
              </h3>
              <p className="text-muted-foreground mb-6">
                첫 번째 토론을 만들어 학생들과 의미 있는 대화를 시작하세요
              </p>
              <Link href="/instructor/discussions/new">
                <button className="btn-brutal-fill">
                  첫 토론 만들기
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </Link>
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
                  onClick={() => router.push(`/instructor/discussions/${discussion.id}`)}
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
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{discussion.participant_count || 0}명 참여</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(discussion.created_at), 'yyyy년 M월 d일', { locale: ko })}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs bg-muted px-2 py-1">
                          코드: {discussion.join_code}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleCopyCode(discussion.join_code)
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          코드 복사
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDiscussion(discussion.id, discussion.title)
                          }}
                          className="text-[hsl(var(--coral))]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
