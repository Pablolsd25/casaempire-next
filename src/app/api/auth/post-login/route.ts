import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/post-login?redirect=/alguna-ruta
// Redirige a /admin si el usuario es admin, o al ?redirect (default /cuenta) si no.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams, origin } = request.nextUrl
  const fallback = searchParams.get('redirect') ?? '/cuenta'

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  const dest = adminEmails.includes(user.email ?? '') ? '/admin' : fallback
  return NextResponse.redirect(new URL(dest, origin))
}
