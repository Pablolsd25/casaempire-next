import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MediaItem } from '@/types'

const BUCKET = 'images'
// Carpetas conocidas a recorrer (1 nivel de profundidad cuando aplica)
const FOLDERS = ['products', 'products/description', 'blog', 'videos']
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'ogg', 'ogv']

function kindOf(name: string): 'image' | 'video' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXT.includes(ext) ? 'video' : 'image'
}

// GET /api/admin/media — lista todos los archivos del bucket en las carpetas conocidas
export async function GET() {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const supabase = createAdminClient()
  const items: MediaItem[] = []

  for (const folder of FOLDERS) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })
    if (error || !data) continue

    for (const f of data) {
      // Las "carpetas" aparecen sin id/metadata; las omitimos
      if (!f.id) continue
      const path = `${folder}/${f.name}`
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      items.push({
        path,
        name: f.name,
        folder,
        url: pub.publicUrl,
        kind: kindOf(f.name),
        size: (f.metadata?.size as number) ?? null,
        created_at: f.created_at ?? null,
      })
    }
  }

  items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return NextResponse.json(items)
}

// DELETE /api/admin/media — borra un archivo por path  { path }
export async function DELETE(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { path } = await req.json().catch(() => ({ path: '' }))
  if (!path) return NextResponse.json({ error: 'Falta el path.' }, { status: 400 })

  const allowedPrefix = FOLDERS.some((f) => path === f || path.startsWith(`${f}/`))
  if (!allowedPrefix) {
    return NextResponse.json({ error: 'Ruta no permitida.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
