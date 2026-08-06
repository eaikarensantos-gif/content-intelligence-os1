import { describe, it, expect } from 'vitest'
import { buildVoiceContext, buildBannedWordsBlock, buildPositioningBlock } from './voiceContext'

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

describe('buildPositioningBlock — âncora, públicos, pilares, teste de coerência', () => {
  it('devolve string vazia sem posicionamento', () => {
    expect(buildPositioningBlock(null)).toBe('')
    expect(buildPositioningBlock(undefined)).toBe('')
  })

  it('devolve string vazia com posicionamento vazio', () => {
    const block = buildPositioningBlock({
      ancora: '', publicos: [], concorrencia_espaco_vago: '', pilares: [], trade_off: '', teste_coerencia: '',
    })
    expect(block).toBe('')
  })

  it('inclui a âncora', () => {
    const block = buildPositioningBlock({ ancora: 'IA aplicada ao negócio, não hype de ferramenta.' })
    expect(block).toMatch(/ÂNCORA/)
    expect(block).toMatch(/IA aplicada ao negócio/)
  })

  it('inclui os públicos com o papel traduzido', () => {
    const block = buildPositioningBlock({
      publicos: [
        { nome: 'Founder', papel: 'nucleo', descricao: 'ticket alto' },
        { nome: 'Profissional tech', papel: 'topo-funil', descricao: '' },
      ],
    })
    expect(block).toMatch(/Founder \(núcleo\): ticket alto/)
    expect(block).toMatch(/Profissional tech \(topo de funil\)/)
  })

  it('inclui os pilares com objetivo e gancho típico', () => {
    const block = buildPositioningBlock({
      pilares: [{ nome: 'Critério de decisão', objetivo: 'mostrar lógica', gancho_tipico: 'contrario' }],
    })
    expect(block).toMatch(/Critério de decisão/)
    expect(block).toMatch(/objetivo: mostrar lógica/)
    expect(block).toMatch(/gancho típico: contrario/)
  })

  it('inclui o teste de coerência como pergunta obrigatória', () => {
    const block = buildPositioningBlock({ teste_coerencia: 'Isso aumenta ou dilui a associação central?' })
    expect(block).toMatch(/TESTE DE COERÊNCIA/)
    expect(block).toMatch(/Isso aumenta ou dilui a associação central\?/)
  })
})

describe('buildVoiceContext inclui o bloco de posicionamento quando passado', () => {
  it('injeta âncora e teste de coerência no contexto final', () => {
    const ctx = buildVoiceContext(null, [], [], {
      ancora: 'Estrategista de IA com critério de negócio.',
      teste_coerencia: 'Aumenta ou dilui a associação central?',
    })
    expect(ctx).toMatch(/Estrategista de IA com critério de negócio\./)
    expect(ctx).toMatch(/Aumenta ou dilui a associação central\?/)
  })

  it('sem posicionamento, não quebra e não aparece a seção', () => {
    const ctx = buildVoiceContext(null, [], ['x'])
    expect(ctx).not.toMatch(/ÂNCORA/)
  })
})
