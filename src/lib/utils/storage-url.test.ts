import { describe, expect, it } from 'vitest'
import { isManagedStorageUrl, storagePathFromUrl } from './storage-url'

const SUPABASE =
  'https://abc.supabase.co/storage/v1/object/public/images/products/foo.jpg'
const R2 = 'https://media.example.com/products/foo.jpg'

describe('storagePathFromUrl', () => {
  it('extrae path de URL Supabase', () => {
    expect(storagePathFromUrl(SUPABASE)).toBe('products/foo.jpg')
  })

  it('extrae path de URL R2', () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://media.example.com'
    expect(storagePathFromUrl(R2)).toBe('products/foo.jpg')
  })

  it('devuelve null para URLs externas', () => {
    expect(storagePathFromUrl('https://wix.com/img.jpg')).toBeNull()
  })
})

describe('isManagedStorageUrl', () => {
  it('detecta Supabase y R2', () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://media.example.com'
    expect(isManagedStorageUrl(SUPABASE)).toBe(true)
    expect(isManagedStorageUrl(R2)).toBe(true)
    expect(isManagedStorageUrl('https://wix.com/x.jpg')).toBe(false)
  })
})
