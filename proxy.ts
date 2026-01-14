import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase-middleware';
import { NextRequest, NextResponse } from 'next/server';

const handleI18n = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Run i18n middleware first to handle locale resolution and redirects
  const response = handleI18n(request);

  // 2. Run Supabase middleware to handle session management
  // Pass the response from i18n middleware so cookies/headers are preserved
  return await updateSession(request, response);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
