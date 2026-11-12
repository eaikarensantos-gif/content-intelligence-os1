import { describe, expect, it } from 'vitest'
import { analisarGrade, criarNotaCom, sugerirTrocas } from './analiseGrade'
import { avaliarGrade, montarGrade } from './harmonia'

const calmo = (id) => ({ id, energia: 0.15, luz: 0.5, tom: null, neutro: true })
const forte = (id) => ({ id, energia: 0.8, luz: 0.6, tom: 40, neutro: false })
const capa = (extra = {}) => ({ template: 'corCheia', fundo: 'mostarda', corTitulo: 'tinta', corTexto: 'tinta', corDestaque: 'terracota', foto: '', recorte: '', ...extra })
const existentes = Array.from({ length: 12 }, (_, i) => (i % 4 === 0 ? forte(`e${i}`) : calmo(`e${i}`)))

describe('analisarGrade', () => {
  it('sem leitura suficiente não sugere nada', () => {
    const r = analisarGrade({ novos: [{ id: 'n', energia: null }], existentes: [{ id: 'x', energia: null }] })
    expect(r.semDados).toBe(true)
    expect(r.ordem).toBeNull()
    expect(r.fundos).toEqual([])
  })

  it('grade já calma devolve nota 100 e nenhuma sugestão', () => {
    const r = analisarGrade({ novos: [calmo('a'), calmo('b')], existentes: Array.from({ length: 10 }, (_, i) => calmo(`c${i}`)) })
    expect(r.atual.nota).toBe(100)
    expect(r.ordem).toBeNull()
    expect(r.fixar).toBeNull()
    expect(r.fundos).toEqual([])
  })

  it('dois novos fortes juntos: sugere ordem e troca de fundo, cada uma com nota maior que a atual', () => {
    const novos = [forte('n1'), forte('n2'), calmo('n3')]
    const calmos = Array.from({ length: 9 }, (_, i) => calmo(`c${i}`))
    const r = analisarGrade({ novos, existentes: calmos, capas: { n1: capa(), n2: capa() } })
    expect(r.atual.nota).toBeLessThan(100)
    expect(r.ordem.ids).toEqual(['n1', 'n3', 'n2'])
    expect(r.ordem.nota).toBeGreaterThan(r.atual.nota)
    expect(r.fundos.length).toBeGreaterThan(0)
    for (const f of r.fundos) {
      expect(f.nota).toBeGreaterThan(r.atual.nota)
      expect(f.slide.fundo).toBe(f.fundo)
      expect(f.fundoAtual).toBe('mostarda')
    }
    expect(r.ideal.nota).toBeGreaterThanOrEqual(r.ordem.nota)
  })

  it('novo com foto não ganha sugestão de fundo, só de ordem', () => {
    const r = analisarGrade({ novos: [forte('n1'), forte('n2'), calmo('n3')], existentes, capas: { n1: capa({ foto: 'data:x' }), n2: capa({ foto: 'data:x' }) } })
    expect(r.fundos).toEqual([])
    expect(r.ordem).not.toBeNull()
  })

  it('toda sugestão de ordem ou de fixados sobe a nota em pelo menos 3 pontos', () => {
    const cenarios = [
      { novos: [], existentes },
      { novos: [forte('n1'), calmo('n2')], existentes },
      { novos: [forte('n1'), forte('n2'), forte('n3')], existentes: existentes.slice(0, 9) },
      { novos: [], existentes: [forte('e0'), forte('e1'), ...Array.from({ length: 10 }, (_, i) => calmo(`c${i}`))] },
    ]
    for (const c of cenarios) {
      const r = analisarGrade(c)
      if (r.ordem) expect(r.ordem.nota - r.atual.nota).toBeGreaterThanOrEqual(3)
      if (r.fixar) expect(r.fixar.nota - r.atual.nota).toBeGreaterThanOrEqual(3)
    }
  })

  it('não sugere fixar o que já está fixado do mesmo jeito', () => {
    const base = analisarGrade({ novos: [], existentes })
    if (!base.fixar) return
    const depois = analisarGrade({ novos: [], existentes, fixados: base.fixar.ids.map((id) => existentes.find((t) => t.id === id)) })
    expect(depois.fixar).toBeNull()
  })
})

describe('sugerirTrocas', () => {
  const de = (t, origem) => ({ ...t, origem })
  const grade = [de(forte('a'), 'novo'), de(forte('b'), 'publicado'), ...Array.from({ length: 10 }, (_, i) => de(calmo(`c${i}`), i % 2 ? 'novo' : 'publicado'))]

  it('para um dos dois fortes encostados, sugere trocar com um calmo e mostra a nota que sobe', () => {
    const base = avaliarGrade(grade).nota
    const trocas = sugerirTrocas(grade, 1)
    expect(trocas.length).toBeGreaterThan(0)
    expect(trocas.length).toBeLessThanOrEqual(3)
    for (const t of trocas) {
      expect(t.nota).toBeGreaterThan(base)
      expect(t.indiceDe).toBe(1)
      expect(grade[t.indice].id).toBe(t.id)
    }
    expect(trocas[0].nota).toBeGreaterThanOrEqual(trocas.at(-1).nota)
  })

  it('só é real quando os dois posts são novos', () => {
    const trocas = sugerirTrocas(grade, 0, { max: 10 })
    for (const t of trocas) expect(t.real).toBe(grade[0].origem === 'novo' && grade[t.indice].origem === 'novo')
    expect(trocas.some((t) => t.real)).toBe(true)
    expect(trocas.some((t) => !t.real)).toBe(true)
  })

  it('post que já está bem encaixado não recebe sugestão, nem tile sem leitura', () => {
    const calmos = Array.from({ length: 12 }, (_, i) => de(calmo(`k${i}`), 'publicado'))
    expect(sugerirTrocas(calmos, 5)).toEqual([])
    expect(sugerirTrocas([{ id: 'x', energia: null }, ...grade], 0)).toEqual([])
    expect(sugerirTrocas(grade, 99)).toEqual([])
  })

  it('trocar com tile sem leitura nunca é sugerido', () => {
    const g = [...grade, { id: 'sem', energia: null, origem: 'publicado' }]
    expect(sugerirTrocas(g, 1, { max: 20 }).some((t) => t.id === 'sem')).toBe(false)
  })
})

describe('criarNotaCom', () => {
  it('devolve a nota da grade com o tile novo no lugar do atual', () => {
    const novos = [forte('n1'), forte('n2')]
    const existentes = Array.from({ length: 9 }, (_, i) => calmo(`e${i}`))
    const notaCom = criarNotaCom({ novos, existentes })
    expect(notaCom(novos[1])).toBeCloseTo(avaliarGrade(montarGrade({ novos, existentes })).bruta, 5)
    expect(notaCom({ ...calmo('n2') })).toBeGreaterThan(notaCom(novos[1]))
  })
})
