import { describe, it, expect } from 'vitest'
import { lintText, isClean } from './brandLinter.js'

describe('lintText', () => {
  it('flags the "o segredo de/da" mass-structure pattern', () => {
    const violations = lintText('O segredo da produtividade é simples')
    expect(violations.some((v) => v.id === 'segredo-de')).toBe(true)
  })

  it('flags the "próximo nível" pattern (with or without accents)', () => {
    expect(lintText('levar ao próximo nível').some((v) => v.id === 'proximo-nivel')).toBe(true)
    expect(lintText('levar ao proximo nivel').some((v) => v.id === 'proximo-nivel')).toBe(true)
  })

  it('returns an empty array for neutral text', () => {
    expect(lintText('Os dados de retenção mostram uma queda no segundo bloco.')).toEqual([])
  })

  it('returns an empty array for empty / non-string input', () => {
    expect(lintText('')).toEqual([])
    expect(lintText(null)).toEqual([])
    expect(lintText(undefined)).toEqual([])
  })

  it('deduplicates repeated occurrences of the same match', () => {
    const violations = lintText('O segredo da X. O segredo da X.')
    const segredo = violations.filter((v) => v.id === 'segredo-de')
    expect(segredo).toHaveLength(1)
  })

  it('applies count and bridge gates to numbered carousels', () => {
    const violations = lintText('Slide 1: Trabalhar demais vale a pena?\nSlide 2: Contexto\nSlide 7: Pense nisso.')
    expect(violations.some((v) => v.id === 'gate-contagem')).toBe(true)
    expect(violations.some((v) => v.id === 'gate-ponte')).toBe(true)
  })

  it('accepts a count question and external bridge', () => {
    const violations = lintText('Slide 1: Quantas horas do mês foram cobradas?\nSlide 2: Contexto\nSlide 7: Abra a planilha no link da bio.')
    expect(violations.some((v) => v.id.startsWith('gate-'))).toBe(false)
  })
})

describe('isClean', () => {
  it('is true when there are no violations', () => {
    expect(isClean('Uma análise direta baseada em dados.')).toBe(true)
  })

  it('is false when a violation is present', () => {
    expect(isClean('O segredo do sucesso')).toBe(false)
  })
})

