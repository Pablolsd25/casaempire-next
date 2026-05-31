import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/post-login?redirect=/admin
// Redirige a /admin si el usuario es admin, o a /login si no.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams, origin } = request.nextUrl
  const fallback = searchParams.get('redirect') ?? '/admin'

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(user.email ?? '')) {
    // No es admin — cerrar sesión y redirigir a login
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', origin))
  }

  return NextResponse.redirect(new URL(fallback, origin))
}
