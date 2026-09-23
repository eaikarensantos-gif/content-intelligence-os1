import { describe, expect, it } from 'vitest'
import { parseClientValue, summarizeClients, clientLedgerRows } from './clientValues'

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
    expect(summarizeClients(clients)).toEqual({ total: 17000, received: 10000, outstanding: 7000, missing: 1 })
    clients.push({ value: '1.500,50' })
    clients[1].value = 8000
    expect(summarizeClients(clients)).toEqual({ total: 19500.5, received: 10000, outstanding: 9500.5, missing: 1 })
    expect(summarizeClients(clients.slice(1))).toEqual({ total: 9500.5, received: 0, outstanding: 9500.5, missing: 1 })
    expect(summarizeClients([])).toEqual({ total: 0, received: 0, outstanding: 0, missing: 0 })
  })
  it('tracks monthly work and partial receipts without changing the old value', () => {
    const client = { id: 'a', name: 'Cliente', value: '1.000,00', work_entries: [{ id: 'w', month: '2026-09', description: 'Oficina', amount: 500, payments: [{ id: 'p', date: '2026-10-02', amount: 200 }] }] }
    expect(summarizeClients([client])).toEqual({ total: 1500, received: 200, outstanding: 1300, missing: 0 })
    expect(clientLedgerRows(client).map(row => [row.month, row.amount, row.received, row.outstanding])).toEqual([['', 1000, 0, 1000], ['2026-09', 500, 200, 300]])
    client.work_entries[0].payments.push({ id: 'q', date: '2026-10-03', amount: 300 })
    expect(summarizeClients([client]).outstanding).toBe(1000)
    client.base_payments = [{ id: 'r', date: '2026-10-04', amount: 1000 }]
    expect(summarizeClients([client]).outstanding).toBe(0)
    client.work_entries = []
    expect(summarizeClients([client]).total).toBe(1000)
  })
  it('keeps an old paid flag paid while showing its missing payment date', () => {
    const client = { id: 'old', name: 'Antigo', value: 7000, payment_status: 'pago' }
    expect(summarizeClients([client])).toEqual({ total: 7000, received: 7000, outstanding: 0, missing: 0 })
    expect(clientLedgerRows(client)[0].legacyPaid).toBe(true)
    client.work_entries = [{ id: 'new', month: '2026-09', description: 'Novo trabalho', amount: 1000, payments: [] }]
    expect(summarizeClients([client]).outstanding).toBe(1000)
  })
})
