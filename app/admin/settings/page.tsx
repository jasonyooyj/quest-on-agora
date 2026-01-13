'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Save,
  AlertTriangle,
  RefreshCw,
  Globe,
  UserPlus,
  Wrench,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface SystemSettings {
  platformName: string
  allowRegistration: boolean
  maintenanceMode: boolean
  announcementBanner: string
  defaultAiMode: string
  defaultMaxTurns: number
  defaultAnonymous: boolean
  maxParticipantsPerDiscussion: number
}

const DEFAULT_SETTINGS: SystemSettings = {
  platformName: 'Agora',
  allowRegistration: true,
  maintenanceMode: false,
  announcementBanner: '',
  defaultAiMode: 'socratic',
  defaultMaxTurns: 10,
  defaultAnonymous: true,
  maxParticipantsPerDiscussion: 100
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setSettings(data.settings)
      setOriginalSettings(data.settings)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('설정을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (!response.ok) throw new Error('Failed to save settings')

      const data = await response.json()
      setOriginalSettings(data.settings || settings)
      toast.success('설정이 저장되었습니다')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('설정 저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(originalSettings)
    toast.info('변경사항이 취소되었습니다')
  }

  const updateSetting = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-48 bg-zinc-200 rounded-lg" />
          <div className="h-64 bg-zinc-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">시스템 설정</h1>
          <p className="text-zinc-500">플랫폼 전반의 설정을 관리합니다</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors text-sm font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장
            </button>
          </div>
        )}
      </motion.div>

      <div className="space-y-6">
        {/* Platform Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel bg-white border-zinc-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">플랫폼 설정</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                플랫폼 이름
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => updateSetting('platformName', e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  회원가입 허용
                </label>
                <p className="text-sm text-zinc-500">
                  새로운 사용자의 가입을 허용합니다
                </p>
              </div>
              <Switch
                checked={settings.allowRegistration}
                onCheckedChange={(checked) => updateSetting('allowRegistration', checked)}
              />
            </div>
          </div>
        </motion.div>

        {/* Maintenance Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-panel bg-white border-zinc-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Wrench className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">유지보수</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  점검 모드
                </label>
                <p className="text-sm text-zinc-500">
                  활성화 시 관리자 외 접근이 제한됩니다
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
              />
            </div>

            {settings.maintenanceMode && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">점검 모드가 활성화되어 있습니다</p>
                  <p className="text-sm text-amber-600">일반 사용자는 플랫폼에 접근할 수 없습니다</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                공지사항 배너
              </label>
              <textarea
                value={settings.announcementBanner}
                onChange={(e) => updateSetting('announcementBanner', e.target.value)}
                placeholder="전체 사용자에게 표시할 공지사항을 입력하세요..."
                rows={3}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Default Discussion Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-panel bg-white border-zinc-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">기본 토론 설정</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                기본 AI 모드
              </label>
              <Select
                value={settings.defaultAiMode}
                onValueChange={(v) => updateSetting('defaultAiMode', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socratic">소크라테스식</SelectItem>
                  <SelectItem value="debate">토론</SelectItem>
                  <SelectItem value="minimal">최소 개입</SelectItem>
                  <SelectItem value="balanced">균형</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                기본 최대 턴 수
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.defaultMaxTurns}
                onChange={(e) => updateSetting('defaultMaxTurns', parseInt(e.target.value) || 10)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  기본 익명 설정
                </label>
                <p className="text-sm text-zinc-500">
                  새 토론 생성 시 익명 모드를 기본으로 설정
                </p>
              </div>
              <Switch
                checked={settings.defaultAnonymous}
                onCheckedChange={(checked) => updateSetting('defaultAnonymous', checked)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                최대 참여자 수
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={settings.maxParticipantsPerDiscussion}
                onChange={(e) => updateSetting('maxParticipantsPerDiscussion', parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <p className="text-sm text-zinc-500 mt-1">
                토론당 최대 참여 가능 인원
              </p>
            </div>
          </div>
        </motion.div>

        {/* Database Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-zinc-700">설정 저장 안내</p>
              <p className="text-sm text-zinc-500">
                설정은 데이터베이스의 system_settings 테이블에 저장됩니다.
                테이블이 없는 경우 기본값이 사용되며, 변경사항은 메모리에만 저장됩니다.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
