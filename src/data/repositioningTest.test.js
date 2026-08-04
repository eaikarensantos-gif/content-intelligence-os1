import { describe, it, expect } from 'vitest'
import {
  PIECES,
  CONTAINERS,
  buildRepositioningIdeas,
  validateRepositioningPlan,
  nextMonday,
  isMonday,
  measuredValue,
} from './repositioningTest'

const INICIO = '2026-08-10' // segunda-feira

describe('calendário de teste de posicionamento', () => {
  const items = buildRepositioningIdeas(INICIO)

  it('carrega exatamente 18 peças, 3 por semana', () => {
    expect(items).toHaveLength(18)
    for (let w = 1; w <= 6; w++) {
      expect(items.filter((i) => i.test_week === w)).toHaveLength(3)
    }
  })

  it('passa na verificação completa', () => {
    expect(validateRepositioningPlan(items)).toEqual([])
  })

  it('não repete data de publicação', () => {
    const dates = items.map((i) => `${i.scheduled_date} ${i.publish_time}`)
    expect(new Set(dates).size).toBe(18)
  })

  it('produz sempre antes de publicar', () => {
    items.forEach((i) => {
      expect(i.produce_by < i.scheduled_date).toBe(true)
    })
  })

  it('nunca publica depois das 21h', () => {
    items.forEach((i) => {
      const [h, m] = i.publish_time.split(':').map(Number)
      expect(h * 60 + m).toBeLessThanOrEqual(21 * 60)
    })
  })

  it('respeita os dias e horários de cada container', () => {
    const bySlot = { A: { dow: 1, time: '15:00' }, B: { dow: 3, time: '15:00' }, C: { dow: 5, time: '07:00' } }
    items.forEach((i) => {
      const { dow, time } = bySlot[i.test_slot]
      expect(new Date(`${i.scheduled_date}T12:00:00`).getDay()).toBe(dow)
      expect(i.publish_time).toBe(time)
    })
  })

  it('calcula os prazos de produção pela regra de cada slot', () => {
    const a1 = items.find((i) => i.internal_id === 'A1')
    expect(a1.scheduled_date).toBe('2026-08-10')  // segunda semana 1
    expect(a1.produce_by).toBe('2026-08-07')      // sexta anterior

    const b1 = items.find((i) => i.internal_id === 'B1')
    expect(b1.scheduled_date).toBe('2026-08-12')  // quarta
    expect(b1.produce_by).toBe('2026-08-10')      // segunda da mesma semana

    const c1 = items.find((i) => i.internal_id === 'C1')
    expect(c1.scheduled_date).toBe('2026-08-14')  // sexta
    expect(c1.produce_by).toBe('2026-08-12')      // quarta da mesma semana

    const c6 = items.find((i) => i.internal_id === 'C6')
    expect(c6.scheduled_date).toBe('2026-09-18')  // sexta da semana 6
  })

  it('marca as 4 peças dependentes da revisão da semana 4 como "a definir"', () => {
    const pendentes = items.filter((i) => i.test_status === 'a definir').map((i) => i.internal_id)
    expect(pendentes).toEqual(['A5', 'A6', 'B6', 'C6'])
    pendentes.forEach((id) => {
      expect(items.find((i) => i.internal_id === id).angle_pending).toBe(true)
    })
  })

  it('marca as 4 peças compatíveis com campanha', () => {
    const campanha = items.filter((i) => i.campaign_ready).map((i) => i.internal_id)
    expect(campanha).toEqual(['C1', 'C2', 'C3', 'C6'])
    campanha.forEach((id) => {
      expect(items.find((i) => i.internal_id === id).tags).toContain('campanha')
    })
  })

  it('herda formato e alvo do container', () => {
    items.forEach((i) => {
      expect(i.format).toBe(CONTAINERS[i.container].format)
    })
  })

  it('cria os campos de resultado vazios', () => {
    items.forEach((i) => {
      expect(Object.values(i.result_72h).every((v) => v === '')).toBe(true)
      expect(Object.values(i.result_14d).every((v) => v === '')).toBe(true)
    })
  })

  it('mantém a ordem e o conteúdo da tabela original', () => {
    expect(items.map((i) => i.internal_id)).toEqual(PIECES.map((p) => p.id))
    items.forEach((i, idx) => {
      expect(i.angle).toBe(PIECES[idx].angle)
      expect(i.pillar).toBe(PIECES[idx].pillar)
    })
  })

  it('detecta calendário inválido', () => {
    const quebrado = buildRepositioningIdeas(INICIO)
    quebrado[0].produce_by = '2026-08-11'
    quebrado.pop()
    const errors = validateRepositioningPlan(quebrado)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes('A1'))).toBe(true)
  })
})

describe('helpers de data', () => {
  it('nextMonday devolve uma segunda-feira', () => {
    ;['2026-08-04', '2026-08-09', '2026-08-10', '2026-08-15'].forEach((d) => {
      const m = nextMonday(new Date(`${d}T12:00:00`))
      expect(isMonday(m)).toBe(true)
      expect(m >= d).toBe(true)
    })
  })

  it('isMonday rejeita entrada inválida', () => {
    expect(isMonday('')).toBe(false)
    expect(isMonday('10/08/2026')).toBe(false)
    expect(isMonday('2026-08-11')).toBe(false)
  })
})

describe('medição contra o alvo do container', () => {
  it('calcula taxa de salvamento sobre alcance', () => {
    const target = { key: 'taxa_salvamento' }
    expect(measuredValue(target, { alcance: 2000, salvamentos: 40 })).toBeCloseTo(2)
    expect(measuredValue(target, { alcance: '', salvamentos: 40 })).toBeNull()
  })

  it('lê métricas absolutas direto do resultado', () => {
    expect(measuredValue({ key: 'cliques' }, { cliques: '12' })).toBe(12)
    expect(measuredValue({ key: 'cliques' }, { cliques: '' })).toBeNull()
    expect(measuredValue({ key: 'cliques' }, null)).toBeNull()
  })
})
