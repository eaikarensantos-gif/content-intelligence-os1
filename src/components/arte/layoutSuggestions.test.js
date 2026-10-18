import { describe, expect, it } from 'vitest'
import { CATALOGO_LAYOUTS, classificarLayouts, conteudoLayout, idLayout, proximoLayout } from './layoutSuggestions'
import { TEMPLATES } from './Templates'
import { novoCartao } from './cartoes/render'

const base = (campos = {}) => ({ ...TEMPLATES.corCheia.padrao, template: 'corCheia', titulo: 'Uma ideia', texto: 'Um passo por vez.', detalhe: '', ...campos })
describe('seleção editorial de layouts', () => {
  it('considera os 49 layouts sem duplicatas', () => {
    expect(CATALOGO_LAYOUTS).toHaveLength(49)
    expect(new Set(CATALOGO_LAYOUTS.map(c => c.id)).size).toBe(49)
  })
  it('filtra formato, fotos e capacidade sem inventar conteúdo', () => {
    const source = base()
    for (const c of classificarLayouts(source, { formato: 'story' })) {
      expect(c.formatos).toContain('story')
      if (c.def) expect(c.def.id).toBe('60-processo')
      const convertido = conteudoLayout(c.slide)
      expect(convertido.titulo).toBe(source.titulo)
      expect(convertido.corpo).toBe(source.texto)
      expect(convertido.fotos).toEqual([])
    }
  })
  it('preserva todos os campos e as fotos ao oferecer alternativas', () => {
    const source = novoCartao('62-cartao', { textos: { l1: 'Ideia', l2: 'Primeiro', l3: 'Segundo', s1: 'A', s2: 'B', s3: 'C', s4: 'D' } })
    const original = conteudoLayout(source)
    for (const c of classificarLayouts(source)) {
      const convertido = conteudoLayout(c.slide)
      expect(convertido.titulo).toBe(original.titulo)
      expect(convertido.corpo).toBe(original.corpo)
      if (convertido.fotos.length) expect(c.referencia).toBe(true)
    }
    const foto = base({ template: 'tarjas', foto: 'data:minha-foto' })
    for (const c of classificarLayouts(foto)) expect(conteudoLayout(c.slide).fotos).toContain('data:minha-foto')
  })
  it('não ressuscita textos apagados ou perde fotos extras', () => {
    const oculto = base({ est: { texto: { oculto: true } } })
    expect(classificarLayouts(oculto).map(c => c.id)).toEqual(['corCheia'])
    const source = novoCartao('26-cachorro')
    const fotos = conteudoLayout(source).fotos
    expect(fotos.length).toBeGreaterThan(1)
    for (const c of classificarLayouts(source)) expect(conteudoLayout(c.slide).fotos).toEqual(fotos)
  })
  it('reduz a pontuação de repetição e considera pedido explícito', () => {
    const source = base({ texto: '' })
    const sem = classificarLayouts(source, { papel: 'capa' }).find(c => c.id === 'corCheia')
    const com = classificarLayouts(source, { papel: 'capa', anteriores: ['corCheia'] }).find(c => c.id === 'corCheia')
    expect(com.pontos).toBeLessThan(sem.pontos)
    expect(classificarLayouts(source, { preferido: 'cartao:62-cartao' })[0].id).toBe('cartao:62-cartao')
  })
  it('oferece fotos de referência e diversifica famílias sem exigir upload', () => {
    const candidatos = classificarLayouts(base())
    expect(candidatos.some(c => c.comFoto && c.referencia && c.def)).toBe(true)
    const aprovados = []
    const pendentes = [...candidatos]
    for (let i = 0; i < 3; i++) {
      const proximo = proximoLayout(pendentes, aprovados)
      aprovados.push(proximo)
      pendentes.splice(pendentes.indexOf(proximo), 1)
    }
    expect(aprovados.some(c => c.comFoto)).toBe(true)
    expect(new Set(aprovados.map(c => c.familia)).size).toBeGreaterThan(1)
    expect(classificarLayouts(base(), { permitirFotoReferencia: false }).some(c => c.referencia)).toBe(false)
  })
  it('texto extenso nunca é cortado só para caber num candidato', () => {
    const source = base({ texto: 'Texto longo. '.repeat(200) })
    const opcoes = classificarLayouts(source)
    expect(opcoes.map(c => c.id)).toEqual([idLayout(source)])
    expect(opcoes[0].slide).toBe(source)
  })
})
