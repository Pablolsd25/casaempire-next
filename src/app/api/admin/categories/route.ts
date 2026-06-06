import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Solo campos permitidos de la tabla categories
function pick(body: any) {
  const out: Record<string, any> = {}
  if (body.name !== undefined)        out.name = String(body.name).trim()
  if (body.slug !== undefined)        out.slug = slugify(String(body.slug || body.name || ''))
  if (body.description !== undefined) out.description = body.description || null
  if (body.image_url !== undefined)   out.image_url = body.image_url || null
  return out
}

// GET /api/admin/categories — lista con conteo de productos
export async function GET() {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*, products:products(count)')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// POST /api/admin/categories — crear
export async function POST(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const body = pick(await req.json())
  if (!body.name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  if (!body.slug) body.slug = slugify(body.name)

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('categories').insert(body).select().single()
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe una categoría con esa URL (slug).' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json(data, { status: 201 })
}
