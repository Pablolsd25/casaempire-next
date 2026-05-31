// ============================================================
// migrate-contacts.ts
// Migra los contactos del CRM de Wix → tabla contacts en Supabase
//
// Uso:
//   npm run migrate:contacts               (ejecuta)
//   npm run migrate:contacts -- --dry-run  (solo muestra, no escribe)
//   npm run migrate:contacts -- --debug    (imprime la primera respuesta cruda)
//
// Requisitos:
//   - Tabla contacts creada (aplicar supabase/migrations/20260531_contacts.sql)
//   - WIX_API_KEY con permiso "CRM - Contacts" habilitado en Wix API Keys
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Cargar .env.local ───────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const DRY_RUN    = process.argv.includes('--dry-run')
const DEBUG      = process.argv.includes('--debug')
const WIX_API_KEY  = process.env.WIX_API_KEY!
const WIX_SITE_ID  = process.env.WIX_SITE_ID  ?? '0c8e6806-c437-4a19-914b-39f9ed9284c6'
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!WIX_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno. Revisa .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const WIX_HEADERS: Record<string, string> = {
  'Content-Type':   'application/json',
  'Authorization':  WIX_API_KEY,
  'wix-site-id':    WIX_SITE_ID,
}
if (WIX_ACCOUNT_ID) WIX_HEADERS['wix-account-id'] = WIX_ACCOUNT_ID

// ─── Wix Contacts types ──────────────────────────────────────

interface WixEmailItem  { tag?: string; address?: string; primary?: boolean }
interface WixPhoneItem  { tag?: string; phone?: string;   primary?: boolean }
interface WixLabelItem  { key?: string; displayName?: string }

interface WixContactInfo {
  name?:   { first?: string; last?: string }
  emails?: { items?: WixEmailItem[] }
  phones?: { phones?: WixPhoneItem[]; items?: WixPhoneItem[] }
  labels?: { items?: WixLabelItem[] }
}

interface WixContact {
  id:           string
  info?:        WixContactInfo
  primaryInfo?: { email?: string; phone?: string }
  source?:      { sourceType?: string; appName?: string }
  createdDate?: string
}

interface WixContactsResponse {
  contacts?:      WixContact[]
  pagingMetadata?: {
    count?:   number
    offset?:  number
    total?:   number
    hasNext?: boolean
    // cursor-based fallback
    cursors?: { next?: string; prev?: string }
  }
}

// ─── Helper: extraer datos de un contacto ────────────────────

function parseContact(c: WixContact) {
  const info = c.info ?? {}

  const firstName = info.name?.first ?? null
  const lastName  = info.name?.last  ?? null

  // Email: primaryInfo primero, luego el primer item marcado primary, luego el primero
  const emailItems = info.emails?.items ?? []
  const email =
    c.primaryInfo?.email ??
    emailItems.find(e => e.primary)?.address ??
    emailItems[0]?.address ??
    null

  // Teléfono: ídem
  const phoneItems = (info.phones as { phones?: WixPhoneItem[]; items?: WixPhoneItem[] } | undefined)
  const phonesArr  = phoneItems?.items ?? phoneItems?.phones ?? []
  const phone =
    c.primaryInfo?.phone ??
    phonesArr.find(p => p.primary)?.phone ??
    phonesArr[0]?.phone ??
    null

  // Labels
  const labels = (info.labels?.items ?? [])
    .map(l => l.displayName ?? l.key ?? '')
    .filter(Boolean)

  // Source
  const source = c.source?.sourceType ?? c.source?.appName ?? null

  // Subscriber status desde extendedFields
  const extFields = (info as { extendedFields?: { items?: Record<string, string> } }).extendedFields?.items ?? {}
  const subscriberStatus = extFields['emailSubscriptions.subscriptionStatus'] ?? null

  return { firstName, lastName, email, phone, labels, source, subscriberStatus }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Migración de contactos Wix CRM → Supabase${DRY_RUN ? ' (DRY RUN)' : ''}`)
  console.log(`   Site ID: ${WIX_SITE_ID}\n`)

  let offset   = 0
  let total    = Infinity
  let inserted = 0
  let errored  = 0
  let page     = 0
  const LIMIT  = 100

  while (offset < total) {
    page++
    const body: Record<string, unknown> = {
      query: {
        paging: { limit: LIMIT, offset },
      },
    }

    const res = await fetch('https://www.wixapis.com/contacts/v4/contacts/query', {
      method:  'POST',
      headers: WIX_HEADERS,
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`❌ Error HTTP ${res.status} en página ${page}:`, text)
      if (res.status === 403) {
        console.error('\n💡 403 = la API key no tiene permiso de CRM/Contactos.')
        console.error('   Ve a Wix Dashboard → Configuración → API Keys → edita la key')
        console.error('   y habilita el permiso "CRM - Read Contacts" (o "All").')
      }
      process.exit(1)
    }

    const json = await res.json() as WixContactsResponse

    // Debug: mostrar la primera respuesta cruda
    if (DEBUG && page === 1) {
      console.log('\n🔍 Primera respuesta cruda (--debug):')
      console.log(JSON.stringify(json, null, 2).slice(0, 3000))
      console.log('\n')
    }

    const contacts = json.contacts ?? []
    const meta     = json.pagingMetadata

    if (page === 1) {
      total = meta?.total ?? 0
      console.log(`📋 Total de contactos en Wix: ${total}`)
    }

    if (contacts.length === 0) break

    console.log(`  Página ${page} (offset ${offset}): ${contacts.length} contactos...`)

    if (!DRY_RUN) {
      // Upsert en batch de 50 para reducir round-trips
      const BATCH = 50
      for (let i = 0; i < contacts.length; i += BATCH) {
        const chunk = contacts.slice(i, i + BATCH).map(c => {
          const { firstName, lastName, email, phone, labels, source, subscriberStatus } = parseContact(c)
          return {
            wix_contact_id:   c.id,
            first_name:       firstName,
            last_name:        lastName,
            email,
            phone,
            labels,
            source,
            subscriber_status: subscriberStatus,
            raw:              c,
            wix_created_date: c.createdDate ?? null,
          }
        })
        const { error } = await supabase
          .from('contacts')
          .upsert(chunk, { onConflict: 'wix_contact_id', ignoreDuplicates: false })
        if (error) {
          errored += chunk.length
          console.warn(`  ⚠️  Error en batch offset ${offset}+${i}:`, error.message)
        } else {
          inserted += chunk.length
        }
      }
    } else {
      // Dry run: solo contamos y mostramos el primer contacto de la primera página
      if (page === 1 && contacts[0]) {
        const parsed = parseContact(contacts[0])
        console.log('  Ejemplo primer contacto:')
        console.log('  ', JSON.stringify(parsed, null, 2))
      }
      inserted += contacts.length
    }

    offset += contacts.length

    // Salir si la API dice que no hay más o si ya llegamos al total
    if (!meta?.hasNext || contacts.length < LIMIT) break
  }

  console.log(`\n🎉 Completado`)
  console.log(`   ${DRY_RUN ? 'Encontrados' : 'Insertados/actualizados'}: ${inserted}`)
  if (errored > 0) console.log(`   Errores: ${errored}`)
  if (DRY_RUN) console.log('\n   Corre sin --dry-run para escribir en la base de datos.')
}

main().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
