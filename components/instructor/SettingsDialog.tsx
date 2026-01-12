'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2 } from 'lucide-react'
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

const aiModeDescriptions: Record<string, { label: string; description: string }> = {
  socratic: {
    label: '소크라테스식',
    description: '질문을 통해 학생의 사고를 유도합니다'
  },
  balanced: {
    label: '균형 잡힌',
    description: '양측 관점을 균형있게 제시합니다'
  },
  debate: {
    label: '토론',
    description: '적극적인 반론으로 논쟁을 촉진합니다'
  },
  minimal: {
    label: '최소 개입',
    description: '필요할 때만 개입합니다'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="brutal-box bg-background max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                토론 설정
              </h2>
              <button
                onClick={onClose}
                className="p-2 border-2 border-border hover:border-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Anonymous Mode */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.anonymous}
                    onChange={(e) => setSettings({ ...settings, anonymous: e.target.checked })}
                    className="w-5 h-5 border-2 border-foreground rounded-sm"
                  />
                  <div>
                    <span className="font-medium">익명 모드</span>
                    <p className="text-sm text-muted-foreground">
                      학생 이름 대신 "학생 1, 학생 2..."로 표시됩니다
                    </p>
                  </div>
                </label>
              </div>

              {/* AI Mode */}
              <div>
                <label className="block text-sm font-semibold uppercase tracking-wider mb-3">
                  AI 튜터 모드
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(aiModeDescriptions).map(([mode, { label, description }]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettings({ ...settings, aiMode: mode })}
                      className={`p-3 border-2 text-left transition-all ${
                        settings.aiMode === mode
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Turns */}
              <div>
                <label className="block text-sm font-semibold uppercase tracking-wider mb-3">
                  최대 대화 턴 수: {settings.maxTurns || 10}
                </label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={settings.maxTurns || 10}
                  onChange={(e) => setSettings({ ...settings, maxTurns: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>3턴 (짧은 토론)</span>
                  <span>30턴 (긴 토론)</span>
                </div>
              </div>

              {/* Stance Labels Preview */}
              <div>
                <label className="block text-sm font-semibold uppercase tracking-wider mb-3">
                  입장 라벨
                </label>
                <div className="flex flex-wrap gap-2">
                  {settings.stanceOptions?.map((option) => (
                    <span
                      key={option}
                      className="px-3 py-1 border-2 border-border text-sm"
                    >
                      {settings.stanceLabels?.[option] || option}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  입장 라벨은 토론 생성 시에만 설정할 수 있습니다
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-border">
              <button
                onClick={onClose}
                className="btn-brutal"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-brutal-fill flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    저장
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
