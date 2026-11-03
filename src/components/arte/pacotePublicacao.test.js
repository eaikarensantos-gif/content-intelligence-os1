import { describe, expect, it } from 'vitest'
import { CARTOES } from './cartoes/colecao'
import { novoCartao } from './cartoes/render'
import { novoSlide } from './conteudoSlide'
import { montarPedidoLegenda } from './legendaCarrossel'
import { GATES, LIMITE_ALT, arquivosDoPacote, colchetes, gatesConferidos, pacoteDe, sugerirAlt, textoDoCard } from './pacotePublicacao'

const slide = (titulo, texto = '') => ({ ...novoSlide('corCheia'), titulo, texto, detalhe: '' })

describe('textoDoCard', () => {
  it('junta título e texto sem os asteriscos de destaque e sem quebras de linha', () => {
    expect(textoDoCard(slide('o *número* certo', 'linha 1\nlinha 2'))).toBe('o número certo linha 1 linha 2')
  })
  it('ignora o bloco apagado', () => {
    const s = { ...slide('título', 'texto'), est: { texto: { oculto: true } } }
    expect(textoDoCard(s)).toBe('título')
  })
  it('lê os campos de um card da coleção', () => {
    expect(textoDoCard(novoCartao(CARTOES[0].id)).length).toBeGreaterThan(0)
  })
})

describe('sugerirAlt', () => {
  it('numera o card e fica dentro do limite', () => {
    const alt = sugerirAlt(slide('a'.repeat(300)), 1, 7)
    expect(alt.startsWith('Card 2 de 7: ')).toBe(true)
    expect(alt.length).toBeLessThanOrEqual(LIMITE_ALT)
    expect(alt.endsWith('…')).toBe(true)
  })
  it('card sem texto vira só a numeração', () => {
    expect(sugerirAlt(slide(''), 0, 1)).toBe('Card 1 de 1')
  })
})

describe('colchetes e gates', () => {
  it('acha os trechos para preencher, sem repetir', () => {
    expect(colchetes('Oi [SEU NÚMERO]. Leitura: [SUA LEITURA] e de novo [SEU NÚMERO]')).toEqual(['[SEU NÚMERO]', '[SUA LEITURA]'])
    expect(colchetes('sem nada')).toEqual([])
  })
  it('são seis gates e conta os conferidos', () => {
    expect(GATES).toHaveLength(6)
    expect(gatesConferidos({ pacote: { gates: { funcao: true, cpf: true, inventado: true } } })).toBe(2)
    expect(gatesConferidos({})).toBe(0)
  })
  it('pacoteDe devolve padrão sem mexer no original', () => {
    const p = { pacote: { legenda: 'x' } }
    expect(pacoteDe(p)).toEqual({ legenda: 'x', gates: {} })
    expect(p.pacote.gates).toBeUndefined()
  })
})

describe('arquivosDoPacote', () => {
  it('só cria legenda.txt e alt-text.txt quando há algo escrito', () => {
    const p = { slides: [slide('a'), slide('b')], pacote: {} }
    expect(arquivosDoPacote(p, [0, 1])).toEqual({})
  })
  it('mantém a numeração original do card na seleção parcial', () => {
    const p = { slides: [{ ...slide('a'), alt: 'primeiro' }, { ...slide('b'), alt: 'segundo' }, slide('c')], pacote: { legenda: ' Oi ' } }
    expect(arquivosDoPacote(p, [1, 2])).toEqual({ 'legenda.txt': 'Oi\n', 'alt-text.txt': 'card-02: segundo\n' })
  })
})

describe('montarPedidoLegenda', () => {
  const projeto = { slides: [slide('Quantos prazos você aceitou sem dizer não?'), slide('a régua', 'conta o que entrou')], pacote: {} }
  it('lista os cards na ordem e leva as regras de voz', () => {
    const { system, pedido } = montarPedidoLegenda(projeto)
    expect(pedido).toContain('Card 1: Quantos prazos você aceitou sem dizer não?')
    expect(pedido).toContain('Card 2: a régua conta o que entrou')
    expect(system).toContain('[SEU NÚMERO]')
    expect(system).toContain('Travessão')
  })
  it('o carrossel de terça pede a leitura entre colchetes e a frase dos 5 minutos', () => {
    const { system } = montarPedidoLegenda(projeto, 'terca')
    expect(system).toContain('[SUA LEITURA]')
    expect(system).toContain('A conta leva 5 minutos e está nos slides.')
  })
  it('legenda já escrita vai junto para a IA respeitar', () => {
    const { pedido } = montarPedidoLegenda({ ...projeto, pacote: { legenda: 'minha legenda' } })
    expect(pedido).toContain('minha legenda')
  })
})
