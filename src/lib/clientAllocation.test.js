import { describe, expect, it } from 'vitest'
import { allocateLegacyValue, summarizeClients } from './clientValues'

describe('transferência do valor inicial', () => {
  it.each([
    { value: '1.500,50' },
    { value: 1500.5, payment_status: 'pago' },
    { value: 1500.5, base_payments: [{ id: 'p', date: '2026-09-01', amount: 500 }] },
  ])('preserva contratado, recebido e saldo: %j', client => {
    const before = summarizeClients([client])
    const updates = allocateLegacyValue(client, '2026-09', 'Campanha', 'w')
    expect(summarizeClients([{ ...client, ...updates }])).toEqual(before)
    expect(updates.work_entries[0].month).toBe('2026-09')
    expect(client.work_entries).toBeUndefined()
    expect(() => allocateLegacyValue({ ...client, ...updates }, '2026-09', 'Campanha', 'w')).toThrow()
  })
  it('recusa valor ausente, mês inválido e recebimento superior ao contrato', () => {
    expect(() => allocateLegacyValue({ value: '' }, '2026-09', 'A', 'w')).toThrow()
    expect(() => allocateLegacyValue({ value: 100 }, '2026-13', 'A', 'w')).toThrow()
    expect(() => allocateLegacyValue({ value: 100, base_payments: [{ amount: 101 }] }, '2026-09', 'A', 'w')).toThrow()
  })
})
