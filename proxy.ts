import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase-middleware';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limiter';
import { NextRequest, NextResponse } from 'next/server';

const handleI18n = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = applyRateLimit(request, pathname);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    // For API routes, just return next() - they handle their own logic
    return NextResponse.next();
  }

  // 1. Run i18n middleware first to handle locale resolution and redirects
  const response = handleI18n(request);

  // 2. Run Supabase middleware to handle session management
  // Pass the response from i18n middleware so cookies/headers are preserved
  return await updateSession(request, response);
}

/**
 * Apply rate limiting based on route type
 * Returns NextResponse if rate limited, null otherwise
 */
function applyRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  const ip = getClientIP(request);

  // Determine rate limit config based on route
  let config: { limit: number; windowSeconds: number } = RATE_LIMITS.api;
  let identifier = `api:${ip}`;

  if (pathname.includes('/chat') || pathname.includes('/generate-topics') || pathname.includes('/extract-keypoints')) {
    // AI endpoints - most expensive, strictest limits
    config = RATE_LIMITS.ai;
    identifier = `ai:${ip}`;
  } else if (pathname.startsWith('/api/join/')) {
    // Join code attempts - prevent brute force
    config = RATE_LIMITS.join;
    identifier = `join:${ip}`;
  } else if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/register')) {
    // Auth endpoints - prevent credential stuffing
    config = RATE_LIMITS.auth;
    identifier = `auth:${ip}`;
  } else if (pathname.startsWith('/api/webhooks/')) {
    // Webhooks - allow more but still limit
    config = RATE_LIMITS.webhook;
    identifier = `webhook:${ip}`;
  }

  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }

  return null;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  // Note: Now includes /api routes for rate limiting
  matcher: ['/((?!_next|_vercel|.*\\..*).*)']
};
