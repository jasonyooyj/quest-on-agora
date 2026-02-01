'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DemoProvider } from '@/components/demo/live'

export default function DemoPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to student demo
    router.replace('/demo/student')
  }, [router])

  return (
    <DemoProvider>
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-zinc-500 font-medium">데모 시작 중...</p>
        </div>
      </div>
    </DemoProvider>
  )
}
