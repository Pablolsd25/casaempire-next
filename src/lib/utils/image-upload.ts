/**
 * Utilidades para gestionar imágenes de productos en Supabase Storage
 * Bucket: 'images'  (el mismo que usa casaempire para todas las imágenes)
 */

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'images'

/**
 * Sube una imagen de producto al bucket de Supabase Storage.
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

  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${productId}_${Date.now()}.${ext}`
  const filePath = `${folder}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return publicUrl
}

/**
 * Elimina una imagen del bucket si pertenece a Supabase Storage.
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('supabase.co/storage')) return

  const supabase = createClient()
  const parts = imageUrl.split(`/storage/v1/object/public/${BUCKET}/`)
  if (parts.length < 2) return

  const filePath = parts[1].split('?')[0] // quitar query params si los hay
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) console.warn('No se pudo eliminar la imagen:', error.message)
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

  const supabase = createClient()
  const isVideo = file.type.startsWith('video/')
  const folder = isVideo ? 'videos' : 'products'
  const ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg')
  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'media'
  const filePath = `${folder}/${base}_${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(`Error subiendo archivo: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return publicUrl
}
