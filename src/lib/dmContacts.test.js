import { describe, it, expect } from 'vitest'
import { monthStartISO, contactsToCsv } from './dmContacts'

describe('monthStartISO', () => {
  it('retorna o início do mês corrente em UTC', () => {
    const now = new Date('2026-08-24T18:30:00.000Z')
    expect(monthStartISO(now)).toBe('2026-08-01T00:00:00.000Z')
  })

  it('funciona em janeiro sem estourar pro ano anterior', () => {
    const now = new Date('2026-01-15T10:00:00.000Z')
    expect(monthStartISO(now)).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('contactsToCsv', () => {
  it('gera cabeçalho e uma linha por contato', () => {
    const csv = contactsToCsv([
      {
        ig_scoped_id: '123',
        ig_username: 'fulano',
        tags: ['lead', 'quente'],
        fields: { plano: 'pro' },
        last_interaction_at: '2026-08-24T10:00:00Z',
        created_at: '2026-08-20T10:00:00Z',
      },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('ig_scoped_id,ig_username,tags,fields,last_interaction_at,created_at')
    expect(lines[1]).toBe(
      '123,fulano,lead;quente,"{""plano"":""pro""}",2026-08-24T10:00:00Z,2026-08-20T10:00:00Z'
    )
  })

  it('escapa vírgula e aspas no username', () => {
    const csv = contactsToCsv([{ ig_scoped_id: '1', ig_username: 'fulano, "o bravo"', tags: [], fields: {} }])
    expect(csv.split('\n')[1]).toContain('"fulano, ""o bravo"""')
  })

  it('lida com contato sem tags nem fields', () => {
    const csv = contactsToCsv([{ ig_scoped_id: '1', ig_username: null }])
    expect(csv.split('\n')[1]).toBe('1,,,{},,')
  })

  it('retorna só o cabeçalho pra lista vazia', () => {
    expect(contactsToCsv([])).toBe('ig_scoped_id,ig_username,tags,fields,last_interaction_at,created_at')
  })
})
