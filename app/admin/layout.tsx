'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  email: string
  name: string
}

const navItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: '사용자 관리', icon: Users },
  { href: '/admin/discussions', label: '토론 관리', icon: MessageSquare },
  { href: '/admin/settings', label: '시스템 설정', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadAdminUser()
  }, [])

  const loadAdminUser = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/admin')
        return
      }

      // Verify admin access via API
      const verifyResponse = await fetch('/api/admin/stats')
      if (verifyResponse.status === 401) {
        router.push('/login?redirect=/admin')
        return
      }
      if (verifyResponse.status === 403) {
        toast.error('관리자 권한이 없습니다')
        // Redirect to appropriate dashboard based on role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'instructor') {
          router.push('/instructor')
        } else if (profile?.role === 'student') {
          router.push('/student')
        } else {
          router.push('/')
        }
        return
      }

      // Get profile for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      setAdmin({
        id: user.id,
        email: user.email || '',
        name: profile?.name || 'Admin'
      })
    } catch (error) {
      console.error('Error loading admin user:', error)
      toast.error('사용자 정보를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-zinc-200">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-lg font-bold text-zinc-900">Admin</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-zinc-600" />
            ) : (
              <Menu className="w-6 h-6 text-zinc-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="border-t border-zinc-200 bg-white py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all ${
                    active
                      ? 'bg-red-500/10 text-red-600'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
            <div className="border-t border-zinc-200 mt-2 pt-2 mx-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">로그아웃</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-zinc-200 sticky top-0">
          {/* Logo */}
          <div className="p-6 border-b border-zinc-200">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <span className="text-xl font-bold text-zinc-900 block">Admin</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">관리자 패널</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href, item.exact)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      active
                        ? 'bg-red-500/10 text-red-600'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-red-500' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
                    <span className="font-medium flex-1">{item.label}</span>
                    {active && (
                      <ChevronRight className="w-4 h-4 text-red-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-zinc-200">
            <div className="glass-panel bg-zinc-50 p-4 rounded-xl mb-3">
              <p className="text-sm font-bold text-zinc-900 truncate">{admin?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{admin?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
