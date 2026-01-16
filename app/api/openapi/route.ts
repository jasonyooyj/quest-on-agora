import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'openapi')
  if (rateLimitResponse) return rateLimitResponse
  const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml')
  const spec = await readFile(specPath, 'utf8')

  return new NextResponse(spec, {
    status: 200,
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
    },
  })
}
