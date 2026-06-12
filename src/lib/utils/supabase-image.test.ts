import { describe, expect, it } from 'vitest'
import {
  productCardImageUrl,
  productDetailImageUrl,
  productThumbImageUrl,
  supabaseImageUrl,
} from '@/lib/utils/supabase-image'

const SUPABASE_IMG =
  'https://abc.supabase.co/storage/v1/object/public/images/products/foo.jpg'

describe('supabaseImageUrl', () => {
  it('transforms Supabase public URLs', () => {
    expect(supabaseImageUrl(SUPABASE_IMG, { width: 600 })).toBe(
      'https://abc.supabase.co/storage/v1/render/image/public/images/products/foo.jpg?width=600&quality=75',
    )
  })

  it('passes through non-Supabase URLs', () => {
    const wix = 'https://static.wixstatic.com/media/foo.jpg'
    expect(supabaseImageUrl(wix, { width: 600 })).toBe(wix)
  })

  it('passes through when no width', () => {
    expect(supabaseImageUrl(SUPABASE_IMG)).toBe(SUPABASE_IMG)
  })

  it('product helpers use expected widths', () => {
    expect(productCardImageUrl(SUPABASE_IMG)).toContain('width=600')
    expect(productDetailImageUrl(SUPABASE_IMG)).toContain('width=1200')
    expect(productThumbImageUrl(SUPABASE_IMG)).toContain('width=144')
  })
})
