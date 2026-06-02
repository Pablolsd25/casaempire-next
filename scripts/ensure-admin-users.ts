/**
 * Crea o actualiza administradores en Supabase Auth y los registra en site_settings.
 *
 * Uso (producción o local):
 *   ADMIN_SEED_PASSWORD='CasaEmpire2024!' npx tsx scripts/ensure-admin-users.ts
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_ADMINS = [
  'contacto@casaempire.net',
  'marci_bun@hotmail.com',
  'pablot_comercial.alamo@hotmail.com',
]

const PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? ''

function normalize(email: string) {
  return email.trim().toLowerCase()
}

async function findUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const target = normalize(email)
  let page = 1
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((u) => normalize(u.email ?? '') === target)
    if (match) return match.id
    if (data.users.length < 200) break
    page++
  }
  return null
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!PASSWORD || PASSWORD.length < 6) {
    console.error('Define ADMIN_SEED_PASSWORD (mín. 6 caracteres)')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalized = DEFAULT_ADMINS.map(normalize)

  for (const email of normalized) {
    const userId = await findUserIdByEmail(supabase, email)

    if (userId) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        email_confirm: true,
      })
      if (updateError) {
        console.error(`✗ ${email}: ${updateError.message}`)
        continue
      }
      console.log(`↻ ${email}: contraseña actualizada y correo confirmado`)
      continue
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })

    if (createError) {
      console.error(`✗ ${email}: ${createError.message}`)
    } else {
      console.log(`✓ ${email}: creado (${created.user?.id})`)
    }
  }

  const { data: existing } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'admin_emails')
    .maybeSingle()

  let stored: string[] = []
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value) as unknown
      if (Array.isArray(parsed)) {
        stored = parsed.filter((e): e is string => typeof e === 'string').map(normalize)
      }
    } catch {
      /* ignore */
    }
  }

  const merged = [...new Set([...stored, ...normalized])]

  const { error: settingsError } = await supabase.from('site_settings').upsert({
    key: 'admin_emails',
    value: JSON.stringify(merged),
    updated_at: new Date().toISOString(),
  })

  if (settingsError) {
    console.error('Error guardando admin_emails:', settingsError.message)
    process.exit(1)
  }

  console.log('\n✓ admin_emails:', merged.join(', '))
  console.log('Prueba login en /login?redirect=/admin con la contraseña de ADMIN_SEED_PASSWORD')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
