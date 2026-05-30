import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/blog — crear nuevo artículo
export async function POST(req: NextRequest) {
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
  if (body.is_published) payload.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
