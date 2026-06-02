import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAdminAccess } from '@/lib/admin-auth'

// POST /api/admin/blog — crear nuevo artículo
export async function POST(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

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
