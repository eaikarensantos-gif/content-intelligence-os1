import { describe, expect, it } from 'vitest'
import { CORES } from '../marca'
import { LIMIAR_BARULHO, analisarPixels, contrasteHex, familiaDeTom, hexParaRgb, projetarFundo, propsDeHex } from './cor'

const chapado = (hex, n = 64) => {
  const [r, g, b] = hexParaRgb(hex)
  return new Uint8ClampedArray(Array.from({ length: n }, () => [r, g, b, 255]).flat())
}
const misto = (fundo, texto, partesTexto) => {
  const f = [...hexParaRgb(fundo), 255], t = [...hexParaRgb(texto), 255]
  const total = 100
  return new Uint8ClampedArray(Array.from({ length: total }, (_, i) => (i < partesTexto ? t : f)).flat())
}

describe('analisarPixels', () => {
  it('devolve a cor média em hex', () => {
    expect(analisarPixels(chapado('#E9C46A')).hex).toBe('#E9C46A')
  })

  it('ignora pixel transparente e devolve null sem pixel opaco', () => {
    expect(analisarPixels(new Uint8ClampedArray([10, 20, 30, 0, 10, 20, 30, 0]))).toBeNull()
    const metade = new Uint8ClampedArray([...chapado('#A64B2A', 1), 0, 0, 0, 0])
    expect(analisarPixels(metade).hex).toBe('#A64B2A')
  })

  it('separa as cores calmas das fortes na paleta da marca', () => {
    const e = (id) => analisarPixels(chapado(CORES[id].hex)).energia
    for (const calma of ['creme', 'areia', 'cafe', 'tinta']) expect(e(calma), calma).toBeLessThan(LIMIAR_BARULHO)
    for (const forte of ['mostarda', 'terracota']) expect(e(forte), forte).toBeGreaterThanOrEqual(LIMIAR_BARULHO)
    expect(e('creme')).toBeLessThan(e('pessego'))
    expect(e('pessego')).toBeLessThan(e('mostarda'))
  })

  it('creme e tinta contam como neutros; mostarda não', () => {
    expect(analisarPixels(chapado('#F4EFE7')).neutro).toBe(true)
    expect(analisarPixels(chapado('#2B211B')).neutro).toBe(true)
    const m = analisarPixels(chapado('#E9C46A'))
    expect(m.neutro).toBe(false)
    expect(m.tom).toBeGreaterThan(30)
    expect(m.tom).toBeLessThan(60)
  })

  it('texto escuro sobre creme continua calmo', () => {
    expect(analisarPixels(misto('#F4EFE7', '#2B211B', 12)).energia).toBeLessThan(LIMIAR_BARULHO)
  })

  it('mede a luz', () => {
    expect(analisarPixels(chapado('#F4EFE7')).luz).toBeGreaterThan(0.85)
    expect(analisarPixels(chapado('#2B211B')).luz).toBeLessThan(0.2)
  })
})

describe('projetarFundo', () => {
  it('trocar mostarda por creme acalma o tile e mantém o que veio do texto', () => {
    const tile = { id: 'a', ...analisarPixels(misto('#E9C46A', '#2B211B', 12)) }
    const novo = projetarFundo(tile, '#E9C46A', '#F4EFE7')
    expect(novo.energia).toBeLessThan(LIMIAR_BARULHO)
    expect(novo.energia).toBeLessThan(tile.energia)
    expect(novo.hex).toBe('#F4EFE7')
    expect(novo.id).toBe('a')
    expect(novo.luz).toBeGreaterThan(tile.luz)
  })

  it('propsDeHex dá o mesmo barulho da leitura de pixels para cor chapada', () => {
    expect(propsDeHex('#A64B2A').energia).toBeCloseTo(analisarPixels(chapado('#A64B2A')).energia, 2)
  })
})

describe('contrasteHex', () => {
  it('preto no branco é 21 e a ordem não importa', () => {
    expect(contrasteHex('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
    expect(contrasteHex('#FFFFFF', '#000000')).toBeCloseTo(21, 0)
  })
})

describe('familiaDeTom', () => {
  it('agrupa de 45 em 45 graus e fecha a volta no vermelho', () => {
    expect(familiaDeTom(null)).toBeNull()
    expect(familiaDeTom(5)).toBe(familiaDeTom(350))
    expect(familiaDeTom(40)).not.toBe(familiaDeTom(200))
  })
})
