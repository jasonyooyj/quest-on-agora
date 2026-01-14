'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users,
  GraduationCap,
  User,
  UserPlus,
  MessageSquare,
  Activity,
  TrendingUp,
  ArrowRight,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations, useFormatter } from 'next-intl'

interface Stats {
  totalUsers: number
  instructors: number
  students: number
  todaySignups: number
  weekSignups: number
  totalDiscussions: number
  activeDiscussions: number
  closedDiscussions: number
  totalMessages: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface RecentDiscussion {
  id: string
  title: string
  status: string
  instructor_name: string
  created_at: string
  participant_count: number
}

export default function AdminDashboard() {
  const t = useTranslations('Admin.Dashboard')
  const format = useFormatter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentDiscussions, setRecentDiscussions] = useState<RecentDiscussion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')

      const data = await response.json()
      setStats(data.stats)
      setRecentUsers(data.recentUsers || [])
      setRecentDiscussions(data.recentDiscussions || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('통계 데이터를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
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

  const getRoleBadge = (role: string) => {
    const isInstructor = role === 'instructor'
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        isInstructor
          ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
          : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      }`}>
        {isInstructor ? '교수자' : '학생'}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-48 bg-zinc-200 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-zinc-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
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
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">관리자 대시보드</h1>
        <p className="text-zinc-500">플랫폼 전체 현황을 한눈에 확인하세요</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8"
      >
        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.totalUsers || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">전체 사용자</p>
        </div>

        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.instructors || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">교수자</p>
        </div>

        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 group-hover:scale-110 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.students || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">학생</p>
        </div>

        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.todaySignups || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">오늘 가입</p>
        </div>
      </motion.div>

      {/* Discussion Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8"
      >
        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.totalDiscussions || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">전체 토론</p>
        </div>

        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.activeDiscussions || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">진행 중</p>
        </div>

        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-zinc-500/10 text-zinc-500 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.closedDiscussions || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">종료됨</p>
        </div>

        <div className="glass-panel bg-white p-6 border-zinc-200 hover:border-zinc-300 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-3xl font-bold text-zinc-900">{stats?.weekSignups || 0}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">이번 주 가입</p>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-panel bg-white border-zinc-200"
        >
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{t('recentUsers.title')}</h2>
              <p className="text-sm text-zinc-500">{t('recentUsers.subtitle')}</p>
            </div>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              {t('recentUsers.viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentUsers.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                {t('recentUsers.empty')}
              </div>
            ) : (
              recentUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">{user.name}</p>
                      <p className="text-sm text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(user.role)}
                    <span className="text-xs text-zinc-400">
                      {format.dateTime(new Date(user.created_at), { month: '2-digit', day: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Discussions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-panel bg-white border-zinc-200"
        >
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{t('recentDiscussions.title')}</h2>
              <p className="text-sm text-zinc-500">{t('recentDiscussions.subtitle')}</p>
            </div>
            <Link
              href="/admin/discussions"
              className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              {t('recentDiscussions.viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentDiscussions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                {t('recentDiscussions.empty')}
              </div>
            ) : (
              recentDiscussions.map((discussion) => (
                <Link
                  key={discussion.id}
                  href={`/admin/discussions/${discussion.id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-nowrap">
                      <p className="font-medium text-zinc-900 truncate flex-1 min-w-0">{discussion.title}</p>
                      <span className="shrink-0">{getStatusBadge(discussion.status)}</span>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {t('recentDiscussions.meta', { instructor: discussion.instructor_name, count: discussion.participant_count })}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 ml-4">
                    {format.dateTime(new Date(discussion.created_at), { month: '2-digit', day: '2-digit' })}
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
