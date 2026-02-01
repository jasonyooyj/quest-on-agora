'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface DemoMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  createdAt: string
}

export interface MockStudent {
  id: string
  name: string
  stance: 'pro' | 'con' | 'neutral'
  isOnline: boolean
  messageCount: number
  turn: number
  needsHelp: boolean
  isSubmitted: boolean
  lastMessage?: string
  lastMessageTime?: string
}

export type DemoPhase = 'intro' | 'student' | 'transition' | 'instructor' | 'complete'

interface DemoState {
  phase: DemoPhase
  studentMessages: DemoMessage[]
  selectedStance: 'pro' | 'con' | 'neutral' | null
  turnCount: number
  mockStudents: MockStudent[]
  userParticipant: MockStudent | null
}

interface DemoContextValue extends DemoState {
  setPhase: (phase: DemoPhase) => void
  setSelectedStance: (stance: 'pro' | 'con' | 'neutral') => void
  addStudentMessage: (message: Omit<DemoMessage, 'id' | 'createdAt'>) => void
  incrementTurn: () => void
  updateMockStudent: (id: string, updates: Partial<MockStudent>) => void
  addMockStudentMessage: (studentId: string, message: string) => void
  setUserParticipant: (participant: MockStudent) => void
  resetDemo: () => void
}

const initialMockStudents: MockStudent[] = [
  { id: '1', name: '김민지', stance: 'pro', isOnline: true, messageCount: 5, turn: 4, needsHelp: false, isSubmitted: false },
  { id: '2', name: '이준혁', stance: 'con', isOnline: true, messageCount: 3, turn: 2, needsHelp: true, isSubmitted: false },
  { id: '3', name: '박서연', stance: 'neutral', isOnline: true, messageCount: 2, turn: 3, needsHelp: false, isSubmitted: false },
  { id: '4', name: '최다은', stance: 'pro', isOnline: false, messageCount: 4, turn: 5, needsHelp: false, isSubmitted: true },
  { id: '5', name: '정우진', stance: 'con', isOnline: true, messageCount: 6, turn: 6, needsHelp: false, isSubmitted: true },
  { id: '6', name: '한소희', stance: 'neutral', isOnline: true, messageCount: 1, turn: 1, needsHelp: false, isSubmitted: false },
]

const initialState: DemoState = {
  phase: 'intro',
  studentMessages: [],
  selectedStance: null,
  turnCount: 0,
  mockStudents: initialMockStudents,
  userParticipant: null,
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState)

  const setPhase = useCallback((phase: DemoPhase) => {
    setState(prev => ({ ...prev, phase }))
  }, [])

  const setSelectedStance = useCallback((stance: 'pro' | 'con' | 'neutral') => {
    setState(prev => ({ ...prev, selectedStance: stance }))
  }, [])

  const addStudentMessage = useCallback((message: Omit<DemoMessage, 'id' | 'createdAt'>) => {
    const newMessage: DemoMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
    }
    setState(prev => ({
      ...prev,
      studentMessages: [...prev.studentMessages, newMessage],
    }))
  }, [])

  const incrementTurn = useCallback(() => {
    setState(prev => ({ ...prev, turnCount: prev.turnCount + 1 }))
  }, [])

  const updateMockStudent = useCallback((id: string, updates: Partial<MockStudent>) => {
    setState(prev => ({
      ...prev,
      mockStudents: prev.mockStudents.map(student =>
        student.id === id ? { ...student, ...updates } : student
      ),
    }))
  }, [])

  const addMockStudentMessage = useCallback((studentId: string, message: string) => {
    setState(prev => ({
      ...prev,
      mockStudents: prev.mockStudents.map(student =>
        student.id === studentId
          ? {
              ...student,
              messageCount: student.messageCount + 1,
              turn: student.turn + 1,
              lastMessage: message,
              lastMessageTime: new Date().toISOString(),
            }
          : student
      ),
    }))
  }, [])

  const setUserParticipant = useCallback((participant: MockStudent) => {
    setState(prev => ({ ...prev, userParticipant: participant }))
  }, [])

  const resetDemo = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <DemoContext.Provider
      value={{
        ...state,
        setPhase,
        setSelectedStance,
        addStudentMessage,
        incrementTurn,
        updateMockStudent,
        addMockStudentMessage,
        setUserParticipant,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider')
  }
  return context
}
