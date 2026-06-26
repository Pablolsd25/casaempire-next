import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { R2_MEDIA_FOLDERS, r2Delete, r2ListFolder } from '@/lib/r2'
import type { MediaItem } from '@/types'

const FOLDERS = R2_MEDIA_FOLDERS.filter((f) =>
  ['products', 'products/description', 'blog', 'videos'].includes(f),
)

// GET /api/admin/media — lista archivos en R2
export async function GET() {
  const denied = await checkAdminAccess()
  if (denied) return denied

  try {
    const items: MediaItem[] = []
    for (const folder of FOLDERS) {
      const files = await r2ListFolder(folder)
      for (const f of files) {
        items.push({
          path: f.path,
          name: f.name,
          folder: f.folder,
          url: f.url,
          kind: f.kind,
          size: f.size,
          created_at: f.lastModified,
        })
      }
    }

    items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    return NextResponse.json(items)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error listando media.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
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

  try {
    await r2Delete(path)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al borrar.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
