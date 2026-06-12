import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const MAX_INPUT_MB = 500
const COMPRESS_ABOVE_MB = 5
const TARGET_MAX_MB = 45

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoading: Promise<FFmpeg> | null = null

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoading) return ffmpegLoading

  ffmpegLoading = (async () => {
    const ffmpeg = new FFmpeg()
    const base = `${window.location.origin}/ffmpeg`
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  return ffmpegLoading
}

function extFromType(type: string): string {
  if (type.includes('webm')) return 'webm'
  if (type.includes('quicktime')) return 'mov'
  return 'mp4'
}

export function shouldCompressVideo(file: File): boolean {
  return file.size > COMPRESS_ABOVE_MB * 1024 * 1024
}

export function validateHomeVideoInput(file: File): void {
  const valid = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
  if (!valid.includes(file.type)) {
    throw new Error('Formato no válido. Usa MP4, WebM o MOV.')
  }
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`El video no puede superar ${MAX_INPUT_MB} MB.`)
  }
}

export async function compressVideoForWeb(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<File> {
  validateHomeVideoInput(file)

  if (!shouldCompressVideo(file)) {
    return file
  }

  const ffmpeg = await getFfmpeg()

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress && Number.isFinite(progress)) {
      onProgress(Math.min(99, Math.round(progress * 100)))
    }
  })

  const inputExt = extFromType(file.type)
  const inputName = `input.${inputExt}`
  const outputName = 'output.mp4'

  await ffmpeg.writeFile(inputName, await fetchFile(file))
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', "scale='min(720,iw)':-2",
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '30',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-y',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'video/mp4' })

  await ffmpeg.deleteFile(inputName).catch(() => {})
  await ffmpeg.deleteFile(outputName).catch(() => {})

  if (blob.size > TARGET_MAX_MB * 1024 * 1024) {
    throw new Error(
      `Tras comprimir el video sigue pesando más de ${TARGET_MAX_MB} MB. ` +
        'Prueba con un clip más corto o exporta en menor calidad desde tu editor.',
    )
  }

  onProgress?.(100)

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'video'
  return new File([blob], `${baseName}-web.mp4`, { type: 'video/mp4' })
}
