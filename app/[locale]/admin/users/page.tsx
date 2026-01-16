'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Search,
  User,
  Users,
  GraduationCap,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
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

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  student_number: string | null
  school: string | null
  department: string | null
  created_at: string
}

interface UsersResponse {
  users: UserProfile[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AdminUsersPage() {
  const t = useTranslations('Admin.Users')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    instructors: 0,
    students: 0,
    todaySignups: 0
  })

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(role !== 'all' && { role })
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(t('toast.fetchError'))
    } finally {
      setIsLoading(false)
    }
  }, [page, search, role, t])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) return

      const data = await response.json()
      setStats({
        total: data.stats.totalUsers,
        instructors: data.stats.instructors,
        students: data.stats.students,
        todaySignups: data.stats.todaySignups
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
      fetchUsers()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Failed to update role')

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ))
      toast.success(t('toast.roleChanged'))
      fetchStats()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error(t('toast.roleChangeFailed'))
    }
  }

  const getRoleBadge = (userRole: string) => {
    const isInstructor = userRole === 'instructor'
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        isInstructor
          ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
          : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      }`}>
        {t(`role.${userRole}`)}
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
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">{t('title')}</h1>
        <p className="text-zinc-500">{t('subtitle')}</p>
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
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.total}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">{t('stats.totalUsers')}</p>
        </div>
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <GraduationCap className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.instructors}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">{t('stats.instructors')}</p>
        </div>
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <User className="w-4 h-4 text-cyan-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.students}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">{t('stats.students')}</p>
        </div>
        <div className="glass-panel bg-white p-5 border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <UserPlus className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">{stats.todaySignups}</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">{t('stats.todaySignups')}</p>
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
              placeholder={t('filters.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-50 border-zinc-200 rounded-xl">
              <SelectValue placeholder={t('filters.rolePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              <SelectItem value="instructor">{t('filters.instructor')}</SelectItem>
              <SelectItem value="student">{t('filters.student')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-panel bg-white border-zinc-200 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">{t('loading')}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{t('empty.title')}</h3>
            <p className="text-zinc-500">{t('empty.description')}</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-4 flex items-center gap-1">
                <span>{t('table.user')}</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
              <div className="col-span-2">{t('table.role')}</div>
              <div className="col-span-2">{t('table.studentNumber')}</div>
              <div className="col-span-2">{t('table.school')}</div>
              <div className="col-span-2">{t('table.createdAt')}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-100">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-zinc-50 transition-colors items-center"
                >
                  {/* User Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{user.name}</p>
                      <p className="text-sm text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="md:hidden text-xs text-zinc-400">{t('table.role')}:</span>
                    <Select
                      value={user.role}
                      onValueChange={(v) => {
                        handleRoleChange(user.id, v)
                      }}
                    >
                      <SelectTrigger
                        className="w-24 h-8 text-xs border-zinc-200"
                        onClick={(e) => e.preventDefault()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instructor">{t('role.instructor')}</SelectItem>
                        <SelectItem value="student">{t('role.student')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Student Number */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="md:hidden text-xs text-zinc-400">{t('table.studentNumber')}:</span>
                    <span className="text-sm text-zinc-600">
                      {user.student_number || '-'}
                    </span>
                  </div>

                  {/* School */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="md:hidden text-xs text-zinc-400">{t('table.school')}:</span>
                    <span className="text-sm text-zinc-600 truncate">
                      {user.school || '-'}
                    </span>
                  </div>

                  {/* Created At */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="md:hidden text-xs text-zinc-400">{t('table.createdAt')}:</span>
                    <span className="text-sm text-zinc-500">
                      {format(new Date(user.created_at), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-200 bg-zinc-50">
              <p className="text-sm text-zinc-500">
                {t('pagination.showing', { total, start: (page - 1) * 20 + 1, end: Math.min(page * 20, total) })}
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
          </>
        )}
      </motion.div>
    </div>
  )
}
