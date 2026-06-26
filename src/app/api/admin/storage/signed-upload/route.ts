import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { r2PresignedPut, r2PublicUrl } from '@/lib/r2'

const ALLOWED_PREFIXES = ['videos/', 'products/', 'products/description/', 'blog/']

/** POST /api/admin/storage/signed-upload — URL firmada para subir a R2 */
export async function POST(req: NextRequest) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const path = typeof body.path === 'string' ? body.path.trim() : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType : 'application/octet-stream'

  if (!path) {
    return NextResponse.json({ error: 'Falta el path.' }, { status: 400 })
  }

  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.json({ error: 'Ruta no permitida.' }, { status: 400 })
  }

  try {
    const signedUrl = await r2PresignedPut(path, contentType)
    return NextResponse.json({
      signedUrl,
      path,
      publicUrl: r2PublicUrl(path),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo crear la URL de subida.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
