/**
 * Simple in-memory rate limiter for API routes
 *
 * Note: This works for single-server deployments.
 * For production at scale, consider using @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check and update rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = rateLimitStore.get(identifier)

  // If no entry or expired, create new one
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and other reverse proxies
 */
export function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Vercel-specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) {
    return vercelIP.split(',')[0].trim()
  }

  // Cloudflare header
  const cfIP = request.headers.get('cf-connecting-ip')
  if (cfIP) {
    return cfIP
  }

  return 'unknown'
}

// Pre-configured rate limits for different route types
export const RATE_LIMITS = {
  // AI chat endpoints - expensive, limit strictly
  ai: { limit: 30, windowSeconds: 60 },      // 30 requests per minute

  // Join code attempts - prevent brute force
  join: { limit: 10, windowSeconds: 60 },    // 10 attempts per minute

  // General API routes
  api: { limit: 100, windowSeconds: 60 },    // 100 requests per minute

  // Auth routes - prevent credential stuffing
  auth: { limit: 10, windowSeconds: 300 },   // 10 attempts per 5 minutes

  // Webhooks - allow more for legitimate providers
  webhook: { limit: 100, windowSeconds: 60 }, // 100 per minute
} as const
