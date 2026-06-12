import { describe, expect, it } from 'vitest'
import {
  COMPRESS_IMAGE_ABOVE_KB,
  computeImageDimensions,
  shouldCompressImage,
} from '@/lib/utils/image-compress'

describe('shouldCompressImage', () => {
  it('skips small images', () => {
    expect(
      shouldCompressImage({
        type: 'image/jpeg',
        size: COMPRESS_IMAGE_ABOVE_KB * 1024 - 1,
      }),
    ).toBe(false)
  })

  it('compresses large jpeg', () => {
    expect(
      shouldCompressImage({
        type: 'image/jpeg',
        size: (COMPRESS_IMAGE_ABOVE_KB + 1) * 1024,
      }),
    ).toBe(true)
  })

  it('skips gif', () => {
    expect(shouldCompressImage({ type: 'image/gif', size: 5_000_000 })).toBe(false)
  })
})

describe('computeImageDimensions', () => {
  it('keeps size when under max width', () => {
    expect(computeImageDimensions(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('scales down wide images', () => {
    expect(computeImageDimensions(2400, 1200)).toEqual({ width: 1600, height: 800 })
  })
})
