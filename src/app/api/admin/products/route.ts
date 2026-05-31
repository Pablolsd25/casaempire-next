import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/products — lista (para pickers/asignación). Soporta ?q= y ?cat=
export async function GET(req: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q   = searchParams.get('q')
  const cat = searchParams.get('cat')

  const supabase = createAdminClient()
  let query = supabase
    .from('products')
    .select('id, name, slug, price, images, category_id, is_active')
    .order('name')

  if (q)   query = query.ilike('name', `%${q}%`)
  if (cat) query = query.eq('category_id', cat)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// POST /api/admin/products — crear producto
export async function POST(req: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('products').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
