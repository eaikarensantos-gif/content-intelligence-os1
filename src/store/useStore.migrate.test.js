import { describe, it, expect } from 'vitest'
import { migratePosicionamento } from './useStore'

describe('migratePosicionamento — bannedWords + bannedPhrases viram posicionamento.lista_negra', () => {
  it('funde as duas listas antigas em lista_negra, sem duplicar', () => {
    const out = migratePosicionamento({
      bannedWords: ['em resumo', 'no fim do dia'],
      bannedPhrases: ['Você já sentiu que...'],
    })
    expect(out.posicionamento.lista_negra).toEqual([
      'em resumo', 'no fim do dia', 'Você já sentiu que...',
    ])
  })

  it('não perde nenhuma frase quando as listas se sobrepõem (case-insensitive)', () => {
    const out = migratePosicionamento({
      bannedWords: ['Em Resumo'],
      bannedPhrases: ['em resumo', 'outra frase'],
    })
    expect(out.posicionamento.lista_negra).toEqual(['Em Resumo', 'outra frase'])
  })

  it('remove os campos antigos depois de migrar, pra não sobrarem soltos no estado', () => {
    const out = migratePosicionamento({ bannedWords: ['x'], bannedPhrases: ['y'] })
    expect(out.bannedWords).toBeUndefined()
    expect(out.bannedPhrases).toBeUndefined()
  })

  it('semeia diretriz_marca a partir do brandVoice.prompt existente', () => {
    const out = migratePosicionamento({ brandVoice: { prompt: 'Tom sênior, direto, sem clichê.' } })
    expect(out.posicionamento.diretriz_marca).toBe('Tom sênior, direto, sem clichê.')
  })

  it('não quebra em estado vazio (instalação nova, sem dado nenhum)', () => {
    expect(() => migratePosicionamento(undefined)).not.toThrow()
    expect(() => migratePosicionamento({})).not.toThrow()
    const out = migratePosicionamento({})
    expect(out.posicionamento.lista_negra).toEqual([])
    expect(out.posicionamento.diretriz_marca).toBe('')
  })

  it('é idempotente — não reprocessa se posicionamento já existe', () => {
    const already = { posicionamento: { lista_negra: ['já migrado'] } }
    const out = migratePosicionamento(already)
    expect(out.posicionamento.lista_negra).toEqual(['já migrado'])
  })

  it('preserva o restante do estado intocado (ideias, posts, etc.)', () => {
    const out = migratePosicionamento({
      ideas: [{ id: '1', title: 'Ideia real' }],
      bannedWords: ['x'],
    })
    expect(out.ideas).toEqual([{ id: '1', title: 'Ideia real' }])
  })
})
