import { describe, expect, it } from 'vitest'
import { aplicarEmLote, encaixarBloco, reordenarProjeto, restaurarPosicoes } from './ajustesProjeto'
import { agruparVersoes } from './projetosConta'
import { contraste, mesmaArte } from './exportacaoArte'

describe('acabamento e organização', () => {
  it('reordena mantendo o card ativo e o original intactos', () => {
    const p = { atual: 1, slides: [{ titulo: 'A' }, { titulo: 'B' }, { titulo: 'C' }] }
    const novo = reordenarProjeto(p, 0, 2)
    expect(novo.slides.map(s => s.titulo)).toEqual(['B', 'C', 'A'])
    expect(novo.atual).toBe(0)
    expect(p.slides[0].titulo).toBe('A')
  })
  it('aplica apenas nos selecionados sem perder foto, texto ou posição', () => {
    const slide = { template: 'tarjas', titulo: 'Original', foto: 'foto', pos: { titulo: { x: 1, y: 2 } }, est: { texto: { fundo: 'cafe' } } }
    const p = { slides: [slide, slide] }
    const novo = aplicarEmLote(p, [1], { fonte: 'inter', cor: 'creme', assinatura: '@perfil' })
    expect(novo.slides[0]).toBe(slide)
    expect(novo.slides[1]).toMatchObject({ titulo: 'Original', foto: 'foto', pos: slide.pos, assinatura: '@perfil', est: { texto: { fundo: 'cafe', fonte: 'inter', cor: 'creme' } } })
    expect(slide.assinatura).toBeUndefined()
  })
  it('mantém cores dos blocos ao mudar texto e aplica estilo na coleção', () => {
    const p = { slides: [{ template: 'tarjas', corDestaque: 'cafe' }, { template: 'cartao', cartao: '62-cartao', textos: { l1: 'Preservado' }, fotos: { slot: 'foto' }, camadas: { 1: { dx: 20, cor: 'mostarda' } } }] }
    const novo = aplicarEmLote(p, [0, 1], { cor: 'creme', fundo: 'terracota', fonte: 'inter' })
    expect(novo.slides[0].est.texto.fundo).toBe('cafe')
    expect(novo.slides[1].estiloLote).toEqual({ cor: 'creme', fundo: 'terracota', fonte: 'inter' })
    expect(novo.slides[1].camadas[1]).toEqual({ dx: 20 })
    expect(novo.slides[1].textos).toBe(p.slides[1].textos)
    expect(novo.slides[1].fotos).toBe(p.slides[1].fotos)
  })
  it('cor em lote não troca a cor de destaque e chega ao detalhe manuscrito', () => {
    const novo = aplicarEmLote({ slides: [{ template: 'corCheia', corDestaque: 'mostarda' }] }, [0], { cor: 'creme' })
    expect(novo.slides[0].corDestaque).toBe('mostarda')
    expect(novo.slides[0].corTitulo).toBe('creme')
    expect(novo.slides[0].est.detalhe.cor).toBe('creme')
  })
  it('restaura só as posições, preservando fonte, cor, tamanho e elementos apagados', () => {
    const base = { template: 'tarjas', pos: { titulo: { x: 9, y: 9 } }, est: { titulo: { fonte: 'inter', tamanho: 70, oculto: true } } }
    const padrao = { titulo: { x: 80, y: 200 } }
    expect(restaurarPosicoes(base, padrao)).toMatchObject({ pos: padrao, est: base.est })
    const cartao = { template: 'cartao', cartao: '62-cartao', camadas: { 1: { dx: 20, dy: 5, escala: 1.4, fonte: 'inter', cor: 'creme', oculto: true } } }
    expect(restaurarPosicoes(cartao).camadas[1]).toEqual({ escala: 1.4, fonte: 'inter', cor: 'creme', oculto: true })
  })
  it('encaixa no centro e equilibra o vão entre elementos', () => {
    expect(encaixarBloco({ x: 443, y: 200, w: 200, h: 100 }, [], 1080, 1350).x).toBe(440)
    const r = encaixarBloco({ x: 197, y: 300, w: 100, h: 100 }, [{ x: 0, y: 0, w: 100, h: 100 }, { x: 400, y: 0, w: 100, h: 100 }], 1080, 1350)
    expect(r.x).toBe(200)
    expect(r.linhas.some(l => l.iguais)).toBe(true)
  })
  it('une cópias locais e remotas sem perder versões concorrentes', () => {
    const grupos = agruparVersoes([{ id: '1', projetoId: 'p', salvoEm: 1 }, { id: '2', projetoId: 'p', salvoEm: 2 }, { id: '1', projetoId: 'p', salvoEm: 1, nuvem: true }, { id: '3', projetoId: 'outro', salvoEm: 3 }])
    expect(grupos).toHaveLength(2)
    expect(grupos[1].versoes.map(v => v.id)).toEqual(['2', '1'])
    expect(grupos[1].versoes[1].nuvem).toBe(true)
  })
  it('calcula contraste de cores conhecidas', () => {
    expect(contraste([0, 0, 0], [255, 255, 255])).toBe(21)
    expect(contraste([255, 255, 255], [255, 255, 255])).toBe(1)
  })
  it('mesmaArte ignora o texto alternativo mas acusa qualquer outra mudança no card', () => {
    const card = { template: 'corCheia', titulo: 'a', est: {} }
    const base = { formato: 'feed', contador: false, slides: [card] }
    expect(mesmaArte(base, { ...base, slides: [{ ...card, alt: 'descrição' }] })).toBe(true)
    expect(mesmaArte(base, { ...base, slides: [{ ...card, titulo: 'b' }] })).toBe(false)
    expect(mesmaArte(base, { ...base, slides: [card, card] })).toBe(false)
    expect(mesmaArte(base, { ...base, contador: true })).toBe(false)
  })
})
