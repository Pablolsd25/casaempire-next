import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
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

// PUT /api/admin/coupons/[id] — actualizar
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const body = normalize(await req.json())
  if (!body.code) return NextResponse.json({ error: 'El código es obligatorio.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('coupons').update(body).eq('id', id).select().single()
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un cupón con ese código.' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json(data)
}

// DELETE /api/admin/coupons/[id] — eliminar
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
