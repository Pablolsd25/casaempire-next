import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAdminAccess } from '@/lib/admin-auth'

/** POST /api/admin/settings — actualiza una clave en site_settings (solo admins) */
export async function POST(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  let body: { key?: string; value?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { key, value } = body
  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: 'key y value son requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
