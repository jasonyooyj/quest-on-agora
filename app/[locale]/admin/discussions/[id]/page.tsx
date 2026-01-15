'use client'

import { useCallback, useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft,
  MessageSquare,
  Users,
  User,
  Calendar,
  Copy,
  Trash2,
  Activity,
  XCircle,
  GraduationCap
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
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

interface Discussion {
  id: string
  title: string
  description: string | null
  status: string
  join_code: string
  ai_mode: string
  max_turns: number
  anonymous: boolean
  created_at: string
  updated_at: string
  participant_count: number
  message_count: number
}

interface Instructor {
  id: string
  name: string
  email: string
}

interface Participant {
  id: string
  student_id: string
  stance: string
  created_at: string
  name: string
  email: string
  student_number: string | null
}

export default function AdminDiscussionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('Admin.DiscussionDetail')
  const [discussion, setDiscussion] = useState<Discussion | null>(null)
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDiscussionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/discussions/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('toast.notFound'))
          router.push('/admin/discussions')
          return
        }
        throw new Error('Failed to fetch discussion')
      }

      const data = await response.json()
      setDiscussion(data.discussion)
      setInstructor(data.instructor)
      setParticipants(data.participants || [])
    } catch (error) {
      console.error('Error fetching discussion:', error)
      toast.error(t('toast.fetchError'))
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchDiscussionData()
  }, [fetchDiscussionData])

  const handleStatusChange = async (newStatus: string) => {
    if (!discussion) return

    try {
      const response = await fetch(`/api/admin/discussions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      setDiscussion(prev => prev ? { ...prev, status: newStatus } : null)
      toast.success(t('toast.statusChanged'))
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(t('toast.statusChangeFailed'))
    }
  }

  const handleCopyCode = async () => {
    if (!discussion) return
    try {
      await navigator.clipboard.writeText(discussion.join_code)
      toast.success(t('toast.codeCopied'))
    } catch {
      toast.error(t('toast.copyFailed'))
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/discussions/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete discussion')

      toast.success(t('toast.deleted'))
      router.push('/admin/discussions')
    } catch (error) {
      console.error('Error deleting discussion:', error)
      toast.error(t('toast.deleteFailed'))
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
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getAiModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      socratic: '소크라테스식',
      debate: '토론',
      minimal: '최소 개입',
      balanced: '균형'
    }
    return labels[mode] || mode
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

  if (!discussion) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">토론을 찾을 수 없습니다</p>
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
          href="/admin/discussions"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">토론 목록으로</span>
        </Link>
      </motion.div>

      {/* Discussion Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel bg-white border-zinc-200 p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-zinc-900">{discussion.title}</h1>
              {getStatusBadge(discussion.status)}
            </div>
            {discussion.description && (
              <p className="text-zinc-500 mb-4">{discussion.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                참여 코드: {discussion.join_code}
              </button>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(discussion.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                상태 변경
              </label>
              <Select value={discussion.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">초안</SelectItem>
                  <SelectItem value="active">진행 중</SelectItem>
                  <SelectItem value="closed">종료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium">
                  <Trash2 className="w-4 h-4" />
                  토론 삭제
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-panel bg-white border-zinc-200">
                <AlertDialogHeader>
                  <AlertDialogTitle>토론 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{discussion.title}</strong> 토론을 삭제하시겠습니까?
                    <br />
                    이 작업은 되돌릴 수 없으며, 모든 메시지와 참여 기록이 삭제됩니다.
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-zinc-900">{discussion.participant_count}</span>
            </div>
            <p className="text-xs text-zinc-500">참여자</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span className="text-2xl font-bold text-zinc-900">{discussion.message_count}</span>
            </div>
            <p className="text-xs text-zinc-500">메시지</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-lg font-bold text-zinc-900">{getAiModeLabel(discussion.ai_mode)}</span>
            </div>
            <p className="text-xs text-zinc-500">AI 모드</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-amber-500" />
              <span className="text-lg font-bold text-zinc-900">{discussion.max_turns}</span>
            </div>
            <p className="text-xs text-zinc-500">최대 턴</p>
          </div>
        </div>
      </motion.div>

      {/* Instructor & Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instructor Info */}
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
              <h2 className="font-bold text-zinc-900">교수자 정보</h2>
            </div>
          </div>
          <div className="p-6">
            {instructor ? (
              <Link
                href={`/admin/users/${instructor.id}`}
                className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{instructor.name}</p>
                  <p className="text-sm text-zinc-500">{instructor.email}</p>
                </div>
              </Link>
            ) : (
              <p className="text-zinc-500 text-center py-4">교수자 정보를 찾을 수 없습니다</p>
            )}
          </div>
        </motion.div>

        {/* Participants */}
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
                <h2 className="font-bold text-zinc-900">참여자 목록</h2>
                <p className="text-sm text-zinc-500">{participants.length}명</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
            {participants.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                참여자가 없습니다
              </div>
            ) : (
              participants.map((participant) => (
                <Link
                  key={participant.id}
                  href={`/admin/users/${participant.student_id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{participant.name}</p>
                      <p className="text-xs text-zinc-500">{participant.student_number || participant.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                    {participant.stance}
                  </span>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
