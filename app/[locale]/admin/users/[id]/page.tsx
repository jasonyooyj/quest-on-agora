'use client'

import { useCallback, useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft,
  User,
  Mail,
  School,
  BookOpen,
  Calendar,
  MessageSquare,
  Trash2,
  GraduationCap,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  student_number: string | null
  school: string | null
  department: string | null
  created_at: string
  updated_at: string
}

interface Discussion {
  id: string
  title: string
  status: string
  created_at: string
}

interface Participation {
  id: string
  stance: string
  created_at: string
  discussion_sessions: {
    id: string
    title: string
    status: string
  }
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [createdDiscussions, setCreatedDiscussions] = useState<Discussion[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('사용자를 찾을 수 없습니다')
          router.push('/admin/users')
          return
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
      setCreatedDiscussions(data.createdDiscussions || [])
      setParticipations(data.participations || [])
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('사용자 정보를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const handleRoleChange = async (newRole: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Failed to update role')

      setUser(prev => prev ? { ...prev, role: newRole } : null)
      toast.success('역할이 변경되었습니다')
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('역할 변경에 실패했습니다')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      toast.success('사용자가 삭제되었습니다')
      router.push('/admin/users')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
      active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      closed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    }
    const labels = {
      draft: '초안',
      active: '진행 중',
      closed: '종료',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-32 bg-zinc-200 rounded-lg" />
          <div className="h-64 bg-zinc-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">사용자를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">사용자 목록으로</span>
        </Link>
      </motion.div>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel bg-white border-zinc-200 p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
              <User className="w-10 h-10 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">{user.name}</h1>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.student_number && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">{user.student_number}</span>
                  </div>
                )}
                {user.school && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <School className="w-4 h-4" />
                    <span className="text-sm">{user.school} {user.department && `· ${user.department}`}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-zinc-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko })} 가입
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                역할 변경
              </label>
              <Select value={user.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instructor">교수자</SelectItem>
                  <SelectItem value="student">학생</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium">
                  <Trash2 className="w-4 h-4" />
                  사용자 삭제
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-panel bg-white border-zinc-200">
                <AlertDialogHeader>
                  <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{user.name}</strong> 사용자를 삭제하시겠습니까?
                    <br />
                    이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Created Discussions (for instructors) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel bg-white border-zinc-200"
        >
          <div className="p-6 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <GraduationCap className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900">생성한 토론</h2>
                <p className="text-sm text-zinc-500">{createdDiscussions.length}개</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
            {createdDiscussions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                생성한 토론이 없습니다
              </div>
            ) : (
              createdDiscussions.map((discussion) => (
                <Link
                  key={discussion.id}
                  href={`/admin/discussions/${discussion.id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900 truncate max-w-[200px]">
                      {discussion.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(discussion.status)}
                    <span className="text-xs text-zinc-400">
                      {format(new Date(discussion.created_at), 'MM.dd', { locale: ko })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Participations (for students) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-panel bg-white border-zinc-200"
        >
          <div className="p-6 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900">참여한 토론</h2>
                <p className="text-sm text-zinc-500">{participations.length}개</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
            {participations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                참여한 토론이 없습니다
              </div>
            ) : (
              participations.map((participation) => (
                <Link
                  key={participation.id}
                  href={`/admin/discussions/${participation.discussion_sessions.id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900 truncate max-w-[200px]">
                      {participation.discussion_sessions.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                      {participation.stance}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {format(new Date(participation.created_at), 'MM.dd', { locale: ko })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
