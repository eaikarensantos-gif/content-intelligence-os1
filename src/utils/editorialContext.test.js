import { describe, it, expect } from 'vitest'
import {
  classifyEditorialFunction,
  getCompatibleSeries,
  buildAudienceContext,
  buildPerformanceLearningContext,
  buildEditorialContext,
  buildValidationBlock,
} from './editorialContext.js'
import { EDITORIAL_SERIES } from '../data/editorialStrategy.js'

describe('classifyEditorialFunction', () => {
  it('classifica bastidor a partir de palavras de decisão/erro', () => {
    expect(classifyEditorialFunction('Como eu decidi trocar de ferramenta e onde errei')).toBe('decision_backstage')
  })

  it('classifica convivência a partir de cenas de rotina/Naomi', () => {
    expect(classifyEditorialFunction('Hoje eu e a Naomi no fim de semana em casa')).toBe('community_connection')
  })

  it('classifica utilidade a partir de linguagem de processo', () => {
    expect(classifyEditorialFunction('Passo a passo de como aplicar esse critério na prática')).toBe('practical_utility')
  })

  it('classifica leitura crítica a partir de dado/discurso/custo', () => {
    expect(classifyEditorialFunction('O discurso sobre IA esconde um dado e quem paga o custo')).toBe('critical_reading')
  })

  it('devolve null quando não há sinal nenhum', () => {
    expect(classifyEditorialFunction('')).toBe(null)
    expect(classifyEditorialFunction('xyz123')).toBe(null)
  })
})

describe('getCompatibleSeries', () => {
  it('sem função, devolve todas as séries', () => {
    expect(getCompatibleSeries(undefined)).toEqual(EDITORIAL_SERIES)
    expect(getCompatibleSeries(null)).toEqual(EDITORIAL_SERIES)
  })

  it('filtra só as séries compatíveis com a função', () => {
    const result = getCompatibleSeries('critical_reading')
    expect(result.length).toBeGreaterThan(0)
    result.forEach((s) => expect(s.compatibleFunctions).toContain('critical_reading'))
  })

  it('convivência não força compatibilidade com séries analíticas — array vazio é válido', () => {
    expect(getCompatibleSeries('community_connection')).toEqual([])
  })
})

describe('buildAudienceContext', () => {
  it('sem corte específico, ainda traz o perfil ativo', () => {
    const ctx = buildAudienceContext()
    expect(ctx).toContain('PÚBLICO ATIVO')
    expect(ctx).not.toContain('ESTE CONTEÚDO É DIRIGIDO')
  })

  it('com corte conhecido, usa o label cadastrado', () => {
    const ctx = buildAudienceContext('founder')
    expect(ctx).toContain('Founder / dona de negócio')
  })

  it('com corte desconhecido, usa o valor cru em vez de quebrar', () => {
    const ctx = buildAudienceContext('corte customizado')
    expect(ctx).toContain('corte customizado')
  })
})

describe('buildPerformanceLearningContext', () => {
  it('sem summary, devolve string vazia', () => {
    expect(buildPerformanceLearningContext(undefined)).toBe('')
    expect(buildPerformanceLearningContext(null)).toBe('')
  })

  it('amostra pequena declara sinal observado, não causalidade', () => {
    const ctx = buildPerformanceLearningContext({ sampleSize: 2, byFunction: [] })
    expect(ctx).toContain('SINAL OBSERVADO')
    expect(ctx).toContain('2')
  })

  it('amostra suficiente lista as funções com salvamento/compartilhamento por alcance', () => {
    const ctx = buildPerformanceLearningContext({
      sampleSize: 10,
      byFunction: [
        { editorial_function: 'critical_reading', count: 6, saves_per_reach: 0.12, shares_per_reach: 0.05 },
        { editorial_function: 'community_connection', count: 4, saves_per_reach: 0.02, shares_per_reach: 0.01 },
      ],
    })
    expect(ctx).toContain('Leitura crítica')
    expect(ctx).toContain('12.0% salvamento/alcance')
  })
})

describe('buildEditorialContext', () => {
  it('sem nenhum campo, ainda traz o público ativo, mas nada de função/série/briefing', () => {
    const ctx = buildEditorialContext()
    expect(ctx).toContain('PÚBLICO ATIVO')
    expect(ctx).not.toContain('FUNÇÃO EDITORIAL')
    expect(ctx).not.toContain('SÉRIE EDITORIAL')
    expect(ctx).not.toContain('BRIEFING DESTE CONTEÚDO')
    expect(buildEditorialContext()).toBe(buildEditorialContext({}))
  })

  it('monta o bloco completo quando todos os campos são dados', () => {
    const ctx = buildEditorialContext({
      editorialFunction: 'practical_utility',
      editorialSeries: 'researched_for_you',
      audienceCut: 'designer',
      observedSituation: 'Cliente perguntando qual ferramenta usar',
      evidence: 'Testei 3 ferramentas por 2 semanas',
      materialCost: 'Assinatura mensal de R$ 200',
      decisionSupported: 'Qual ferramenta assinar',
      desiredResponse: 'Comentário contando qual ferramenta a pessoa usa',
    })
    expect(ctx).toContain('FUNÇÃO EDITORIAL: UTILIDADE COM CONTEXTO')
    expect(ctx).toContain('SÉRIE EDITORIAL: Karen pesquisou para você não ter que pesquisar')
    expect(ctx).toContain('Designer')
    expect(ctx).toContain('BRIEFING DESTE CONTEÚDO')
    expect(ctx).toContain('Cliente perguntando qual ferramenta usar')
  })

  it('nunca instrui a inventar dado — o briefing sempre pede pra marcar incerteza', () => {
    const ctx = buildEditorialContext({ observedSituation: 'x' })
    expect(ctx).toContain('marque isso como incerto')
  })
})

describe('buildValidationBlock', () => {
  it('lista as 10 perguntas de validação', () => {
    const block = buildValidationBlock()
    expect((block.match(/\?/g) || []).length).toBe(10)
  })
})
