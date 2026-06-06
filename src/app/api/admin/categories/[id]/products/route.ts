import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/categories/[id]/products
// Body: { add?: string[], remove?: string[] }
// - add:    asigna category_id = id a esos productos
// - remove: pone category_id = null SOLO si pertenecen a esta categoría
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const { add = [], remove = [] } = await req.json().catch(() => ({}))
  const supabase = createAdminClient()

  if (Array.isArray(add) && add.length > 0) {
    const { error } = await supabase.from('products').update({ category_id: id }).in('id', add)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (Array.isArray(remove) && remove.length > 0) {
    const { error } = await supabase
      .from('products')
      .update({ category_id: null })
      .in('id', remove)
      .eq('category_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
