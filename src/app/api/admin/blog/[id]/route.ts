import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT /api/admin/blog/[id] — actualizar artículo completo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
  if (!adminEmails.includes(user.email ?? ''))
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json()
  const supabase = createAdminClient()

  const payload: Record<string, unknown> = {
    title:        body.title,
    slug:         body.slug,
    content:      body.content      ?? '',
    excerpt:      body.excerpt       ?? null,
    cover_image:  body.cover_image   ?? null,
    is_published: body.is_published  ?? false,
  }
  if (body.is_published && body.set_published_at) {
    payload.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PATCH /api/admin/blog/[id] — toggle publicado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()
  const update: Record<string, unknown> = { is_published: body.is_published }
  if (body.is_published) update.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('blog_posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE /api/admin/blog/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
