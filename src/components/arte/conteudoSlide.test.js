import { describe, expect, it } from 'vitest'
import { CARTOES } from './cartoes/colecao'
import { novoCartao } from './cartoes/render'
import { TEMPLATES } from './Templates'
import { conteudoProprio, levarConteudo, novoSlide, padraoDe, tamanho, temAjustes } from './conteudoSlide'

describe('conteudoSlide', () => {
  it('novoSlide parte do padrão do modelo e guarda qual modelo é', () => {
    const s = novoSlide('corCheia')
    expect(s.template).toBe('corCheia')
    expect(s.titulo).toBe(TEMPLATES.corCheia.padrao.titulo)
  })

  it('o exemplo do modelo não conta como conteúdo; o que a pessoa escreveu conta', () => {
    expect(conteudoProprio(novoSlide('tarjas'))).toMatchObject({ titulo: undefined, texto: undefined })
    const editado = { ...novoSlide('tarjas'), titulo: 'meu título', texto: 'meu texto' }
    expect(conteudoProprio(editado)).toMatchObject({ titulo: 'meu título', texto: 'meu texto' })
  })

  it('título e texto atravessam a troca de modelo, inclusive por um modelo sem lugar para eles', () => {
    const origem = { ...novoSlide('tarjas'), titulo: 'meu título', texto: 'meu texto' }
    const depois = levarConteudo(origem, novoSlide('busca'))
    expect(depois.titulo).toBe('meu título')
    expect(depois.texto).toBe('meu texto')
    const volta = levarConteudo(depois, novoSlide('tarjas'))
    expect(volta.titulo).toBe('meu título')
  })

  it('temAjustes só acusa o que se perde na troca (posição, tamanho, fonte)', () => {
    const limpo = novoSlide('tarjas')
    expect(temAjustes(limpo)).toBe(false)
    expect(temAjustes({ ...limpo, est: { titulo: { tamanho: 70 } } })).toBe(true)
    expect(temAjustes({ ...limpo, pos: { ...limpo.pos, titulo: { x: 1, y: 2 } } })).toBe(true)
  })

  it('o tamanho segue o formato do projeto nos modelos base e o do original nos cards', () => {
    expect(tamanho(novoSlide('tarjas'), 'feed')).toMatchObject({ w: 1080, h: 1350 })
    expect(tamanho(novoSlide('tarjas'), 'story')).toMatchObject({ w: 1080, h: 1920 })
    const card = novoCartao(CARTOES[0].id)
    expect(tamanho(card, 'feed')).toEqual({ w: CARTOES[0].w, h: CARTOES[0].h })
  })

  it('padraoDe devolve um slide novo do mesmo modelo', () => {
    const base = padraoDe({ ...novoSlide('chat'), titulo: 'outro' })
    expect(base.template).toBe('chat')
    expect(base.titulo).toBe(TEMPLATES.chat.padrao.titulo)
    expect(padraoDe(novoCartao(CARTOES[0].id)).cartao).toBe(CARTOES[0].id)
  })
})
