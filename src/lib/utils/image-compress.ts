export const MAX_IMAGE_WIDTH = 1600
export const JPEG_QUALITY = 0.82
/** Comprimir si la imagen supera este tamaño (KB) */
export const COMPRESS_IMAGE_ABOVE_KB = 200

const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml'])

export function shouldCompressImage(file: Pick<File, 'size' | 'type'>): boolean {
  if (!file.type.startsWith('image/')) return false
  if (SKIP_TYPES.has(file.type)) return false
  return file.size > COMPRESS_IMAGE_ABOVE_KB * 1024
}

export function computeImageDimensions(
  width: number,
  height: number,
  maxWidth = MAX_IMAGE_WIDTH,
): { width: number; height: number } {
  if (width <= maxWidth) return { width, height }
  const scale = maxWidth / width
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

/**
 * Comprime imágenes en el navegador antes de subir a Storage.
 * GIF/SVG pasan sin cambio. Salida JPEG salvo si ya es liviana.
 */
export async function compressImageForWeb(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<File> {
  if (!shouldCompressImage(file)) return file

  onProgress?.(10)

  const bitmap = await createImageBitmap(file)
  const { width, height } = computeImageDimensions(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  onProgress?.(60)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
  })

  if (!blob) return file

  onProgress?.(100)

  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
