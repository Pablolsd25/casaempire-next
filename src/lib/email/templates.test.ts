import { describe, expect, it } from 'vitest'
import { escapeHtml } from './templates'

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  it('handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('preserves safe text', () => {
    expect(escapeHtml('Hola mundo')).toBe('Hola mundo')
  })
})
