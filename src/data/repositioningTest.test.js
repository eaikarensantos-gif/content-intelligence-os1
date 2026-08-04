import { describe, it, expect } from 'vitest'
import {
  PIECES,
  CONTAINERS,
  SERIES,
  BACKLOG_TAG,
  buildRepositioningIdeas,
  buildBacklogIdeas,
  validateRepositioningPlan,
  nextMonday,
  isMonday,
  measuredValue,
  seriesRetention,
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

  it('marca as 5 peças compatíveis com campanha', () => {
    const campanha = items.filter((i) => i.campaign_ready).map((i) => i.internal_id)
    expect(campanha).toEqual(['C1', 'C2', 'C3', 'C5', 'C6'])
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

describe('série Wilson', () => {
  const items = buildRepositioningIdeas(INICIO)
  const wilson = items.filter((i) => i.series === 'Wilson').sort((a, b) => a.episode - b.episode)

  it('tem 6 episódios numerados em sequência, todos no slot A', () => {
    expect(wilson.map((i) => i.episode)).toEqual([1, 2, 3, 4, 5, 6])
    wilson.forEach((i) => expect(i.test_slot).toBe('A'))
    expect(SERIES.Wilson.episodes).toBe(6)
  })

  it('migra de chefe para cliente a partir do episódio 3', () => {
    expect(wilson.map((i) => i.series_role)).toEqual([
      'chefe', 'chefe', 'cliente', 'cliente', 'a definir', 'a definir',
    ])
  })

  it('mostra a numeração no título e nas tags', () => {
    expect(wilson[0].title).toContain('Wilson 1')
    expect(wilson[0].tags).toContain('serie-wilson')
  })

  it('detecta buraco na numeração', () => {
    const quebrado = buildRepositioningIdeas(INICIO)
    const a4 = quebrado.find((i) => i.internal_id === 'A4')
    a4.episode = 9
    const errors = validateRepositioningPlan(quebrado)
    expect(errors.some((e) => e.includes('Wilson'))).toBe(true)
  })

  it('Favoritos tem 2 edições, em C3 e C6', () => {
    const favoritos = items.filter((i) => i.series === 'Favoritos').sort((a, b) => a.episode - b.episode)
    expect(favoritos.map((i) => i.internal_id)).toEqual(['C3', 'C6'])
    expect(favoritos.map((i) => i.episode)).toEqual([1, 2])
  })
})

describe('pontes entre slots', () => {
  const items = buildRepositioningIdeas(INICIO)

  it('B3 aponta para A3 e B4 aponta para A4', () => {
    expect(items.find((i) => i.internal_id === 'B3').bridge_with).toBe('A3')
    expect(items.find((i) => i.internal_id === 'B4').bridge_with).toBe('A4')
  })

  it('nenhuma outra peça tem ponte', () => {
    const comPonte = items.filter((i) => i.bridge_with).map((i) => i.internal_id)
    expect(comPonte).toEqual(['B3', 'B4'])
  })

  it('detecta ponte ausente ou apontando para o lugar errado', () => {
    const quebrado = buildRepositioningIdeas(INICIO)
    quebrado.find((i) => i.internal_id === 'B3').bridge_with = null
    const errors = validateRepositioningPlan(quebrado)
    expect(errors.some((e) => e.startsWith('B3:'))).toBe(true)
  })
})

describe('banco de pautas fora do teste', () => {
  const backlog = buildBacklogIdeas()

  it('entra sem data e fora do calendário', () => {
    expect(backlog).toHaveLength(2)
    backlog.forEach((i) => {
      expect(i.scheduled_date).toBe('')
      expect(i.tags).toContain(BACKLOG_TAG)
      expect(i.tags).not.toContain('teste-posicionamento')
    })
  })

  it('registra as duas pautas do plano', () => {
    expect(backlog.map((i) => i.title)).toEqual([
      'Um livro me disse',
      'Oportunidades e editais para negócio pequeno',
    ])
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

describe('retenção de alcance da série Wilson', () => {
  const items = buildRepositioningIdeas(INICIO)

  it('devolve um ponto por episódio, sem retenção no primeiro', () => {
    const rows = seriesRetention(items)
    expect(rows).toHaveLength(6)
    expect(rows[0].retention).toBeNull()
    expect(rows.every((r) => r.alcance === null)).toBe(true)
  })

  it('calcula a retenção de um episódio para o seguinte', () => {
    const medido = buildRepositioningIdeas(INICIO)
    medido.find((i) => i.internal_id === 'A1').result_72h.alcance = '9000'
    medido.find((i) => i.internal_id === 'A2').result_72h.alcance = '4500'
    medido.find((i) => i.internal_id === 'A3').result_72h.alcance = '1800'

    const rows = seriesRetention(medido)
    expect(rows[1].retention).toBeCloseTo(50)   // bate o alvo de 50%
    expect(rows[2].retention).toBeCloseTo(40)   // não bate
    expect(rows[1].target).toBe(50)
    expect(rows[3].retention).toBeNull()        // sem dado ainda
  })

  it('ignora episódios sem alcance sem quebrar a cadeia', () => {
    const medido = buildRepositioningIdeas(INICIO)
    medido.find((i) => i.internal_id === 'A1').result_72h.alcance = '8000'
    medido.find((i) => i.internal_id === 'A3').result_72h.alcance = '4000'

    const rows = seriesRetention(medido)
    expect(rows[1].retention).toBeNull()
    expect(rows[2].retention).toBeCloseTo(50)   // compara com o último episódio medido
  })
})
