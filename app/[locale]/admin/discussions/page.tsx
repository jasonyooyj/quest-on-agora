'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Search,
  MessageSquare,
  Activity,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Instructor {
  id: string
  name: string
  email: string
}

interface Discussion {
  id: string
  title: string
  description: string | null
  status: string
  join_code: string
  created_at: string
  participant_count: number
  instructor: Instructor | null
}

interface DiscussionsResponse {
  discussions: Discussion[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AdminDiscussionsPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    draft: 0
  })

  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(status !== 'all' && { status })
      })

      const response = await fetch(`/api/admin/discussions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch discussions')

      const data: DiscussionsResponse = await response.json()
      setDiscussions(data.discussions)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching discussions:', error)
      toast.error('토론 목록을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, status])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) return

      const data = await response.json()
      setStats({
        total: data.stats.totalDiscussions,
        active: data.stats.activeDiscussions,
        closed: data.stats.closedDiscussions,
        draft: data.stats.totalDiscussions - data.stats.activeDiscussions - data.stats.closedDiscussions
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchDiscussions()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchDiscussions])

  const getStatusBadge = (discussionStatus: string) => {
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
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[discussionStatus as keyof typeof styles]}`}>
        {labels[discussionStatus as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">토론 관리</h1>
        <p className="text-zinc-500">모든 토론 세션을 확인하고 관리할 수 있습니다</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.total}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">전체 토론</p>
        </div>
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.active}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">진행 중</p>
        </div>
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-zinc-500/10">
              <Calendar className="w-4 h-4 text-zinc-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.closed}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">종료됨</p>
        </div>
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.draft}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">초안</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-panel bg-white p-4 border-zinc-200 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="토론 제목으로 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-50 border-zinc-200 rounded-xl">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="active">진행 중</SelectItem>
              <SelectItem value="closed">종료됨</SelectItem>
              <SelectItem value="draft">초안</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Discussions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {isLoading ? (
          <div className="glass-panel bg-white border-zinc-200 p-8 text-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">로딩 중...</p>
          </div>
        ) : discussions.length === 0 ? (
          <div className="glass-panel bg-white border-zinc-200 p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">토론이 없습니다</h3>
            <p className="text-zinc-500">검색 조건에 맞는 토론이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discussions.map((discussion, index) => (
              <motion.div
                key={discussion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={`/admin/discussions/${discussion.id}`}
                  className="block glass-panel bg-white border-zinc-200 p-6 hover:bg-zinc-50 hover:border-zinc-300 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-zinc-900 truncate group-hover:text-red-500 transition-colors">
                          {discussion.title}
                        </h3>
                        {getStatusBadge(discussion.status)}
                      </div>
                      {discussion.description && (
                        <p className="text-sm text-zinc-500 mb-3 line-clamp-1">
                          {discussion.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {discussion.participant_count}명 참여
                        </span>
                        <span>
                          교수자: {discussion.instructor?.name || 'Unknown'}
                        </span>
                        <span>
                          참여 코드: {discussion.join_code}
                        </span>
                        <span>
                          {format(new Date(discussion.created_at), 'yyyy.MM.dd', { locale: ko })}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-red-500 group-hover:border-red-500 group-hover:text-white text-zinc-400 transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 glass-panel bg-white border-zinc-200">
              <p className="text-sm text-zinc-500">
                전체 {total}개 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}개
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-zinc-600 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
