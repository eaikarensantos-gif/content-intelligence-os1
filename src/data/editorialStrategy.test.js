import { describe, it, expect } from 'vitest'
import {
  EDITORIAL_FUNCTIONS,
  EDITORIAL_SERIES,
  DEFAULT_EDITORIAL_MIX,
  getEditorialFunction,
  getEditorialSeries,
  CONTENT_VALIDATION_RULES,
  BLOCKING_VALIDATION_IDS,
} from './editorialStrategy.js'

describe('EDITORIAL_FUNCTIONS', () => {
  it('tem exatamente as quatro funções do master prompt, com ids estáveis', () => {
    expect(EDITORIAL_FUNCTIONS.map((f) => f.id).sort()).toEqual([
      'community_connection', 'critical_reading', 'decision_backstage', 'practical_utility',
    ])
  })

  it('cada função tem goal, structure e promptInstruction preenchidos', () => {
    EDITORIAL_FUNCTIONS.forEach((f) => {
      expect(f.goal).toBeTruthy()
      expect(f.structure.length).toBeGreaterThan(0)
      expect(f.promptInstruction).toBeTruthy()
    })
  })
})

describe('DEFAULT_EDITORIAL_MIX', () => {
  it('soma 100% e cobre as quatro funções', () => {
    const ids = EDITORIAL_FUNCTIONS.map((f) => f.id)
    expect(Object.keys(DEFAULT_EDITORIAL_MIX).sort()).toEqual([...ids].sort())
    const total = Object.values(DEFAULT_EDITORIAL_MIX).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1, 5)
  })
})

describe('EDITORIAL_SERIES', () => {
  it('tem as seis séries iniciais do master prompt', () => {
    expect(EDITORIAL_SERIES.map((s) => s.id).sort()).toEqual([
      'in_practice', 'missing_data', 'researched_for_you', 'unfinished_analysis', 'who_pays', 'worth_the_price',
    ])
  })

  it('toda série referencia apenas ids de função que existem', () => {
    const validIds = new Set(EDITORIAL_FUNCTIONS.map((f) => f.id))
    EDITORIAL_SERIES.forEach((s) => {
      s.compatibleFunctions.forEach((fid) => expect(validIds.has(fid)).toBe(true))
    })
  })
})

describe('getEditorialFunction / getEditorialSeries', () => {
  it('devolve null pra id desconhecido, sem lançar erro', () => {
    expect(getEditorialFunction('inexistente')).toBe(null)
    expect(getEditorialSeries('inexistente')).toBe(null)
    expect(getEditorialFunction(undefined)).toBe(null)
  })

  it('encontra pelo id certo', () => {
    expect(getEditorialFunction('critical_reading')?.label).toBe('Leitura crítica')
    expect(getEditorialSeries('who_pays')?.label).toBe('Quem paga essa conta')
  })
})

describe('CONTENT_VALIDATION_RULES', () => {
  it('tem as 10 perguntas do checklist', () => {
    expect(CONTENT_VALIDATION_RULES.length).toBe(10)
  })

  it('marca exatamente os itens 3, 6, 7, 8 e 10 como bloqueantes', () => {
    expect(BLOCKING_VALIDATION_IDS).toEqual([
      'judgment_not_explainer', 'not_generic_ai_account', 'unsourced_claim', 'moral_or_coach_tone', 'saturated_ai_print',
    ])
    expect(BLOCKING_VALIDATION_IDS.length).toBe(5)
  })
})
