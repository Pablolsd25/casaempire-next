import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function normalize(body: any) {
  return {
    code:         String(body.code ?? '').trim().toUpperCase(),
    type:         body.type,
    value:        body.type === 'free_shipping' ? 0 : Number(body.value) || 0,
    min_purchase: Number(body.min_purchase) || 0,
    max_uses:     body.max_uses ? Number(body.max_uses) : null,
    expires_at:   body.expires_at || null,
    is_active:    body.is_active ?? true,
  }
}

// GET /api/admin/coupons — listar
export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// POST /api/admin/coupons — crear
export async function POST(req: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = normalize(await req.json())
  if (!body.code) return NextResponse.json({ error: 'El código es obligatorio.' }, { status: 400 })
  if (!['percentage', 'fixed', 'free_shipping'].includes(body.type)) {
    return NextResponse.json({ error: 'Tipo de cupón inválido.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('coupons').insert(body).select().single()
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un cupón con ese código.' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json(data, { status: 201 })
}
