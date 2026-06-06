import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const content = readFileSync('.env.local', 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    const value = trimmed.slice(eqIdx + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  loadEnv()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, total, status')

  if (error) {
    console.error('Error fetching orders:', error)
    process.exit(1)
  }

  if (!orders || orders.length === 0) {
    console.log('No hay órdenes en la base de datos.')
    process.exit(0)
  }

  const hourCount: Record<number, { count: number; total: number }> = {}
  const dayTotals: Record<number, number> = {}

  for (const order of orders) {
    const date = new Date(order.created_at)
    const hour = date.getHours()
    const day = date.getDay()

    if (!hourCount[hour]) hourCount[hour] = { count: 0, total: 0 }
    hourCount[hour].count++
    hourCount[hour].total += Number(order.total) || 0

    dayTotals[day] = (dayTotals[day] || 0) + 1
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const totalOrders = orders.length
  const maxCount = Math.max(...Object.values(hourCount).map(h => h.count))

  console.log('\n══════════════════════════════════════════════')
  console.log('   ÓRDENES POR HORA DEL DÍA')
  console.log('══════════════════════════════════════════════')
  console.log(' Hora  | Órdenes | % total | Ingreso total  | Promedio')
  console.log('───────┼─────────┼─────────┼────────────────┼──────────')

  for (let h = 0; h < 24; h++) {
    const data = hourCount[h]
    if (!data) {
      console.log(` ${String(h).padStart(2, '0')}:00 │   0     │  0.0%  │  $0.00         │  $0.00`)
      continue
    }
    const pct = ((data.count / totalOrders) * 100).toFixed(1)
    const barLen = Math.round((data.count / maxCount) * 20)
    const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen)
    const avg = data.total / data.count
    console.log(
      ` ${String(h).padStart(2, '0')}:00 │ ${String(data.count).padStart(5)}  │ ${pct.padStart(5)}% │ $${data.total.toFixed(2).padStart(12)} │ $${avg.toFixed(2).padStart(10)} ${bar}`
    )
  }

  console.log(`\n TOTAL │ ${String(totalOrders).padStart(5)}  │ 100.0% │`)

  // Ranking
  const ranked = Object.entries(hourCount)
    .map(([h, d]) => ({ hour: Number(h), ...d }))
    .sort((a, b) => b.count - a.count)

  console.log('\n══════════════════════════════════════════════')
  console.log('   TOP 5 HORAS CON MÁS ÓRDENES')
  console.log('══════════════════════════════════════════════')
  for (const r of ranked.slice(0, 5)) {
    console.log(`   ${String(r.hour).padStart(2, '0')}:00  →  ${r.count} órdenes  ($${r.total.toFixed(2)})`)
  }

  console.log('\n══════════════════════════════════════════════')
  console.log('   TOP 5 HORAS CON MENOS ÓRDENES')
  console.log('══════════════════════════════════════════════')
  for (const r of ranked.slice(-5).reverse()) {
    console.log(`   ${String(r.hour).padStart(2, '0')}:00  →  ${r.count} órdenes  ($${r.total.toFixed(2)})`)
  }

  console.log('\n══════════════════════════════════════════════')
  console.log('   POR DÍA DE LA SEMANA')
  console.log('══════════════════════════════════════════════')
  const maxDay = Math.max(...Object.values(dayTotals))
  for (let d = 0; d < 7; d++) {
    const c = dayTotals[d] || 0
    const barLen = Math.round((c / maxDay) * 20)
    console.log(`   ${dayNames[d]}: ${String(c).padStart(4)} órdenes ${'█'.repeat(barLen)}`)
  }

  // Find best low-traffic window (3+ consecutive hours)
  const sortedAsc = [...ranked].sort((a, b) => a.hour - b.hour)
  const lowHours = sortedAsc.filter(r => r.count <= 2).map(r => r.hour)
  const gaps: number[][] = []
  let current: number[] = []

  for (const h of lowHours) {
    if (current.length === 0 || h === current[current.length - 1] + 1) {
      current.push(h)
    } else {
      if (current.length >= 2) gaps.push(current)
      current = [h]
    }
  }
  if (current.length >= 2) gaps.push(current)

  // Also check windows with low activity even if not consecutive low hours
  const windowSize = 4
  let bestWindowStart = -1
  let bestWindowTotal = Infinity

  for (let h = 0; h <= 24 - windowSize; h++) {
    const total = Array.from({ length: windowSize }, (_, i) => hourCount[h + i]?.count || 0)
      .reduce((s, c) => s + c, 0)
    if (total < bestWindowTotal) {
      bestWindowTotal = total
      bestWindowStart = h
    }
  }

  console.log('\n══════════════════════════════════════════════')
  console.log('   RECOMENDACIÓN')
  console.log('══════════════════════════════════════════════')

  if (gaps.length > 0) {
    console.log('\n   Ventanas de baja actividad (≥2h consecutivas con ≤2 órdenes):')
    for (const g of gaps) {
      const totalInWindow = g.reduce((s, h) => s + (hourCount[h]?.count || 0), 0)
      console.log(`   • ${String(g[0]).padStart(2, '0')}:00 - ${String(g[g.length - 1]).padStart(2, '0')}:00  →  ${totalInWindow} órdenes`)
    }
  }

  console.log(`\n   ✅ Ventana de ${windowSize}h con menor actividad:`)
  console.log(`      ${String(bestWindowStart).padStart(2, '0')}:00 - ${String(bestWindowStart + windowSize - 1).padStart(2, '0')}:00`)
  console.log(`      (solo ${bestWindowTotal} órdenes en esas ${windowSize}h)`)

  console.log('\n══════════════════════════════════════════════')
  console.log('   RANKING COMPLETO (menos a más activas)')
  console.log('══════════════════════════════════════════════')
  const ascRanked = [...ranked].reverse()
  for (const r of ascRanked) {
    const barLen = Math.round((r.count / maxCount) * 20)
    console.log(`   ${String(r.hour).padStart(2, '0')}:00  │ ${String(r.count).padStart(3)} órdenes │ $${r.total.toFixed(2).padStart(10)} │ ${'█'.repeat(barLen)}`)
  }
}

main()
