import { describe, expect, it } from 'vitest'
import { analisarGrade } from './analiseGrade'

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
