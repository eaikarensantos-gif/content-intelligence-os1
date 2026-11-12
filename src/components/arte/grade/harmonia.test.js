import { describe, expect, it } from 'vitest'
import { CORES } from '../marca'
import { avaliarGrade, COLUNAS, JANELA, melhorOrdemNovos, melhoresFixados, montarGrade, ordemIdeal } from './harmonia'
import { podeTrocarFundo, sugerirFundo, variantePorFundo } from './ajusteDeCor'

const calmo = (id, extra = {}) => ({ id, energia: 0.15, luz: 0.9, tom: null, neutro: true, ...extra })
const forte = (id, extra = {}) => ({ id, energia: 0.8, luz: 0.6, tom: 40, neutro: false, ...extra })
const escuro = (id) => ({ id, energia: 0.25, luz: 0.15, tom: null, neutro: true })
const ids = (tiles) => tiles.map((t) => t.id)

describe('avaliarGrade', () => {
  it('feed todo calmo tira 100', () => {
    const r = avaliarGrade(Array.from({ length: 12 }, (_, i) => calmo(`c${i}`)))
    expect(r.nota).toBe(100)
    expect(r.problemas).toEqual([])
  })

  it('feed todo forte tira 0', () => {
    expect(avaliarGrade(Array.from({ length: 12 }, (_, i) => forte(`f${i}`))).nota).toBe(0)
  })

  it('aponta dois fortes lado a lado e diz onde', () => {
    const r = avaliarGrade([calmo('a'), forte('b'), forte('c'), calmo('d'), calmo('e'), calmo('f')])
    const p = r.problemas.find((x) => x.tipo === 'barulho-vizinho')
    expect(p.indices).toEqual([1, 2])
    expect(p.texto).toBe('Dois posts de cor forte lado a lado (linha 1, colunas 2 e 3).')
    expect(r.nota).toBeLessThan(100)
  })

  it('aponta dois fortes um em cima do outro', () => {
    const r = avaliarGrade([forte('a'), calmo('b'), calmo('c'), forte('d'), calmo('e'), calmo('f')])
    expect(r.problemas.map((x) => x.texto)).toContain('Dois posts de cor forte um em cima do outro (coluna 1, linhas 1 e 2).')
  })

  it('fortes na diagonal não encostam e não pesam', () => {
    const r = avaliarGrade([forte('a'), calmo('b'), calmo('c'), calmo('d'), forte('e'), calmo('f'), calmo('g'), calmo('h'), forte('i')])
    expect(r.problemas).toEqual([])
    expect(r.nota).toBe(100)
  })

  it('problema na primeira linha pesa mais que na quarta', () => {
    const topo = avaliarGrade([forte('a'), forte('b'), ...Array.from({ length: 10 }, (_, i) => calmo(`c${i}`))])
    const fundo = avaliarGrade([...Array.from({ length: 9 }, (_, i) => calmo(`c${i}`)), forte('a'), forte('b'), calmo('z')])
    expect(topo.nota).toBeLessThan(fundo.nota)
  })

  it('aponta três escuros em sequência', () => {
    const r = avaliarGrade([escuro('a'), escuro('b'), escuro('c'), calmo('d'), calmo('e'), calmo('f')])
    expect(r.problemas.find((x) => x.tipo === 'escuros-seguidos').texto).toBe('Três posts escuros em sequência (linha 1).')
  })

  it('cor forte que não se repete fica solta quando o resto repete outra', () => {
    const azul = forte('azul', { tom: 220 })
    const r = avaliarGrade([forte('q1'), calmo('a'), calmo('b'), calmo('c'), forte('q2'), calmo('d'), calmo('e'), calmo('f'), azul])
    const solta = r.problemas.find((x) => x.tipo === 'cor-solta')
    expect(solta.indices).toEqual([8])
    expect(solta.texto).toContain('linha 3, coluna 3')
  })

  it('tile sem leitura não pesa; com menos de 2 lidos não há nota', () => {
    const semLeitura = { id: 'x', energia: null }
    expect(avaliarGrade([semLeitura, semLeitura, calmo('a')]).nota).toBeNull()
    expect(avaliarGrade([semLeitura, calmo('a'), calmo('b')]).nota).toBe(100)
  })

  it('só olha a janela', () => {
    const tiles = [...Array.from({ length: JANELA }, (_, i) => calmo(`c${i}`)), forte('a'), forte('b')]
    expect(avaliarGrade(tiles).nota).toBe(100)
  })
})

describe('montarGrade', () => {
  it('põe fixados, depois novos, depois o resto sem repetir o fixado', () => {
    const e = [calmo('e1'), calmo('e2'), calmo('e3')]
    expect(ids(montarGrade({ fixados: [e[2]], novos: [calmo('n1')], existentes: e }))).toEqual(['e3', 'n1', 'e1', 'e2'])
  })
})

describe('melhorOrdemNovos', () => {
  it('separa dois fortes novos com um calmo entre eles', () => {
    const existentes = Array.from({ length: 9 }, (_, i) => calmo(`e${i}`))
    const novos = [forte('f1'), forte('f2'), calmo('c1')]
    const antes = avaliarGrade(montarGrade({ novos, existentes })).nota
    const r = melhorOrdemNovos({ novos, existentes })
    expect(ids(r.novos)).toEqual(['f1', 'c1', 'f2'])
    expect(avaliarGrade(r.grade).nota).toBeGreaterThan(antes)
  })

  it('não mexe quando já está bom', () => {
    const existentes = Array.from({ length: 9 }, (_, i) => calmo(`e${i}`))
    const novos = [calmo('c1'), forte('f1'), calmo('c2')]
    expect(ids(melhorOrdemNovos({ novos, existentes }).novos)).toEqual(['c1', 'f1', 'c2'])
  })

  it('com mais de 7 novos ainda devolve uma ordem com a mesma lista e nota igual ou melhor', () => {
    const novos = [forte('a'), forte('b'), forte('c'), calmo('d'), calmo('e'), calmo('f'), calmo('g'), calmo('h')]
    const r = melhorOrdemNovos({ novos, existentes: [] })
    expect(ids(r.novos).sort()).toEqual(ids(novos).sort())
    expect(avaliarGrade(r.grade).nota).toBeGreaterThanOrEqual(avaliarGrade(montarGrade({ novos })).nota)
  })
})

describe('melhoresFixados', () => {
  it('fixa posts calmos quando a primeira linha ficaria barulhenta', () => {
    const existentes = [forte('e0'), forte('e1'), forte('e2'), calmo('e3'), calmo('e4'), calmo('e5'), forte('e6'), forte('e7'), forte('e8'), calmo('e9')]
    const antes = avaliarGrade(montarGrade({ existentes })).nota
    const r = melhoresFixados({ existentes })
    expect(r.fixados.length).toBeGreaterThan(0)
    expect(r.fixados.length).toBeLessThanOrEqual(3)
    expect(avaliarGrade(r.grade).nota).toBeGreaterThan(antes)
  })

  it('devolve lista vazia quando fixar não ajuda', () => {
    const existentes = Array.from({ length: 9 }, (_, i) => calmo(`e${i}`))
    expect(melhoresFixados({ existentes }).fixados).toEqual([])
  })

  it('respeita o máximo e não considera tile sem leitura', () => {
    const existentes = [{ id: 's', energia: null }, ...Array.from({ length: 8 }, (_, i) => (i % 2 ? calmo(`c${i}`) : forte(`f${i}`)))]
    const r = melhoresFixados({ existentes, max: 1 })
    expect(r.fixados.length).toBeLessThanOrEqual(1)
    expect(ids(r.fixados)).not.toContain('s')
  })
})

describe('ordemIdeal', () => {
  it('chega a uma nota igual ou maior e preserva os mesmos posts', () => {
    const tiles = [forte('a'), forte('b'), forte('c'), calmo('d'), calmo('e'), calmo('f'), calmo('g'), calmo('h'), calmo('i')]
    const ideal = ordemIdeal(tiles)
    expect(ids(ideal).sort()).toEqual(ids(tiles).sort())
    expect(avaliarGrade(ideal).nota).toBeGreaterThan(avaliarGrade(tiles).nota)
    expect(COLUNAS).toBe(3)
  })
})

describe('ajuste de cor dos posts novos', () => {
  const slide = (extra = {}) => ({ template: 'corCheia', fundo: 'mostarda', corTitulo: 'tinta', corTexto: 'tinta', corDestaque: 'terracota', foto: '', recorte: '', ...extra })

  it('só troca fundo de modelo com texto sobre o fundo e sem foto', () => {
    expect(podeTrocarFundo(slide())).toBe(true)
    expect(podeTrocarFundo(slide({ foto: 'data:image/png;base64,xx' }))).toBe(false)
    expect(podeTrocarFundo(slide({ template: 'tarjas' }))).toBe(false)
    expect(podeTrocarFundo({ template: 'cartao', cartao: 'x', fundo: 'tinta' })).toBe(false)
  })

  it('texto que perde contraste passa para creme ou tinta', () => {
    const v = variantePorFundo(slide(), 'tinta')
    expect(v.fundo).toBe('tinta')
    expect(v.corTitulo).toBe('creme')
    expect(v.corTexto).toBe('creme')
    expect(variantePorFundo(slide(), 'creme').corTitulo).toBe('tinta')
  })

  it('não oferece a cor que apagaria um elemento do modelo', () => {
    expect(variantePorFundo(slide({ template: 'caixa', fundo: 'creme' }), 'tinta')).toBeNull()
    expect(variantePorFundo(slide({ template: 'busca', fundo: 'terracota' }), 'creme')).toBeNull()
    expect(variantePorFundo(slide(), 'mostarda')).toBeNull()
  })

  it('sugere o fundo que mais sobe a nota e respeita o ganho mínimo', () => {
    const existentes = Array.from({ length: 9 }, (_, i) => calmo(`e${i}`))
    const tile = forte('novo', { energia: 0.8, luz: 0.6 })
    const notaCom = (t) => avaliarGrade(montarGrade({ novos: [forte('vizinho'), t], existentes })).bruta
    const s = sugerirFundo(slide(), tile, notaCom)
    expect(s).not.toBeNull()
    expect(s.ganho).toBeGreaterThanOrEqual(3)
    expect(['creme', 'areia', 'cafe', 'tinta']).toContain(s.fundo)
    expect(s.slide.fundo).toBe(s.fundo)
    expect(CORES[s.fundo]).toBeTruthy()
    // sem problema na grade não há o que sugerir
    expect(sugerirFundo(slide(), tile, () => 100)).toBeNull()
    // sem leitura de cor não há o que sugerir
    expect(sugerirFundo(slide(), { id: 'x', energia: null }, notaCom)).toBeNull()
  })
})
