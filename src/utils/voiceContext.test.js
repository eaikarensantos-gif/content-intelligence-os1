import { describe, it, expect } from 'vitest'
import { buildVoiceContext, buildBannedWordsBlock } from './voiceContext'

describe('buildBannedWordsBlock — bloco compartilhado por todos os geradores', () => {
  it('lista as frases banidas com a regra absoluta', () => {
    const block = buildBannedWordsBlock(['em resumo', 'no fim do dia'])
    expect(block).toMatch(/"em resumo"/)
    expect(block).toMatch(/"no fim do dia"/)
    expect(block).toMatch(/regra ABSOLUTA/)
  })

  it('devolve string vazia sem lista', () => {
    expect(buildBannedWordsBlock([])).toBe('')
    expect(buildBannedWordsBlock()).toBe('')
  })
})

describe('buildVoiceContext usa o mesmo bloco de banidas', () => {
  it('inclui as frases banidas no contexto', () => {
    const ctx = buildVoiceContext(null, [], ['em resumo'])
    expect(ctx).toMatch(/"em resumo"/)
  })

  it('sem banidas, não aparece a seção', () => {
    const ctx = buildVoiceContext(null, [], [])
    expect(ctx).not.toMatch(/PROIBIDAS/)
  })
})
