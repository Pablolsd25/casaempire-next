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

import { createClient } from '@supabase/supabase-js'

const ADMINS = [
  'contacto@casaempire.net',
  'marci_bun@hotmail.com',
]

const PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? ''

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

  const normalized = ADMINS.map((e) => e.trim().toLowerCase())

  for (const email of normalized) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })

    if (createError) {
      if (createError.message.toLowerCase().includes('already')) {
        const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        const existing = list?.users.find(
          (u) => (u.email ?? '').toLowerCase() === email
        )
        if (existing) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existing.id,
            { password: PASSWORD, email_confirm: true }
          )
          if (updateError) {
            console.error(`✗ ${email}: ${updateError.message}`)
            continue
          }
          console.log(`↻ ${email}: contraseña actualizada`)
        } else {
          console.error(`✗ ${email}: ${createError.message}`)
        }
      } else {
        console.error(`✗ ${email}: ${createError.message}`)
      }
    } else {
      console.log(`✓ ${email}: creado (${created.user?.id})`)
    }
  }

  const { error: settingsError } = await supabase.from('site_settings').upsert({
    key: 'admin_emails',
    value: JSON.stringify(normalized),
    updated_at: new Date().toISOString(),
  })

  if (settingsError) {
    console.error('Error guardando admin_emails:', settingsError.message)
    process.exit(1)
  }

  console.log('\n✓ admin_emails guardado en site_settings:', normalized.join(', '))
  console.log('Los nuevos admins se agregan desde el panel: Admin → Usuarios')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
