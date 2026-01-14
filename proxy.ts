import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { updateSession } from '@/lib/supabase-middleware';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Run Supabase Auth first to handle session refresh and protected routes
  // We pass only 'request' so it creates a default response internally.
  const supabaseResponse = await updateSession(request);

  // 2. If Supabase logic returned a redirect, we must respect it immediately.
  // The redirect response already contains the necessary Set-Cookie headers (handled in updateSession).
  if (supabaseResponse.headers.has('location')) {
    return supabaseResponse;
  }

  // 3. Run intlMiddleware to handle routing/locale
  // Note: updateSession has updated request.cookies in place, so intlMiddleware sees the fresh session if needed.
  const intlResponse = intlMiddleware(request);

  // 4. Merge cookies from supabaseResponse (which might have session refresh headers) into intlResponse
  // We iterate over all cookies in supabaseResponse and set them on intlResponse
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
