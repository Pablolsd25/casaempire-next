const SUPABASE_PUBLIC = '/storage/v1/object/public/images/'

/** Extrae la ruta interna (products/foo.jpg) desde URL pública de Supabase o R2. */
export function storagePathFromUrl(url: string): string | null {
  if (!url) return null

  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '')
  if (r2Base && url.startsWith(r2Base)) {
    return url.slice(r2Base.length).replace(/^\//, '').split('?')[0] || null
  }

  const idx = url.indexOf(SUPABASE_PUBLIC)
  if (idx === -1) return null
  return url.slice(idx + SUPABASE_PUBLIC.length).split('?')[0] || null
}

export function isManagedStorageUrl(url: string): boolean {
  return storagePathFromUrl(url) !== null
}
