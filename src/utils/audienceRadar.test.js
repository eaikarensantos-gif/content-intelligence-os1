import { describe, it, expect } from 'vitest'
import {
  scoreOf,
  tierOf,
  normalizeUrl,
  audienceProfileKey,
  normalizeAudienceRow,
  mergeAudienceProfiles,
  localClassifyLine,
} from './audienceRadar'

describe('scoreOf / tierOf', () => {
  it('computes a 0-100 score from the four weighted axes', () => {
    const row = { decisor: 10, fit: 10, alcance: 10, eng: 3 } // eng 3 -> mapped to 10
    expect(scoreOf(row)).toBe(100)
  })

  it('falls back to 0 when weights sum to zero', () => {
    expect(scoreOf({ decisor: 5, fit: 5, alcance: 5, eng: 1 }, { decisor: 0, fit: 0, eng: 0, alcance: 0 })).toBe(0)
  })

  it('sorts a score into the right tier by the configured cuts', () => {
    const cuts = { A: 75, B: 55, C: 35 }
    expect(tierOf(80, cuts)).toBe('A')
    expect(tierOf(60, cuts)).toBe('B')
    expect(tierOf(40, cuts)).toBe('C')
    expect(tierOf(10, cuts)).toBe('D')
  })
})

describe('normalizeUrl', () => {
  it('normalizes LinkedIn profile links regardless of casing/prefix', () => {
    expect(normalizeUrl('linkedin.com/in/Ana-Ribeiro')).toEqual({
      url: 'https://www.linkedin.com/in/ana-ribeiro/',
      origem: 'LI',
    })
  })

  it('normalizes Instagram handles written with @', () => {
    expect(normalizeUrl('@DesignDaDeb')).toEqual({
      url: 'https://www.instagram.com/designdadeb/',
      origem: 'IG',
    })
  })

  it('rejects Instagram post/reel links, not profile links', () => {
    expect(normalizeUrl('https://www.instagram.com/reel/abc123/')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(normalizeUrl('não é um link')).toBeNull()
  })
})

describe('mergeAudienceProfiles', () => {
  const base = [
    normalizeAudienceRow({
      url: 'https://www.linkedin.com/in/ana-ribeiro/',
      nome: 'Ana Ribeiro',
      decisor: 9,
      fit: 8,
      alcance: 6,
      eng: 3, // Karen já ajustou isso manualmente
      status_coleta: 'ok',
    }),
  ]

  it('adds new profiles and updates existing ones by normalized URL key, without duplicating', () => {
    const incoming = [
      { url: 'https://www.linkedin.com/in/ana-ribeiro/', nome: 'Ana Ribeiro', decisor: 10, fit: 9, alcance: 6, status_coleta: 'ok' },
      { url: 'https://www.instagram.com/juprado.oficial/', nome: 'Juliana Prado', decisor: 4, fit: 6, alcance: 10, status_coleta: 'ok' },
    ]
    const { rows, novos, atualizados } = mergeAudienceProfiles(base, incoming)
    expect(rows).toHaveLength(2)
    expect(novos).toBe(1)
    expect(atualizados).toBe(1)
  })

  it('preserves a manually-edited eng when the incoming record has no explicit eng', () => {
    const incoming = [{ url: 'https://www.linkedin.com/in/ana-ribeiro/', nome: 'Ana Ribeiro', decisor: 10, fit: 9, alcance: 6 }]
    const { rows, engMantido } = mergeAudienceProfiles(base, incoming)
    expect(rows[0].eng).toBe(3)
    expect(engMantido).toBe(1)
  })

  it('overwrites eng only when the incoming record brings an explicit valid value', () => {
    const incoming = [{ url: 'https://www.linkedin.com/in/ana-ribeiro/', nome: 'Ana Ribeiro', decisor: 10, fit: 9, alcance: 6, eng: 0 }]
    const { rows } = mergeAudienceProfiles(base, incoming)
    expect(rows[0].eng).toBe(0)
  })

  it('never persists a score field on the merged rows', () => {
    const { rows } = mergeAudienceProfiles([], [{ url: 'https://www.instagram.com/x/', nome: 'X', score: 999 }])
    expect(rows[0].score).toBeUndefined()
  })

  it('re-running the same import twice does not create duplicates', () => {
    const incoming = [{ url: 'https://www.instagram.com/juprado.oficial/', nome: 'Juliana Prado', decisor: 4, fit: 6, alcance: 10 }]
    const first = mergeAudienceProfiles([], incoming)
    const second = mergeAudienceProfiles(first.rows, incoming)
    expect(second.rows).toHaveLength(1)
    expect(second.novos).toBe(0)
    expect(second.atualizados).toBe(1)
  })
})

describe('normalizeAudienceRow', () => {
  it('never invents data — missing fields stay empty/default, never guessed', () => {
    const row = normalizeAudienceRow({ url: 'https://www.linkedin.com/in/perfil-fechado/', status_coleta: 'privado' })
    expect(row.cargo).toBe('')
    expect(row.empresa).toBe('')
    expect(row.decisor).toBe(3)
    expect(row.fit).toBe(3)
    expect(row.alcance).toBe(3)
    expect(row.status_coleta).toBe('privado')
  })

  it('clamps out-of-range axis values instead of trusting bad input', () => {
    const row = normalizeAudienceRow({ url: 'https://www.instagram.com/x/', decisor: 99, fit: -5 })
    expect(row.decisor).toBe(10)
    expect(row.fit).toBe(0)
  })
})

describe('audienceProfileKey', () => {
  it('keys profiles with a url identically regardless of trailing slash', () => {
    const a = audienceProfileKey({ url: 'https://www.instagram.com/x/' })
    const b = audienceProfileKey({ url: 'https://www.instagram.com/x' })
    expect(a).toBe(b)
  })
})

describe('localClassifyLine', () => {
  it('extracts eng tag, origin and a follower-count-based alcance from a pasted line', () => {
    const r = localClassifyLine('Ana Ribeiro | @anaribeiro | Head de Operações, varejo alimentar, 4k seg | IG | eng:3')
    expect(r.eng).toBe(3)
    expect(r.origem).toBe('IG')
    expect(r.alcance).toBe(6) // 4k -> 3k-10k bucket
    expect(r.status_coleta).toBe('manual')
  })

  it('defaults eng to 1 (passive) when no eng tag is present', () => {
    const r = localClassifyLine('Marcos Tavares | CTO na Fintech Norte | LI')
    expect(r.eng).toBe(1)
    expect(r.decisor).toBe(9) // CTO
  })
})
