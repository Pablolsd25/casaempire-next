/**
 * Utilidades para subir/borrar media en Cloudflare R2.
 */

import { uploadFileViaAdminSignedUrl } from '@/lib/utils/admin-storage-upload'
import { isManagedStorageUrl, storagePathFromUrl } from '@/lib/utils/storage-url'
import { compressImageForWeb } from '@/lib/utils/image-compress'
import { compressVideoForWeb, validateHomeVideoInput } from '@/lib/utils/video-compress'

/**
 * Sube una imagen de producto a R2.
 * @param file - Archivo a subir
 * @param productId - ID o slug del producto (para el nombre del archivo)
 * @param folder - Subcarpeta dentro del bucket (default: 'products')
 * @returns URL pública de la imagen
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  folder: 'products' | 'products/description' = 'products',
): Promise<string> {
  validateImageFile(file)

  const prepared = await compressImageForWeb(file)
  const ext =
    prepared.type === 'image/jpeg'
      ? 'jpg'
      : (prepared.name.split('.').pop() ?? 'jpg')
  const fileName = `${productId}_${Date.now()}.${ext}`
  const filePath = `${folder}/${fileName}`

  return uploadFileViaAdminSignedUrl(prepared, filePath, prepared.type || 'image/jpeg')
}

/** Elimina un archivo de R2 vía API admin (credenciales solo en servidor). */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  if (!isManagedStorageUrl(imageUrl)) return
  const filePath = storagePathFromUrl(imageUrl)
  if (!filePath) return

  const res = await fetch('/api/admin/media', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.warn('No se pudo eliminar la imagen:', data.error ?? res.status)
  }
}

/**
 * Valida tipo y tamaño del archivo.
 */
export function validateImageFile(file: File, maxSizeMB = 5): void {
  const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!valid.includes(file.type)) {
    throw new Error('Formato no válido. Usa JPG, PNG, WebP o GIF.')
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`La imagen no puede superar ${maxSizeMB} MB.`)
  }
}

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']

/**
 * Valida un archivo de media (imagen o video) para la galería.
 */
export function validateMediaFile(file: File): void {
  const isImage = file.type.startsWith('image/')
  const isVideo = VIDEO_TYPES.includes(file.type)
  if (!isImage && !isVideo) {
    throw new Error('Formato no válido. Sube una imagen o un video (MP4, WebM, MOV).')
  }
  const maxMB = isVideo ? 50 : 5
  if (file.size > maxMB * 1024 * 1024) {
    throw new Error(`El archivo no puede superar ${maxMB} MB.`)
  }
}

/**
 * Sube un archivo de media (imagen o video) a la galería.
 * Imágenes → carpeta `products`, videos → carpeta `videos`.
 * @returns URL pública
 */
export async function uploadMediaFile(file: File): Promise<string> {
  validateMediaFile(file)

  const isVideo = file.type.startsWith('video/')
  const folder = isVideo ? 'videos' : 'products'

  let prepared: File = file
  if (isVideo) {
    validateHomeVideoInput(file)
    prepared = await compressVideoForWeb(file)
  } else {
    prepared = await compressImageForWeb(file)
  }

  const ext =
    prepared.type === 'image/jpeg'
      ? 'jpg'
      : prepared.type === 'video/mp4'
        ? 'mp4'
        : (prepared.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg'))
  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'media'
  const filePath = `${folder}/${base}_${Date.now()}.${ext}`
  const contentType = prepared.type || (isVideo ? 'video/mp4' : 'image/jpeg')

  return uploadFileViaAdminSignedUrl(prepared, filePath, contentType)
}
