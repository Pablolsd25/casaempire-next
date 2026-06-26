import { uploadFileViaAdminSignedUrl } from '@/lib/utils/admin-storage-upload'
import { compressVideoForWeb, validateHomeVideoInput } from '@/lib/utils/video-compress'

export type HomeVideoUploadProgress = {
  phase: 'validating' | 'compressing' | 'uploading'
  percent?: number
}

/**
 * Sube un video de portada/showcase: comprime automáticamente si es pesado
 * para que cargue rápido en la web.
 */
export async function uploadHomeVideoFile(
  file: File,
  onProgress?: (progress: HomeVideoUploadProgress) => void,
): Promise<string> {
  validateHomeVideoInput(file)

  onProgress?.({ phase: 'validating' })

  const prepared = await compressVideoForWeb(file, (percent) => {
    onProgress?.({ phase: 'compressing', percent })
  })

  onProgress?.({ phase: 'uploading' })

  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'home-video'
  const filePath = `videos/${base}_${Date.now()}.mp4`

  return uploadFileViaAdminSignedUrl(prepared, filePath, 'video/mp4')
}
