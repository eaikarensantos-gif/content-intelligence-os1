import { describe, it, expect } from 'vitest'
import {
  sweepText,
  sweepSlides,
  splitSlides,
  sweepResult,
  blockingFindings,
  countBlocks,
} from './clicheSweep'

const ids = (hits) => hits.map((h) => h.id)

describe('sweepText — junta as duas camadas de detecção', () => {
  it('pega estrutura proibida (clicheDetector)', () => {
    const { blocks } = sweepText('Não é sobre talento, é sobre método.')
    expect(blocks.length).toBeGreaterThan(0)
  })

  it('pega frase de massa que só o brandLinter conhece', () => {
    const { blocks } = sweepText('O segredo da precificação que ninguém te conta')
    expect(ids(blocks)).toContain('segredo-de')
    expect(ids(blocks)).toContain('ninguem-te-conta')
  })

  it('junta as duas fontes no mesmo texto', () => {
    const { blocks } = sweepText('A verdade é que não é falta de talento. É falta de método.')
    expect(ids(blocks)).toContain('a-verdade-e')          // linter
    expect(ids(blocks)).toContain('contraste-corretivo')  // detector
  })

  it('não acusa texto limpo', () => {
    const { blocks } = sweepText('Cobrei R$ 4.000 por um escopo que levou 12 horas. O cliente aprovou na primeira call.')
    expect(blocks).toEqual([])
  })

  it('trata entrada vazia', () => {
    expect(sweepText('').blocks).toEqual([])
    expect(sweepText(null).blocks).toEqual([])
    expect(sweepText(undefined).warns).toEqual([])
  })

  it('não repete a mesma ocorrência', () => {
    const { blocks } = sweepText('O segredo da coisa. O segredo da coisa.')
    expect(blocks.filter((b) => b.id === 'segredo-de')).toHaveLength(1)
  })

  it('isClosing=false desliga a regra de fechamento em pergunta', () => {
    const titulo = 'Quanto custa a sua hora?'
    expect(ids(sweepText(titulo).blocks)).toContain('fechamento-pergunta')
    expect(ids(sweepText(titulo, { isClosing: false }).blocks)).not.toContain('fechamento-pergunta')
  })
})

describe('splitSlides', () => {
  it('separa slides marcados', () => {
    const slides = splitSlides('Slide 1: abertura\ncom segunda linha\nSlide 2: meio\nSlide 3: fim')
    expect(slides).toHaveLength(3)
    expect(slides[0].label).toBe('Slide 1')
    expect(slides[0].text).toContain('com segunda linha')
  })

  it('aceita outras marcações', () => {
    expect(splitSlides('Card 1 - um\nCard 2 - dois')).toHaveLength(2)
    expect(splitSlides('SLIDE 1: um\nSLIDE 2: dois')).toHaveLength(2)
  })

  it('texto sem marcação vira um bloco só', () => {
    const slides = splitSlides('um parágrafo qualquer\ne outro')
    expect(slides).toHaveLength(1)
    expect(slides[0].label).toBeNull()
  })

  it('trata entrada vazia', () => {
    expect(splitSlides('')).toEqual([])
    expect(splitSlides(null)).toEqual([])
  })
})

describe('sweepSlides — carrossel é lido slide a slide', () => {
  const carrossel = [
    'Slide 1: Cobrei R$ 4.000 por 12 horas de trabalho.',
    'Slide 2: Já parou pra pensar quanto vale sua hora?',
    'Slide 3: A tabela sai do custo fixo mais a margem.',
    'Slide 4: Qual foi a última vez que você revisou seu preço?',
  ].join('\n')

  it('marca em qual slide está o clichê', () => {
    const { blocks } = sweepSlides(carrossel)
    const hit = blocks.find((b) => b.match.toLowerCase().includes('já parou'))
    expect(hit.slide).toBe('Slide 2')
  })

  it('pergunta no meio do carrossel não é tratada como fechamento', () => {
    const { blocks } = sweepSlides(carrossel)
    const fechamentos = blocks.filter((b) => b.id === 'fechamento-pergunta')
    // só o último slide pode disparar a regra de fechamento
    expect(fechamentos.every((b) => b.slide === 'Slide 4')).toBe(true)
  })

  it('conta os slides', () => {
    expect(sweepSlides(carrossel).slideCount).toBe(4)
  })

  it('carrossel limpo passa sem bloqueio', () => {
    const limpo = 'Slide 1: Cobrei R$ 4.000 por 12 horas.\nSlide 2: O custo fixo mensal era R$ 6.200.\nSlide 3: Salva a conta antes de mandar a próxima proposta.'
    expect(sweepSlides(limpo).blocks).toEqual([])
  })
})

describe('sweepResult — varre todos os campos gerados', () => {
  const resultado = {
    suggested_format: 'carrossel',
    title: 'O segredo de quem cobra caro',
    title_options: [
      'Não é falta de talento. É falta de método.',
      'Como montei minha tabela de preço em 3 horas',
    ],
    hook_alternatives: ['Já parou para pensar por que você cobra pouco?'],
    content: 'Slide 1: A verdade é que ninguém ensina isso.\nSlide 2: O custo fixo entra antes da margem.',
    caption: 'Revisei meu preço e o número dobrou.',
  }

  const findings = sweepResult(resultado)

  it('acusa clichê no título — que no carrossel é o slide 1', () => {
    expect(findings.find((f) => f.field === 'title')).toBeTruthy()
  })

  it('acusa clichê nas opções de título, com o índice certo', () => {
    const hit = findings.find((f) => f.field === 'title_options')
    expect(hit.index).toBe(0)
    expect(findings.filter((f) => f.field === 'title_options')).toHaveLength(1) // a opção 2 está limpa
  })

  it('acusa clichê no gancho', () => {
    expect(findings.find((f) => f.field === 'hook_alternatives')).toBeTruthy()
  })

  it('acusa clichê no conteúdo', () => {
    expect(findings.find((f) => f.field === 'content')).toBeTruthy()
  })

  it('não acusa a legenda limpa', () => {
    expect(findings.find((f) => f.field === 'caption')).toBeFalsy()
  })

  it('resultado limpo não gera achado nenhum', () => {
    expect(sweepResult({
      title: 'Como montei minha tabela de preço',
      title_options: ['O que mudou depois que parei de cobrar por hora'],
      hook_alternatives: ['Cobrei R$ 4.000 por 12 horas de trabalho.'],
      content: 'Slide 1: O custo fixo mensal era R$ 6.200.\nSlide 2: Salva a conta antes da próxima proposta.',
      caption: 'A conta que uso está no slide 2.',
    })).toEqual([])
  })

  it('trata resultado inválido', () => {
    expect(sweepResult(null)).toEqual([])
    expect(sweepResult('texto')).toEqual([])
    expect(sweepResult({})).toEqual([])
  })

  it('marca o slide no achado quando o formato é carrossel', () => {
    const hit = findings.find((f) => f.field === 'content')
    expect(hit.blocks.some((b) => b.slide === 'Slide 1')).toBe(true)
  })

  it('fora do carrossel não quebra em slides', () => {
    const hit = sweepResult({ content: 'A verdade é que ninguém ensina isso.' }, { format: 'caption' })
      .find((f) => f.field === 'content')
    expect(hit.blocks.every((b) => b.slide === undefined)).toBe(true)
  })
})

describe('helpers do relatório', () => {
  const findings = sweepResult({
    title: 'O segredo da coisa',
    content: 'Texto limpo, sem padrão nenhum.',
  })

  it('blockingFindings devolve só o que exige reescrita', () => {
    expect(blockingFindings(findings).every((f) => f.blocks.length > 0)).toBe(true)
  })

  it('countBlocks soma as ocorrências', () => {
    expect(countBlocks(findings)).toBeGreaterThan(0)
    expect(countBlocks([])).toBe(0)
  })
})
