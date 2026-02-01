'use client'

import { useRouter } from 'next/navigation'
import { LiveStudentDemo } from '@/components/demo/live'
import { useDemo } from '@/components/demo/live'

export default function DemoStudentPage() {
  const router = useRouter()
  const { selectedStance, setPhase, setUserParticipant } = useDemo()

  const handleTransitionToInstructor = () => {
    // Save user's participation data for instructor view
    if (selectedStance) {
      setUserParticipant({
        id: 'demo-user',
        name: '나 (데모)',
        stance: selectedStance,
        isOnline: true,
        messageCount: 3,
        turn: 3,
        needsHelp: false,
        isSubmitted: false,
      })
    }
    setPhase('instructor')
    router.push('/demo/instructor')
  }

  return <LiveStudentDemo onTransitionToInstructor={handleTransitionToInstructor} />
}
