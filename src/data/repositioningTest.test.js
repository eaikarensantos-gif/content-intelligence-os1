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
  isHoliday,
  decisionWindow,
  revisionPatches,
  inferDataInicio,
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

  it('respeita os dias e horários de cada container, salvo desvio por feriado', () => {
    const bySlot = { A: { dow: 1, time: '15:00' }, B: { dow: 3, time: '15:00' }, C: { dow: 5, time: '07:00' } }
    items.forEach((i) => {
      const { dow, time } = bySlot[i.test_slot]
      // o horário do container vale sempre; o dia só muda quando cai em feriado
      expect(i.publish_time).toBe(time)
      if (i.holiday_shift) {
        expect(new Date(`${i.holiday_shift.from}T12:00:00`).getDay()).toBe(dow)
      } else {
        expect(new Date(`${i.scheduled_date}T12:00:00`).getDay()).toBe(dow)
      }
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

describe('feriado nacional', () => {
  const items = buildRepositioningIdeas(INICIO)

  it('nenhuma peça publica em feriado', () => {
    items.forEach((i) => {
      expect(isHoliday(i.scheduled_date), `${i.internal_id} em ${i.scheduled_date}`).toBe(false)
    })
  })

  it('A5 sai do 7 de setembro (Independência) para o dia seguinte', () => {
    const a5 = items.find((i) => i.internal_id === 'A5')
    expect(a5.holiday_shift).toEqual({ from: '2026-09-07', reason: 'Independência' })
    expect(a5.scheduled_date).toBe('2026-09-08')
    expect(a5.publish_time).toBe('15:00')       // horário do container não muda
    expect(a5.produce_by).toBe('2026-09-04')    // prazo de produção não muda
  })

  it('peça sem feriado não carrega ajuste', () => {
    expect(items.find((i) => i.internal_id === 'A1').holiday_shift).toBeNull()
  })

  it('a verificação reprova publicação em feriado', () => {
    const quebrado = buildRepositioningIdeas(INICIO)
    const a4 = quebrado.find((i) => i.internal_id === 'A4')
    a4.scheduled_date = '2026-09-07'
    a4.holiday_shift = null
    const errors = validateRepositioningPlan(quebrado)
    expect(errors.some((e) => e.includes('feriado'))).toBe(true)
  })

  it('o deslocamento não joga a peça para o fim de semana', () => {
    items.filter((i) => i.holiday_shift).forEach((i) => {
      const dow = new Date(`${i.scheduled_date}T12:00:00`).getDay()
      expect(dow).not.toBe(0)
      expect(dow).not.toBe(6)
    })
  })
})

describe('janela de decisão das peças pendentes', () => {
  const items = buildRepositioningIdeas(INICIO)

  it('A5 decide com 72h — nenhum episódio anterior tem 14 dias fechados no prazo', () => {
    const a5 = items.find((i) => i.internal_id === 'A5')
    const win = decisionWindow(a5, items)
    expect(win.deadline).toBe('2026-09-04')
    expect(win.completo).toEqual(['A1', 'A2'])   // 14 dias fechados
    expect(win.parcial).toEqual(['A3', 'A4'])    // só 72h até o prazo
  })

  it('B6 tem as semanas 1 a 3 fechadas e a 4 só com 72h', () => {
    const b6 = items.find((i) => i.internal_id === 'B6')
    const win = decisionWindow(b6, items)
    expect(win.completo).toEqual(['B1', 'B2', 'B3'])
    expect(win.parcial).toEqual(['B4', 'B5'])
  })

  it('C6 idem no slot C', () => {
    const win = decisionWindow(items.find((i) => i.internal_id === 'C6'), items)
    expect(win.completo).toContain('C3')
    expect(win.parcial).toContain('C4')
  })

  it('peça não pendente não tem janela de decisão', () => {
    expect(decisionWindow(items.find((i) => i.internal_id === 'A1'), items)).toBeNull()
    expect(decisionWindow(null, items)).toBeNull()
  })

  it('cada peça pendente carrega o critério escrito para o dado que existe', () => {
    items.filter((i) => i.angle_pending).forEach((i) => {
      expect(i.decision_rule, i.internal_id).toBeTruthy()
    })
    expect(items.find((i) => i.internal_id === 'A5').decision_rule).toMatch(/72h/)
    expect(items.find((i) => i.internal_id === 'B6').decision_rule).toMatch(/desempate/)
  })
})

describe('correções de conteúdo', () => {
  const items = buildRepositioningIdeas(INICIO)

  it('A2 volta a carregar o recorte que sustenta o pilar identidade', () => {
    const a2 = items.find((i) => i.internal_id === 'A2')
    expect(a2.pillar).toBe('identidade')
    expect(a2.angle).toMatch(/única pessoa negra/)
  })

  it('a série Favoritos não se chama mais "do mês"', () => {
    expect(SERIES.Favoritos.label).toBe('Favoritos')
    const c3 = items.find((i) => i.internal_id === 'C3')
    expect(c3.title).toMatch(/^Favoritos 1 —/)
  })
})

describe('revisão de um calendário já carregado', () => {
  it('detecta as peças desatualizadas e devolve só os campos de especificação', () => {
    const carregado = buildRepositioningIdeas(INICIO).map((i, idx) => ({ ...i, id: `uuid-${idx}` }))
    // simula a versão antiga: ângulo sem o recorte e A5 no feriado
    const a2 = carregado.find((i) => i.internal_id === 'A2')
    a2.angle = 'Wilson repete sua ideia 5 minutos depois na call'
    a2.title = 'Wilson 2 — Wilson repete sua ideia 5 minutos depois na call'
    const a5 = carregado.find((i) => i.internal_id === 'A5')
    a5.scheduled_date = '2026-09-07'
    a5.holiday_shift = null
    a5.test_status = 'produzido'
    a5.result_72h = { alcance: '4000' }

    const patches = revisionPatches(carregado)
    const ids = patches.map((p) => p.internal_id)
    expect(ids).toEqual(['A2', 'A5'])

    const pa5 = patches.find((p) => p.internal_id === 'A5')
    expect(pa5.patch.scheduled_date).toBe('2026-09-08')
    expect(pa5.patch).not.toHaveProperty('test_status')   // status preservado
    expect(pa5.patch).not.toHaveProperty('result_72h')    // resultado preservado
    expect(pa5.id).toBe(a5.id)
  })

  it('calendário em dia não gera revisão', () => {
    const carregado = buildRepositioningIdeas(INICIO).map((i, idx) => ({ ...i, id: `uuid-${idx}` }))
    expect(revisionPatches(carregado)).toEqual([])
  })

  it('preserva tags adicionadas à mão', () => {
    const carregado = buildRepositioningIdeas(INICIO).map((i, idx) => ({ ...i, id: `uuid-${idx}` }))
    const c1 = carregado.find((i) => i.internal_id === 'C1')
    c1.tags = [...c1.tags, 'minha-tag']
    c1.angle = 'ângulo antigo'
    const patch = revisionPatches(carregado).find((p) => p.internal_id === 'C1').patch
    expect(patch.tags ?? c1.tags).toContain('minha-tag')
  })

  it('sem A1 carregada não tenta adivinhar a data de início', () => {
    expect(revisionPatches([])).toEqual([])
    expect(inferDataInicio([])).toBeNull()
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
