const PUBLIC_PREFIX = '/storage/v1/object/public/images/'
const RENDER_PREFIX = '/storage/v1/render/image/public/images/'

export type SupabaseImageOptions = {
  width?: number
  quality?: number
}

/** Convierte URL pública de Supabase Storage a render/transform URL. URLs no-Supabase pasan sin cambio. */
export function supabaseImageUrl(url: string, opts?: SupabaseImageOptions): string {
  if (!opts?.width || !url.includes('supabase.co') || !url.includes(PUBLIC_PREFIX)) {
    return url
  }

  const renderUrl = url.replace(PUBLIC_PREFIX, RENDER_PREFIX)
  const params = new URLSearchParams()
  params.set('width', String(opts.width))
  params.set('quality', String(opts.quality ?? 75))
  return `${renderUrl}?${params.toString()}`
}

/** Imagen de grilla (~400px card) */
export function productCardImageUrl(url: string): string {
  return supabaseImageUrl(url, { width: 600, quality: 75 })
}

/** Imagen principal de detalle */
export function productDetailImageUrl(url: string): string {
  return supabaseImageUrl(url, { width: 1200, quality: 80 })
}

/** Thumbnail de galería (72px display × 2 retina) */
export function productThumbImageUrl(url: string): string {
  return supabaseImageUrl(url, { width: 144, quality: 70 })
}
