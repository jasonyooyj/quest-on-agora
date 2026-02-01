'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Settings, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ProfileMenu, type MenuItem } from '@/components/profile/ProfileMenu'

interface DashboardLayoutProps {
  children: ReactNode
  user?: {
    name?: string
    email?: string
    role?: string
  }
  headerActions?: ReactNode
  profileMenuItems?: MenuItem[]
  onLogout?: () => void
  translations?: {
    settings?: string
    logout?: string
  }
  profileMeta?: string
}

export function DashboardLayout({
  children,
  user,
  headerActions,
  profileMenuItems,
  onLogout,
  translations,
  profileMeta,
}: DashboardLayoutProps) {
  const defaultMenuItems: MenuItem[] = [
    { label: translations?.settings ?? 'Settings', icon: Settings, href: '/settings' },
    { label: translations?.logout ?? 'Logout', icon: LogOut, onClick: onLogout, variant: 'danger' },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/15 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply hidden md:block" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply hidden md:block" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo-navbar.png"
                alt="Agora"
                width={32}
                height={32}
                className="group-hover:scale-110 transition-transform duration-500"
              />
              <span className="text-2xl font-bold tracking-tighter bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
                Agora
              </span>
            </Link>

            <div className="flex items-center gap-6">
              {headerActions}
              <ProfileMenu
                name={user?.name}
                email={user?.email}
                role={user?.role}
                meta={profileMeta}
                items={profileMenuItems ?? defaultMenuItems}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 relative z-10">
        {children}
      </main>
    </div>
  )
}
