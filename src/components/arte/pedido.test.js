import { describe, expect, it } from 'vitest'
import { instrucoes, montarProjeto } from './pedido'

describe('pedido de arte', () => {
  it('monta os slides e descarta o que a identidade não aceita', () => {
    const p = montarProjeto({
      formato: 'quadrado',
      slides: [
        { template: 'corCheia', titulo: 'segunda organiza', texto: 'o resto espera', fundo: 'neon', corTitulo: 'mostarda', fonteTitulo: 'comic', emojis: ['2728', 'zz', '1f440', '1f525'] },
        { template: 'inventado', titulo: 'dois' },
      ],
    })
    expect(p.formato).toBe('feed')
    expect(p.contador).toBe(false)
    expect(p.slides).toHaveLength(2)
    const [a, b] = p.slides
    expect(a.titulo).toBe('segunda organiza')
    expect(a.fundo).toBe('cafe')
    expect(a.corTitulo).toBe('mostarda')
    expect(a.fonteTitulo).toBe('bootzy')
    expect(a.emojis.map((e) => e.cod)).toEqual(['2728', '1f440'])
    expect(b.template).toBe('corCheia')
  })

  it('sem foto, os modelos de cabeça viram modelos sem recorte', () => {
    const p = montarProjeto({ slides: [{ template: 'atrasCabeca', titulo: 'horas' }, { template: 'cabecaCaixa', titulo: 'x' }] })
    expect(p.slides.map((s) => s.template)).toEqual(['tarjas', 'corCheia'])
    expect(p.slides.every((s) => !s.foto)).toBe(true)
  })

  it('com foto, aplica só onde o modelo mostra a foto', () => {
    const p = montarProjeto({ slides: [{ template: 'atrasCabeca', titulo: 'horas' }, { template: 'corCheia', usarFoto: true }, { template: 'tarjas', usarFoto: true }] }, 'data:foto')
    expect(p.slides.map((s) => s.foto)).toEqual(['data:foto', '', 'data:foto'])
    expect(p.contador).toBe(true)
  })

  it('recusa resposta sem slides', () => {
    expect(() => montarProjeto({ slides: [] })).toThrow()
  })

  it('as instruções listam todos os templates', () => {
    for (const t of ['tarjas', 'atrasCabeca', 'cabecaCaixa', 'corCheia', 'caixa', 'selecao', 'chat', 'busca']) expect(instrucoes()).toContain(`- ${t}:`)
  })
})
