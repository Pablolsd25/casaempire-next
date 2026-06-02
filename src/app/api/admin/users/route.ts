import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  checkAdminAccess,
  getAdminEmails,
  getEnvAdminEmails,
  getSessionUser,
  getStoredAdminEmails,
  isAdminEmail,
  isProtectedEnvAdmin,
  normalizeAdminEmail,
  saveStoredAdminEmails,
} from '@/lib/admin-auth'

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const target = normalizeAdminEmail(email)
  let page = 1
  const perPage = 200

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)

    const match = data.users.find(
      (u) => normalizeAdminEmail(u.email ?? '') === target
    )
    if (match) return match.id

    if (data.users.length < perPage) break
    page++
  }

  return null
}

/** GET /api/admin/users — lista de administradores */
export async function GET() {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const user = await getSessionUser()
  const admin = createAdminClient()
  const allEmails = await getAdminEmails(admin)
  const envEmails = new Set(getEnvAdminEmails())
  const current = normalizeAdminEmail(user?.email ?? '')

  const admins = await Promise.all(
    allEmails.map(async (email) => ({
      email,
      protected: envEmails.has(email),
      isSelf: email === current,
      userId: await findAuthUserIdByEmail(admin, email),
    }))
  )

  admins.sort((a, b) => a.email.localeCompare(b.email))

  return NextResponse.json({ admins })
}

/** POST /api/admin/users — crear administrador */
export async function POST(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const email = normalizeAdminEmail(body.email ?? '')
  const password = body.password ?? ''

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const existing = await getAdminEmails(admin)
  if (isAdminEmail(email, existing)) {
    return NextResponse.json({ error: 'Este correo ya es administrador.' }, { status: 409 })
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const stored = await getStoredAdminEmails(admin)
  await saveStoredAdminEmails(admin, [...stored, email])

  return NextResponse.json({ ok: true, email })
}

/** DELETE /api/admin/users — quitar administrador */
export async function DELETE(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const email = normalizeAdminEmail(body.email ?? '')
  if (!email) {
    return NextResponse.json({ error: 'Correo requerido.' }, { status: 400 })
  }

  if (isProtectedEnvAdmin(email)) {
    return NextResponse.json(
      { error: 'Este administrador está protegido (configurado en el servidor).' },
      { status: 403 }
    )
  }

  const sessionUser = await getSessionUser()
  if (normalizeAdminEmail(sessionUser?.email ?? '') === email) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta.' },
      { status: 403 }
    )
  }

  const admin = createAdminClient()
  const allEmails = await getAdminEmails(admin)
  if (!isAdminEmail(email, allEmails)) {
    return NextResponse.json({ error: 'Administrador no encontrado.' }, { status: 404 })
  }

  if (allEmails.length <= 1) {
    return NextResponse.json(
      { error: 'Debe quedar al menos un administrador.' },
      { status: 400 }
    )
  }

  const stored = await getStoredAdminEmails(admin)
  await saveStoredAdminEmails(
    admin,
    stored.filter((e) => e !== email)
  )

  const userId = await findAuthUserIdByEmail(admin, email)
  if (userId) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
