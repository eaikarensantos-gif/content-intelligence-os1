import { describe, expect, it } from 'vitest'
import { CORES, FONTES_TITULO, normalizar, partesDestaque } from './marca'
import { TEMPLATES } from './Templates'

describe('marca', () => {
  it('Bootzy sempre com espaçamento positivo', () => {
    expect(FONTES_TITULO.bootzy.tracking).toBe('0.03em')
  })

  it('separa o trecho entre asteriscos para a cor de destaque', () => {
    expect(partesDestaque('ia não organiza o que você *não decidiu*')).toEqual([
      { t: 'ia não organiza o que você ', destaque: false },
      { t: 'não decidiu', destaque: true },
    ])
  })

  it('normalizar devolve cores, fonte e emojis da identidade e limita o véu', () => {
    const padrao = { ...TEMPLATES.tarjas.padrao, template: 'tarjas' }
    const a = normalizar({ fundo: '#00FF00', corTitulo: 'neon', fonteTitulo: 'comic', veu: 2, emojis: [{ cod: 'xx', x: 0, y: 0, tam: 10 }, { cod: '2728', x: 0, y: 0, tam: 10 }], pos: { titulo: { x: 1, y: 2 } } }, padrao)
    expect(a.fundo).toBe(padrao.fundo)
    expect(a.corTitulo).toBe(padrao.corTitulo)
    expect(a.fonteTitulo).toBe('bootzy')
    expect(a.veu).toBe(0.6)
    expect(a.emojis.map((e) => e.cod)).toEqual(['2728'])
    expect(a.pos.titulo).toEqual({ x: 1, y: 2 })
    expect(a.pos.texto).toEqual(padrao.pos.texto)
  })

  it('todo template começa com cores da paleta e posição para o título', () => {
    for (const [id, t] of Object.entries(TEMPLATES)) {
      for (const campo of ['fundo', 'corTitulo', 'corTexto', 'corDestaque', 'corTarja']) expect(CORES, `${id}.${campo}`).toHaveProperty(t.padrao[campo])
      expect(t.padrao.pos.titulo, id).toBeDefined()
    }
  })
})
