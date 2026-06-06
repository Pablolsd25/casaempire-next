import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT /api/admin/products/[id] — actualizar
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const raw = await req.json()

  // Only include columns that exist in the DB schema
  const body: Record<string, unknown> = {
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    price: raw.price,
    compare_at_price: raw.compare_at_price,
    shipping_cost: raw.shipping_cost,
    stock: raw.stock ?? 0,
    manage_stock: raw.manage_stock ?? false,
    category_id: raw.category_id,
    images: raw.images,
    videos: raw.videos,
    tags: raw.tags,
    is_active: raw.is_active,
    is_offer: raw.is_offer,
    sort_order: raw.sort_order,
  }

  // Add cost only if the column exists (avoids schema cache error)
  if (raw.cost !== undefined) body.cost = raw.cost

  const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE /api/admin/products/[id] — eliminar
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
