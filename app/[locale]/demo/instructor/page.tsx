'use client'

import { useRouter } from 'next/navigation'
import { LiveInstructorDemo } from '@/components/demo/live'
import { useDemo } from '@/components/demo/live'

export default function DemoInstructorPage() {
  const router = useRouter()
  const { setPhase, resetDemo } = useDemo()

  const handleComplete = () => {
    setPhase('complete')
    // DemoCompletionCTA is shown inline in LiveInstructorDemo
  }

  return <LiveInstructorDemo onComplete={handleComplete} />
}
