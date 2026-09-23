import { describe, expect, it } from 'vitest'
import { parseClientValue, summarizeClients } from './clientValues'

describe('client values', () => {
  it('accepts persisted numbers and Brazilian money', () => {
    for (const input of [1500.5, '1500.50', '1.500,50', 'R$ 1.500,50', '1500,50']) {
      expect(parseClientValue(input)).toBe(1500.5)
    }
    expect(parseClientValue('10.000')).toBe(10000)
  })
  it('distinguishes zero from absent or invalid values', () => {
    expect(parseClientValue(0)).toBe(0)
    expect(parseClientValue('0')).toBe(0)
    for (const input of ['', null, undefined, 'abc', '-10', '1,2,3', Infinity]) {
      expect(parseClientValue(input)).toBe(null)
    }
  })
  it('recomputes totals after adds, edits and removals without payment filtering', () => {
    const clients = [{ value: '10.000', payment_status: 'pago' }, { value: 7000 }, { value: '' }, { value: 0 }]
    expect(summarizeClients(clients)).toEqual({ total: 17000, missing: 1 })
    clients.push({ value: '1.500,50' })
    clients[1].value = 8000
    expect(summarizeClients(clients)).toEqual({ total: 19500.5, missing: 1 })
    expect(summarizeClients(clients.slice(1))).toEqual({ total: 9500.5, missing: 1 })
    expect(summarizeClients([])).toEqual({ total: 0, missing: 0 })
  })
})
