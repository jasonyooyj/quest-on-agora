/**
 * Shared utility helpers.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


/**
 * Merge class names with tailwind-aware conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve the current app base URL with a trailing slash.
 */
export function getURL() {
  // On client-side, always use the current origin to avoid redirect issues
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return origin.charAt(origin.length - 1) === '/' ? origin : `${origin}/`
  }

  // Server-side: use environment variables
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'

  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`

  // Make sure to include trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`

  return url
}

/**
 * Sanitize search input to prevent SQL injection in PostgREST LIKE patterns.
 * Escapes special characters used in LIKE patterns.
 *
 * Use this for .ilike() method calls.
 */
export function sanitizeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape LIKE wildcards
    .replace(/_/g, '\\_')    // Escape single-char wildcards
}

/**
 * Sanitize search input for PostgREST .or() filter strings.
 * Escapes LIKE pattern chars and removes filter syntax characters.
 *
 * Use this for .or() method calls with ilike filters.
 */
export function sanitizeOrFilter(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape LIKE wildcards
    .replace(/_/g, '\\_')    // Escape single-char wildcards
    .replace(/,/g, '')       // Remove commas (or() separator)
    .replace(/\./g, '')      // Remove dots (filter syntax)
    .replace(/\(/g, '')      // Remove parentheses
    .replace(/\)/g, '')
}
