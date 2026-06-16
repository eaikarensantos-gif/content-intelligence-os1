import { describe, it, expect } from 'vitest'
import { normalizeDate } from './csvNormalizer.js'

describe('normalizeDate', () => {
  it('passes through ISO dates (with or without time)', () => {
    expect(normalizeDate('2026-03-01')).toBe('2026-03-01')
    expect(normalizeDate('2026-03-01T16:52:00')).toBe('2026-03-01')
  })

  it('parses Portuguese dates with abbreviated, accented or spelled-out months', () => {
    expect(normalizeDate('20 mar. 2025 16:52')).toBe('2025-03-20')
    expect(normalizeDate('1 de janeiro de 2026')).toBe('2026-01-01')
    expect(normalizeDate('1 de março de 2026')).toBe('2026-03-01')
  })

  it('parses DD/MM/YYYY when the first number is clearly a day', () => {
    expect(normalizeDate('25/03/2026')).toBe('2026-03-25')
  })

  it('parses MM/DD/YYYY when the second number is clearly a day', () => {
    expect(normalizeDate('03/25/2026')).toBe('2026-03-25')
  })

  it('assumes DD/MM/YYYY (brazilian) for ambiguous dates', () => {
    expect(normalizeDate('05/03/2026')).toBe('2026-03-05')
  })

  it('accepts - and . as separators', () => {
    expect(normalizeDate('25-03-2026')).toBe('2026-03-25')
    expect(normalizeDate('25.03.2026')).toBe('2026-03-25')
  })

  it('converts Google Sheets serial numbers to ISO dates', () => {
    expect(normalizeDate('40000')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns empty string for blank or unparseable input', () => {
    expect(normalizeDate('')).toBe('')
    expect(normalizeDate('   ')).toBe('')
    expect(normalizeDate('não é uma data')).toBe('')
  })
})
