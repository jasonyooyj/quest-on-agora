/**
 * Join Intent Management
 *
 * Manages the user's intent to join a discussion via sessionStorage.
 * Used when unauthenticated users click a join URL - preserves their intent
 * through the login/onboarding flow.
 */

const STORAGE_KEY = 'agora_join_intent'
const EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

interface JoinIntent {
  code: string
  timestamp: number
}

/**
 * Save join intent to sessionStorage
 * @param code - The 6-character join code
 */
export function saveJoinIntent(code: string): void {
  if (typeof window === 'undefined') return

  const intent: JoinIntent = {
    code: code.toUpperCase(),
    timestamp: Date.now(),
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent))
  } catch {
    // sessionStorage not available or quota exceeded
    console.warn('Failed to save join intent to sessionStorage')
  }
}

/**
 * Get pending join intent if valid (not expired)
 * @returns The join code if valid intent exists, null otherwise
 */
export function getJoinIntent(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const intent: JoinIntent = JSON.parse(stored)

    // Check if expired
    if (Date.now() - intent.timestamp > EXPIRY_MS) {
      clearJoinIntent()
      return null
    }

    return intent.code
  } catch {
    return null
  }
}

/**
 * Clear join intent from sessionStorage
 */
export function clearJoinIntent(): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}
