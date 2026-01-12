'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, Sparkles, UserCircle2, Brain, Gauge } from 'lucide-react'
import { toast } from 'sonner'

interface DiscussionSettings {
  anonymous: boolean
  stanceOptions: string[]
  stanceLabels?: Record<string, string>
  aiMode: string
  maxTurns?: number
}

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  discussionId: string
  currentSettings: DiscussionSettings
  onSettingsUpdated: (settings: DiscussionSettings) => void
}

const aiModeDescriptions: Record<string, { label: string; description: string; icon: any; color: string }> = {
  socratic: {
    label: '소크라테스 산파술',
    description: '무의식적 전제와 근본 가치를 탐구합니다',
    icon: Brain,
    color: 'emerald'
  },
  balanced: {
    label: '균형 잡힌',
    description: '양측 관점을 균형있게 제시합니다',
    icon: Sparkles,
    color: 'blue'
  },
  debate: {
    label: '토론',
    description: '적극적인 반론으로 논쟁을 촉진합니다',
    icon: Gauge,
    color: 'rose'
  },
  minimal: {
    label: '최소 개입',
    description: '필요할 때만 개입합니다',
    icon: UserCircle2,
    color: 'zinc'
  }
}

export function SettingsDialog({
  isOpen,
  onClose,
  discussionId,
  currentSettings,
  onSettingsUpdated
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<DiscussionSettings>(currentSettings)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/discussions/${discussionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (!response.ok) {
        throw new Error('설정 저장 실패')
      }

      onSettingsUpdated(settings)
      toast.success('설정이 저장되었습니다')
      onClose()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-panel max-w-lg w-full p-8 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden bg-[#121214]/90"
          >
            {/* Glow Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">토론 설정</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">Discussion Settings</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8 relative z-10">
              {/* Anonymous Mode */}
              <div className="group/item">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <UserCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-white">익명 모드</span>
                      <p className="text-xs text-zinc-500 font-medium">실명 대신 익명으로 표시</p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.anonymous}
                      onChange={(e) => setSettings({ ...settings, anonymous: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </div>
                </label>
              </div>

              {/* AI Mode Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI 튜터 모드 선택</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(aiModeDescriptions).map(([mode, { label, description, icon: Icon, color }]) => (
                    <button
                      key={mode}
                      onClick={() => setSettings({ ...settings, aiMode: mode })}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group/mode ${settings.aiMode === mode
                        ? 'bg-white/5 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                        }`}
                    >
                      {settings.aiMode === mode && (
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                      )}
                      <div className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center ${settings.aiMode === mode ? 'bg-primary text-black' : 'bg-white/5 text-zinc-500'
                        }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`font-bold text-sm mb-1 ${settings.aiMode === mode ? 'text-white' : 'text-zinc-400'}`}>{label}</div>
                      <div className="text-[10px] text-zinc-500 font-medium leading-tight">{description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Turns */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">최대 대화 턴 수</span>
                  </div>
                  <span className="text-sm font-black text-primary">{settings.maxTurns || 10} TURNS</span>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={settings.maxTurns || 10}
                    onChange={(e) => setSettings({ ...settings, maxTurns: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-3 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    <span>MIN (3)</span>
                    <span>MAX (30)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-10 relative z-10">
              <button
                onClick={onClose}
                className="flex-1 h-14 rounded-full border border-white/10 text-white font-bold hover:bg-white/5 transition-all active:scale-95"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] h-14 rounded-full bg-white text-black font-black text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    설정 저장하기
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
