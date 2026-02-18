'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { useTranslations } from 'next-intl'

export default function DashboardRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'ko'
  const t = useTranslations('Dashboard')

  useEffect(() => {
    let cancelled = false

    const redirectByRole = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (cancelled) return

      if (!user) {
        router.replace(`/${locale}/login`)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (!profile) {
        router.replace(`/${locale}/onboarding`)
        return
      }

      if (profile.role === 'instructor') {
        router.replace(`/${locale}/instructor`)
        return
      }

      if (profile.role === 'student') {
        router.replace(`/${locale}/student`)
        return
      }

      router.replace(`/${locale}/onboarding`)
    }

    redirectByRole()
    return () => {
      cancelled = true
    }
  }, [locale, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    </div>
  )
}
