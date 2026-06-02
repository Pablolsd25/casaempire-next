import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminEmails, isAdminEmail } from '@/lib/admin-auth'

function safeRedirectPath(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/admin'
  return path
}

function requiresAdminAccess(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/')
}

// GET /api/auth/post-login?redirect=/admin
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams, origin } = request.nextUrl
  const destination = safeRedirectPath(searchParams.get('redirect'))

  if (!user) {
    const login = new URL('/login', origin)
    login.searchParams.set('redirect', destination)
    login.searchParams.set('error', 'session')
    return NextResponse.redirect(login)
  }

  if (requiresAdminAccess(destination)) {
    const adminEmails = await getAdminEmails(createAdminClient())

    if (!isAdminEmail(user.email ?? '', adminEmails)) {
      await supabase.auth.signOut()
      const login = new URL('/login', origin)
      login.searchParams.set('redirect', destination)
      login.searchParams.set('error', 'no_access')
      return NextResponse.redirect(login)
    }
  }

  return NextResponse.redirect(new URL(destination, origin))
}
