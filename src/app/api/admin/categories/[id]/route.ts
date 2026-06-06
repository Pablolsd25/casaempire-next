import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function pick(body: any) {
  const out: Record<string, any> = {}
  if (body.name !== undefined)        out.name = String(body.name).trim()
  if (body.slug !== undefined)        out.slug = slugify(String(body.slug || body.name || ''))
  if (body.description !== undefined) out.description = body.description || null
  if (body.image_url !== undefined)   out.image_url = body.image_url || null
  return out
}

// PUT /api/admin/categories/[id] — actualizar
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const body = pick(await req.json())
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('categories').update(body).eq('id', id).select().single()
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe una categoría con esa URL (slug).' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json(data)
}

// DELETE /api/admin/categories/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
