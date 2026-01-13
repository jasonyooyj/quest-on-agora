'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { DEMO_MOCK } from './mockData'

export default function DemoStep4Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>('1')
  const { stats, distribution, participants } = DEMO_MOCK.dashboard

  return (
    <div className="w-full h-full bg-zinc-50 flex flex-col overflow-hidden p-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-900">실시간 참여 현황</div>
            <div className="text-sm text-zinc-500">{stats.online}명 접속 중</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">찬성 {distribution.pro}</span>
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">반대 {distribution.con}</span>
          <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold">중립 {distribution.neutral}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-zinc-700">제출 현황</span>
          <span className="text-sm font-bold text-primary">{stats.submitted}/{stats.total}</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(stats.submitted / stats.total) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
          />
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-bold text-zinc-700">참여자 목록</span>
          {stats.needsHelp > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-600">{stats.needsHelp}명 도움 필요</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
          {participants.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedId === p.id
                  ? 'bg-primary text-white border-primary shadow-lg'
                  : p.needsHelp
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    selectedId === p.id ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {p.name[0]}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                    selectedId === p.id ? 'border-primary' : 'border-white'
                  } ${p.isOnline ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold truncate ${selectedId === p.id ? 'text-white' : 'text-zinc-900'}`}>
                      {p.name}
                    </span>
                    {p.needsHelp && selectedId !== p.id && (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    )}
                    {p.isSubmitted && (
                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${selectedId === p.id ? 'text-white/80' : 'text-emerald-500'}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedId === p.id
                        ? 'bg-white/20 text-white'
                        : p.stance === 'pro'
                          ? 'bg-emerald-100 text-emerald-600'
                          : p.stance === 'con'
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {p.stance === 'pro' ? '찬성' : p.stance === 'con' ? '반대' : '중립'}
                    </span>
                    <span className={`text-[10px] ${selectedId === p.id ? 'text-white/60' : 'text-zinc-400'}`}>
                      Turn {p.turn || 3}/10
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
