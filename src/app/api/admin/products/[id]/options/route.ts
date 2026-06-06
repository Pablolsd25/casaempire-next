import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProductOption } from '@/types'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/products/[id]/options
export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('product_options')
    .select('*, values:product_option_values(*)')
    .eq('product_id', id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data ?? [])
}

// POST /api/admin/products/[id]/options  — batch replace all options
export async function POST(req: NextRequest, { params }: Params) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const options: Omit<ProductOption, 'id' | 'product_id'>[] = await req.json()
  const supabase = createAdminClient()

  // 1. Delete all existing options (cascade deletes values)
  await supabase.from('product_options').delete().eq('product_id', id)

  if (!options || options.length === 0) {
    return NextResponse.json({ ok: true })
  }

  // 2. Insert options
  const { data: insertedOptions, error: optErr } = await supabase
    .from('product_options')
    .insert(options.map((o, i) => ({ product_id: id, name: o.name, sort_order: i })))
    .select()

  if (optErr || !insertedOptions) {
    return NextResponse.json({ error: optErr?.message ?? 'Error inserting options' }, { status: 400 })
  }

  // 3. Insert values for each option
  const allValues = options.flatMap((o, i) =>
    (o.values ?? []).map((v, j) => ({
      option_id: insertedOptions[i].id,
      value: v.value,
      sort_order: j,
    }))
  )

  if (allValues.length > 0) {
    const { error: valErr } = await supabase.from('product_option_values').insert(allValues)
    if (valErr) return NextResponse.json({ error: valErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
