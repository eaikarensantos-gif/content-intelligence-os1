import { describe, expect, it } from 'vitest'
import { CARTOES } from './cartoes/colecao'
import { novoCartao } from './cartoes/render'
import { novoSlide } from './conteudoSlide'
import { arteSemConteudo, ehRascunho, nomeAutomatico, roteiroDosCards } from './rascunhos'

const projeto = (...slides) => ({ slides })

describe('arteSemConteudo', () => {
  it('o exemplo do modelo e o editor limpo não têm o que guardar', () => {
    expect(arteSemConteudo(projeto(novoSlide('tarjas')))).toBe(true)
    expect(arteSemConteudo(projeto(novoSlide('atrasCabeca')))).toBe(true)
    expect(arteSemConteudo(projeto({ ...novoSlide('corCheia'), titulo: '', texto: '', detalhe: '', foto: '', emojis: [] }))).toBe(true)
    expect(arteSemConteudo(projeto(novoCartao(CARTOES[0].id)))).toBe(true)
  })
  it('texto próprio, detalhe, foto ou emoji contam como conteúdo', () => {
    expect(arteSemConteudo(projeto({ ...novoSlide('tarjas'), titulo: 'meu título' }))).toBe(false)
    expect(arteSemConteudo(projeto({ ...novoSlide('tarjas'), detalhe: 'nota minha' }))).toBe(false)
    expect(arteSemConteudo(projeto({ ...novoSlide('tarjas'), foto: 'data:image/png;base64,AAAA' }))).toBe(false)
    expect(arteSemConteudo(projeto({ ...novoSlide('tarjas'), emojis: [{ cod: '2728', x: 0, y: 0, tam: 100 }] }))).toBe(false)
  })
  it('qualquer campo editado de um card da coleção conta, não só o principal', () => {
    const def = CARTOES[0]
    const ultimo = def.campos[def.campos.length - 1]
    const card = { ...novoCartao(def.id), textos: { [ultimo.id]: 'escrito por mim' } }
    expect(arteSemConteudo(projeto(card))).toBe(false)
  })
  it('basta um card com conteúdo entre vários', () => {
    expect(arteSemConteudo(projeto(novoSlide('tarjas'), { ...novoSlide('chat'), texto: 'minha conversa' }))).toBe(false)
  })
})

describe('nomeAutomatico', () => {
  const dia = new Date(2026, 10, 4)
  it('usa o começo do primeiro texto e o dia', () => {
    expect(nomeAutomatico(projeto({ ...novoSlide('corCheia'), titulo: 'Quantos prazos você aceitou?', texto: '' }), dia)).toBe('Quantos prazos você aceitou? · 04/11')
  })
  it('corta texto longo', () => {
    const nome = nomeAutomatico(projeto({ ...novoSlide('corCheia'), titulo: 'a'.repeat(120), texto: '' }), dia)
    expect(nome.length).toBeLessThanOrEqual(40 + ' · 04/11'.length)
    expect(nome).toContain('…')
  })
  it('usa só o título do primeiro card, sem o texto de exemplo ao lado', () => {
    expect(nomeAutomatico(projeto({ ...novoSlide('tarjas'), titulo: 'Primeiro rascunho' }), dia)).toBe('Primeiro rascunho · 04/11')
  })
  it('sem título, cai no texto do card', () => {
    expect(nomeAutomatico(projeto({ ...novoSlide('corCheia'), titulo: '', texto: 'só o texto', detalhe: '' }), dia)).toBe('só o texto · 04/11')
  })
  it('pula card vazio e pega o primeiro que tem texto', () => {
    expect(nomeAutomatico(projeto({ ...novoSlide('corCheia'), titulo: '', texto: '', detalhe: '' }, { ...novoSlide('corCheia'), titulo: 'segundo', texto: '' }), dia)).toBe('segundo · 04/11')
  })
  it('sem texto nenhum, ainda dá um nome', () => {
    expect(nomeAutomatico(projeto({ ...novoSlide('corCheia'), titulo: '', texto: '', detalhe: '' }), dia)).toBe('Sem título · 04/11')
  })
})

describe('ehRascunho e roteiroDosCards', () => {
  it('lê o marcador da última versão salva', () => {
    expect(ehRascunho({ projeto: { rascunho: true } })).toBe(true)
    expect(ehRascunho({ projeto: { rascunho: false } })).toBe(false)
    expect(ehRascunho(undefined)).toBe(false)
  })
  it('numera os cards no roteiro', () => {
    const r = roteiroDosCards(projeto({ ...novoSlide('corCheia'), titulo: 'um', texto: '' }, { ...novoSlide('corCheia'), titulo: '', texto: '', detalhe: '' }))
    expect(r).toBe('Card 1\num\n\nCard 2\n(sem texto)')
  })
})
