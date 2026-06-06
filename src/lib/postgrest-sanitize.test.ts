import { describe, expect, it } from 'vitest'
import { buildIlikeOrFilter, escapePostgrestFilter } from './postgrest-sanitize'

describe('escapePostgrestFilter', () => {
  it('escapes PostgREST syntax characters', () => {
    expect(escapePostgrestFilter('test,id.eq.1')).toBe('test\\,id\\.eq\\.1')
    expect(escapePostgrestFilter('(foo)')).toBe('\\(foo\\)')
  })
})

describe('buildIlikeOrFilter', () => {
  it('builds safe or filter for multiple columns', () => {
    expect(buildIlikeOrFilter(['name', 'description'], 'zapato')).toBe(
      'name.ilike.%zapato%,description.ilike.%zapato%'
    )
  })

  it('escapes malicious input in filter', () => {
    const filter = buildIlikeOrFilter(['name'], '%,id.eq.')
    expect(filter).toBe('name.ilike.%%\\,id\\.eq\\.%')
  })
})
