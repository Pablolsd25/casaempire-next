import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminEmails, isAdminEmail } from '@/lib/admin-auth'

/** GET /api/auth/me — info de sesión del lado del cliente */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ loggedIn: false })
  }

  const email = user.email ?? ''
  const profileName = user.user_metadata?.full_name as string | undefined
  const adminEmails = await getAdminEmails(createAdminClient())

  return NextResponse.json({
    loggedIn: true,
    name:     profileName ?? email.split('@')[0] ?? 'Usuario',
    isAdmin:  isAdminEmail(email, adminEmails),
    email,
  })
}
