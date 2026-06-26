import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const R2_MEDIA_FOLDERS = [
  'products',
  'products/description',
  'blog',
  'videos',
  'categories',
  'wix-library',
] as const

const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogg', 'ogv'])

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta ${name} en variables de entorno.`)
  return v
}

function s3(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  })
}

export function r2Bucket(): string {
  return requireEnv('R2_BUCKET_NAME')
}

export function r2PublicBase(): string {
  return requireEnv('NEXT_PUBLIC_R2_PUBLIC_URL').replace(/\/$/, '')
}

/** URL pública de un objeto en R2 (misma ruta que en Supabase: products/foo.jpg) */
export function r2PublicUrl(path: string): string {
  return `${r2PublicBase()}/${path.replace(/^\//, '')}`
}

export async function r2PresignedPut(path: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: path,
    ContentType: contentType,
  })
  return getSignedUrl(s3(), cmd, { expiresIn: 600 })
}

export type R2ListedFile = {
  path: string
  name: string
  folder: string
  url: string
  kind: 'image' | 'video'
  size: number | null
  lastModified: string | null
}

function mediaKind(name: string): 'image' | 'video' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXT.has(ext) ? 'video' : 'image'
}

/** Lista archivos directos de una carpeta (un nivel, como Supabase Storage list). */
export async function r2ListFolder(folder: string): Promise<R2ListedFile[]> {
  const prefix = folder.endsWith('/') ? folder : `${folder}/`
  const { Contents } = await s3().send(
    new ListObjectsV2Command({
      Bucket: r2Bucket(),
      Prefix: prefix,
      Delimiter: '/',
    }),
  )

  return (Contents ?? [])
    .filter((o) => o.Key && o.Key !== prefix)
    .map((o) => {
      const key = o.Key!
      const name = key.slice(prefix.length)
      if (!name || name.includes('/')) return null
      return {
        path: key,
        name,
        folder,
        url: r2PublicUrl(key),
        kind: mediaKind(name),
        size: o.Size ?? null,
        lastModified: o.LastModified?.toISOString() ?? null,
      }
    })
    .filter((x): x is R2ListedFile => x !== null)
}

export async function r2Delete(path: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: path }))
}

/** Sube un buffer a R2 (scripts de migración). */
export async function r2Put(
  path: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: path,
      Body: body,
      ContentType: contentType,
    }),
  )
}
