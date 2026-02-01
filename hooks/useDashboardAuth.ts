'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  student_number?: string | null
  school?: string | null
}

interface UseDashboardAuthOptions {
  requiredRole?: 'instructor' | 'student'
  redirectOnRoleMismatch?: string
  redirectOnUnauthenticated?: string
}

interface UseDashboardAuthResult {
  user: UserProfile | null
  authUser: { id: string } | null
  isLoading: boolean
  supabase: ReturnType<typeof getSupabaseClient>
  logout: () => Promise<void>
}

export function useDashboardAuth(
  options: UseDashboardAuthOptions = {}
): UseDashboardAuthResult {
  const {
    requiredRole,
    redirectOnRoleMismatch,
    redirectOnUnauthenticated = '/login',
  } = options

  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getSupabaseClient()

  const loadUser = useCallback(async () => {
    try {
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser()

      if (!currentAuthUser) {
        router.push(redirectOnUnauthenticated)
        return
      }

      setAuthUser({ id: currentAuthUser.id })

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentAuthUser.id)
        .single()

      if (profile) {
        setUser(profile)

        if (requiredRole && profile.role !== requiredRole && redirectOnRoleMismatch) {
          router.push(redirectOnRoleMismatch)
          return
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router, requiredRole, redirectOnRoleMismatch, redirectOnUnauthenticated])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }, [supabase, router])

  return {
    user,
    authUser,
    isLoading,
    supabase,
    logout,
  }
}
