/**
 * Recupera órdenes huérfanas desde cargos de OpenPay (pago sin registro en Supabase).
 *
 *   npm run recover:openpay-orders -- trgeflxu0ebodutxeadi trnsjoumnbptlytbn5e1
 *   npm run recover:openpay-orders -- --dry-run trgeflxu0ebodutxeadi
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'
import {
  recoverOrderFromOpenPayChargeId,
  syncOrderWithOpenPayCharge,
  type OpenPayCharge,
} from '../src/lib/openpay-order-recovery'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const USE_PRODUCTION = args.includes('--production')
const USE_MANUAL = args.includes('--manual')
const chargeIds = args.filter((a) => !a.startsWith('--'))

const DEFAULT_CHARGES = [
  'trgeflxu0ebodutxeadi', // NEIVY galindo — $1,250
  'trnsjoumnbptlytbn5e1', // Clemente trejo — $2,250 (16:45)
  'trjxs4nfba4mbqv8xfaq', // Clemente trejo — $2,250 (16:55)
]

/** Cargos de producción (jun 2026) cuando la API local está en sandbox. */
const MANUAL_CHARGES: OpenPayCharge[] = [
  {
    id: 'trgeflxu0ebodutxeadi',
    status: 'completed',
    amount: 1250,
    order_id: '6181eb4dac7647cd96709b9be0c233c6',
    creation_date: '2026-06-09T21:12:51-06:00',
    customer: {
      name: 'NEIVY',
      last_name: 'galindo',
      email: 'mairely.alindo04490@gmail.com',
      phone_number: '3317454602',
    },
  },
  {
    id: 'trnsjoumnbptlytbn5e1',
    status: 'completed',
    amount: 2250,
    order_id: '9f675bbf8be9472b804c27127dae2e4b',
    creation_date: '2026-06-09T16:45:22-06:00',
    customer: {
      name: 'Clemente',
      last_name: 'trejo',
      email: 'clementetrejo07@gmail.com',
      phone_number: '8681619966',
    },
  },
  {
    id: 'trjxs4nfba4mbqv8xfaq',
    status: 'completed',
    amount: 2250,
    order_id: 'e44a5be449844763aa51e68e68b0fe7a',
    creation_date: '2026-06-09T16:55:33-06:00',
    customer: {
      name: 'Clemente',
      last_name: 'trejo',
      email: 'clementetrejo07@gmail.com',
      phone_number: '8681619966',
    },
  },
]

if (USE_PRODUCTION) {
  process.env.OPENPAY_SANDBOX = 'false'
  process.env.NEXT_PUBLIC_OPENPAY_SANDBOX = 'false'
}

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  const key = t.slice(0, i).trim()
  const val = t.slice(i + 1).trim()
  if (key && !process.env[key]) process.env[key] = val
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  if (USE_MANUAL || (!USE_PRODUCTION && !chargeIds.length)) {
    const manual = USE_MANUAL
      ? MANUAL_CHARGES.filter((c) => !chargeIds.length || chargeIds.includes(c.id))
      : MANUAL_CHARGES

    console.log(`🔁 Recuperación manual (datos OpenPay)${DRY_RUN ? ' (DRY RUN)' : ''} — ${manual.length} cargo(s)`)

    for (const charge of manual) {
      if (DRY_RUN) {
        console.log(`  → ${charge.id} — ${charge.customer?.name} ${charge.customer?.last_name} — $${charge.amount}`)
        continue
      }

      const result = await syncOrderWithOpenPayCharge(supabase, charge, { fulfill: true })
      if (!result) {
        console.error(`  ✗ ${charge.id}: no recuperable`)
        continue
      }
      console.log(
        `  ✓ ${charge.id} → orden ${result.orderId} (${result.created ? 'creada' : 'existente'}, ${result.status})`
      )
    }

    console.log('\n✅ Listo.')
    return
  }

  const targets = chargeIds.length ? chargeIds : DEFAULT_CHARGES
  console.log(
    `🔁 Recuperación OpenPay API${USE_PRODUCTION ? ' (producción)' : ''}${DRY_RUN ? ' (DRY RUN)' : ''} — ${targets.length} cargo(s)`
  )

  for (const chargeId of targets) {
    if (DRY_RUN) {
      console.log(`  → ${chargeId}`)
      continue
    }

    const result = await recoverOrderFromOpenPayChargeId(supabase, chargeId, {
      fulfill: true,
    })

    if (!result.ok) {
      console.error(`  ✗ ${chargeId}: ${result.error}`)
      continue
    }

    console.log(
      `  ✓ ${chargeId} → orden ${result.orderId} (${result.created ? 'creada' : 'existente'}, ${result.status})`
    )
  }

  console.log('\n✅ Listo.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
