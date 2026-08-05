// Teste de Reposicionamento — 6 semanas / 18 peças
//
// Calendário derivado de relatório de performance de 90 dias (@karensantosperfil).
// Cada peça herda a especificação do seu container. Nada aqui é sugestão criativa:
// os formatos já têm performance medida e as datas são calculadas a partir de
// DATA_INICIO (segunda-feira da semana 1).
//
// Regras de escrita: exatamente 18 itens, sem desdobrar, sem reordenar.

export const REPOSITIONING_TAG = 'teste-posicionamento'
export const BACKLOG_TAG = 'pauta-pos-teste'

// ─── Containers (formatos provados) ──────────────────────────────────────────

export const CONTAINERS = {
  A: {
    id: 'A',
    label: 'Container A · reel de cena com tensão real',
    short: 'Reel de cena',
    format: 'reel',
    dayLabel: 'Segunda',
    time: '15:00',
    prova: '9.516 de alcance, 72% de não seguidores, 205 compartilhamentos',
    spec: 'Formato que abriu o perfil. Cena cotidiana, gancho nos primeiros 2 segundos, sem introdução. Os seis episódios são a série Wilson — a numeração precisa aparecer na peça e no app, porque a serialização é o que faz o público voltar.',
    targets: [
      { key: 'alcance',              label: 'Alcance',            target: 3000, kind: 'abs' },
      { key: 'pct_nao_seguidores',   label: 'Não seguidores',     target: 50,   kind: 'pct' },
      { key: 'compartilhamentos',    label: 'Compartilhamentos',  target: 40,   kind: 'abs' },
    ],
  },
  B: {
    id: 'B',
    label: 'Container B · carrossel de argumento',
    short: 'Carrossel de argumento',
    format: 'carrossel',
    dayLabel: 'Quarta',
    time: '15:00',
    prova: 'Fracasso: 144 visitas ao perfil e 40 cliques numa peça só · Opinião: 69 compartilhamentos, 60 salvamentos',
    spec: 'Duas variantes que se alternam: fracasso concreto + número + credencial, ou opinião forte sobre o mercado. Pergunta direta no último slide.',
    targets: [
      { key: 'visitas_perfil', label: 'Visitas ao perfil', target: 50, kind: 'abs' },
      { key: 'cliques',        label: 'Cliques no link',   target: 10, kind: 'abs' },
      { key: 'salvamentos',    label: 'Salvamentos',       target: 20, kind: 'abs' },
    ],
  },
  C: {
    id: 'C',
    label: 'Container C · carrossel de utilidade pura',
    short: 'Carrossel de utilidade',
    format: 'carrossel',
    dayLabel: 'Sexta',
    time: '07:00',
    prova: 'Melhor salvamento do histórico: 2,9% sobre alcance, quatro vezes a média do perfil',
    spec: 'Passo a passo, checklist ou comparativo. O slide final tem que ser inútil se a pessoa não salvar. Teste da janela 6h–9h.',
    targets: [
      { key: 'taxa_salvamento', label: 'Salvamento / alcance', target: 1.5, kind: 'pct' },
    ],
  },
}

// ─── Séries ──────────────────────────────────────────────────────────────────

export const SERIES = {
  Wilson: {
    id: 'Wilson',
    label: 'Wilson',
    chip: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    episodes: 6,
    note: 'Personagem recorrente no slot A. Episódios 1 e 2 com Wilson como chefe, do 3 em diante como cliente — a migração é intencional: o público atual tem chefe, o público alvo é dono de negócio, e o personagem atravessa levando a audiência junto.',
    // Alvo específico da série: cada episódio retém pelo menos metade do alcance do anterior.
    retentionTarget: 50,
  },
  // Sem "do mês" no rótulo: as duas edições saem com 21 dias de distância dentro
  // da janela de teste, então chamar de mensal descreveria errado o que acontece.
  Favoritos: {
    id: 'Favoritos',
    label: 'Favoritos',
    chip: 'bg-rose-100 text-rose-700 border-rose-200',
    episodes: 2,
    note: 'Reformulado como critério de decisão em vez de lista — o que uso, o que troquei, o que não valeu o dinheiro. É a peça mais compatível com entrega de campanha do grid.',
    retentionTarget: null,
  },
}

// ─── Pilares ─────────────────────────────────────────────────────────────────

export const PILLARS = {
  'negocio-estrutura': { label: 'Negócio & estrutura', chip: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500',    cell: 'border-blue-200 bg-blue-50/60' },
  'ia-critica':        { label: 'IA crítica',          chip: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500',  cell: 'border-purple-200 bg-purple-50/60' },
  'celular-operacao':  { label: 'Celular & operação',  chip: 'bg-teal-100 text-teal-700 border-teal-200',       dot: 'bg-teal-500',    cell: 'border-teal-200 bg-teal-50/60' },
  'identidade':        { label: 'Identidade',          chip: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-500',   cell: 'border-amber-200 bg-amber-50/60' },
  'a definir':         { label: 'A definir',           chip: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400',    cell: 'border-gray-200 bg-gray-50/60' },
}

// ─── Status de produção (vocabulário do teste) ───────────────────────────────

export const TEST_STATUSES = {
  'a definir':  { label: 'A definir',  chip: 'bg-gray-100 text-gray-600 border-gray-200',          appStatus: 'idea' },
  'a produzir': { label: 'A produzir', chip: 'bg-orange-100 text-orange-700 border-orange-200',    appStatus: 'idea' },
  'produzido':  { label: 'Produzido',  chip: 'bg-blue-100 text-blue-700 border-blue-200',          appStatus: 'ready' },
  'publicado':  { label: 'Publicado',  chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', appStatus: 'published' },
  'medido':     { label: 'Medido',     chip: 'bg-violet-100 text-violet-700 border-violet-200',    appStatus: 'published' },
}

export const TEST_STATUS_ORDER = ['a definir', 'a produzir', 'produzido', 'publicado', 'medido']

// ─── Campos de resultado (vazios na carga, preenchidos depois) ───────────────

export const RESULT_FIELDS = [
  { key: 'alcance',            label: 'Alcance',            unit: '' },
  { key: 'pct_nao_seguidores', label: '% não seguidores',   unit: '%' },
  { key: 'salvamentos',        label: 'Salvamentos',        unit: '' },
  { key: 'compartilhamentos',  label: 'Compartilhamentos',  unit: '' },
  { key: 'visitas_perfil',     label: 'Visitas ao perfil',  unit: '' },
  { key: 'cliques',            label: 'Cliques',            unit: '' },
  { key: 'seguidores',         label: 'Seguidores',         unit: '' },
]

const EMPTY_RESULT = RESULT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {})

// ─── Linha de base do perfil (view de medição) ───────────────────────────────

export const BASELINE = [
  { metric: 'Salvamento (% do alcance)',        base: '0,65%', goal: '1,5%' },
  { metric: 'Não seguidores nas visualizações', base: '21,6%', goal: '35%' },
  { metric: 'Cliques no link por mês',          base: '19',    goal: '50' },
  { metric: 'Visitas ao perfil por carrossel',  base: '22',    goal: '50' },
  { metric: 'Peças de feed por semana',         base: '1,5',   goal: '3' },
]

// ─── As 18 peças ─────────────────────────────────────────────────────────────
// Ordem e conteúdo fiéis ao calendário. Não adicionar, não desdobrar.

export const PIECES = [
  { id: 'A1', week: 1, slot: 'A', container: 'A', series: 'Wilson', episode: 1, role: 'chefe',   pillar: 'negocio-estrutura', angle: 'Wilson é o chefe que exige presencial e faz a reunião online', campaign: false },
  { id: 'B1', week: 1, slot: 'B', container: 'B', variant: 'fracasso', pillar: 'negocio-estrutura', angle: 'O projeto que deu errado, quanto custou, e o que você cobra hoje por causa disso', campaign: false },
  { id: 'C1', week: 1, slot: 'C', container: 'C', pillar: 'celular-operacao', angle: 'O que dá pra resolver do negócio pelo celular antes das 9h', campaign: true },

  // O ângulo que abriu o perfil (9.516 de alcance, 72% de não seguidores) era o da
  // única pessoa negra na sala. Sem esse recorte a peça vira dinâmica corporativa
  // genérica e o pilar `identidade` deixa de descrever o que está na tela.
  { id: 'A2', week: 2, slot: 'A', container: 'A', series: 'Wilson', episode: 2, role: 'chefe',   pillar: 'identidade', angle: 'Wilson repete sua ideia 5 minutos depois na call — e você é a única pessoa negra na sala', campaign: false },
  { id: 'B2', week: 2, slot: 'B', container: 'B', variant: 'opinião', pillar: 'ia-critica', angle: 'Qual promessa de ferramenta de IA não se paga em negócio pequeno', campaign: false },
  { id: 'C2', week: 2, slot: 'C', container: 'C', pillar: 'celular-operacao', angle: 'Um fluxo de IA no celular do início ao fim, com print de cada passo', campaign: true },

  { id: 'A3', week: 3, slot: 'A', container: 'A', series: 'Wilson', episode: 3, role: 'cliente', pillar: 'negocio-estrutura', angle: 'Wilson agora é cliente. Pede "só um ajustinho" na sexta 18h', campaign: false },
  { id: 'B3', week: 3, slot: 'B', container: 'B', variant: 'fracasso', pillar: 'negocio-estrutura', angle: 'Por que parei de vender hora e passei a vender escopo fixo', bridge: 'A3', campaign: false },
  { id: 'C3', week: 3, slot: 'C', container: 'C', series: 'Favoritos', episode: 1, pillar: 'celular-operacao', angle: 'O kit que roda o negócio: o que uso, o que troquei, o que não valeu o dinheiro', campaign: true },

  { id: 'A4', week: 4, slot: 'A', container: 'A', series: 'Wilson', episode: 4, role: 'cliente', pillar: 'negocio-estrutura', angle: 'Wilson cliente exige reunião presencial e entra pela chamada', campaign: false },
  { id: 'B4', week: 4, slot: 'B', container: 'B', variant: 'opinião', pillar: 'negocio-estrutura', angle: 'Separar quem decide de quem executa dentro de uma pessoa só', bridge: 'A4', campaign: false },
  { id: 'C4', week: 4, slot: 'C', container: 'C', pillar: 'ia-critica', angle: 'Traduzir uma capacidade de IA em custo e decisão, em palavras curtas', campaign: false },

  { id: 'A5', week: 5, slot: 'A', container: 'A', series: 'Wilson', episode: 5, role: 'a definir', pillar: 'a definir', angle: 'Repetir o ângulo do episódio de Wilson com maior alcance', campaign: false, pending: true },
  { id: 'B5', week: 5, slot: 'B', container: 'B', variant: 'opinião', pillar: 'identidade', angle: 'Peça mensal de identidade e ancestralidade. Segura a base, ~20% de engajamento', campaign: false },
  { id: 'C5', week: 5, slot: 'C', container: 'C', pillar: 'celular-operacao', angle: 'Comparativo: o que resolver no celular e o que ainda exige computador', campaign: true },

  { id: 'A6', week: 6, slot: 'A', container: 'A', series: 'Wilson', episode: 6, role: 'a definir', pillar: 'a definir', angle: 'Repetir o segundo melhor episódio de Wilson', campaign: false, pending: true },
  { id: 'B6', week: 6, slot: 'B', container: 'B', variant: 'fracasso', pillar: 'negocio-estrutura', angle: 'Repetir a peça de melhor conversão em clique das semanas 1 a 4', campaign: false, pending: true },
  { id: 'C6', week: 6, slot: 'C', container: 'C', series: 'Favoritos', episode: 2, pillar: 'celular-operacao', angle: 'Repetir o formato de melhor salvamento. Candidato padrão: Favoritos edição 2', campaign: true, pending: true },
]

// ─── Banco de pautas fora do teste ───────────────────────────────────────────
// Entram como ideias sem data, para depois da semana 6. Não vão para o calendário.

export const BACKLOG_PIECES = [
  {
    title: 'Um livro me disse',
    note: 'Formato sem performance medida — entra na semana 7. Quando entrar, montado como Container B, com o trecho do livro abrindo uma opinião forte sobre o mercado, não como resumo do livro.',
    container: 'B',
  },
  {
    title: 'Oportunidades e editais para negócio pequeno',
    note: 'Reaproveita o formato de melhor salvamento do histórico (2,9% sobre alcance), trocando o público de quem busca emprego para quem tem negócio. Mantém o formato, troca o público.',
    container: 'C',
  },
]

// ─── Feriados nacionais ──────────────────────────────────────────────────────
// Publicar num feriado não quebra nada, mas contamina a leitura: a audiência do
// dia é atípica e o número deixa de ser comparável com o das outras semanas.
// Numa grade que existe para medir, isso custa a peça inteira.

export const FERIADOS_BR = {
  '2026-01-01': 'Confraternização Universal',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-04-03': 'Sexta-feira Santa',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho',
  '2026-06-04': 'Corpus Christi',
  '2026-09-07': 'Independência',
  '2026-10-12': 'Nossa Senhora Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal',
}

export const isHoliday = (iso) => !!FERIADOS_BR[iso]

// ─── Cálculo de datas ────────────────────────────────────────────────────────
// Slot A: segunda da semana N, 15h — produzir até a sexta anterior.
// Slot B: quarta da semana N, 15h — produzir até a segunda da mesma semana.
// Slot C: sexta  da semana N,  7h — produzir até a quarta da mesma semana.

const pad = (n) => String(n).padStart(2, '0')

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Offsets a partir da segunda-feira da semana N
const SLOT_OFFSETS = {
  A: { publish: 0, produce: -3 },  // segunda / sexta anterior
  B: { publish: 2, produce: 0 },   // quarta  / segunda da mesma semana
  C: { publish: 4, produce: 2 },   // sexta   / quarta da mesma semana
}

/** Segunda-feira mais próxima no futuro (ou hoje, se hoje for segunda). */
export function nextMonday(from = new Date()) {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const dow = d.getDay() // 0 dom … 6 sáb
  const delta = dow === 1 ? 0 : (8 - dow) % 7
  d.setDate(d.getDate() + delta)
  return toISO(d)
}

export function isMonday(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false
  return new Date(`${iso}T12:00:00`).getDay() === 1
}

export function pieceDates(piece, dataInicio) {
  const weekStart = addDays(dataInicio, (piece.week - 1) * 7)
  const { publish, produce } = SLOT_OFFSETS[piece.slot]
  const nominal = addDays(weekStart, publish)

  // Feriado empurra a publicação para o próximo dia útil não-feriado, mantendo
  // o horário do container. O prazo de produção continua o mesmo — o que muda
  // é só o dia em que a peça vai ao ar.
  let publish_date = nominal
  let holiday_shift = null
  if (isHoliday(nominal)) {
    let candidate = nominal
    for (let i = 0; i < 7 && (isHoliday(candidate) || candidate === nominal); i++) {
      candidate = addDays(candidate, 1)
      const dow = new Date(`${candidate}T12:00:00`).getDay()
      if (dow === 0 || dow === 6) continue // não joga para o fim de semana
      if (!isHoliday(candidate)) break
    }
    publish_date = candidate
    holiday_shift = { from: nominal, reason: FERIADOS_BR[nominal] }
  }

  return {
    publish_date,
    produce_by: addDays(weekStart, produce),
    publish_time: CONTAINERS[piece.container].time,
    holiday_shift,
  }
}

/**
 * Que dado vai existir quando a peça pendente precisar ser decidida.
 *
 * As quatro peças de repetição foram desenhadas para usar o resultado das
 * semanas 1 a 4, mas o prazo de produção de cada uma chega antes de parte
 * desses dados fechar. Em vez de fingir que o número está lá, a peça carrega
 * quais referências têm 14 dias completos e quais entram só com 72h.
 */
export function decisionWindow(piece, allPieces) {
  if (!piece?.angle_pending) return null
  const deadline = piece.produce_by

  const refs = allPieces
    .filter((p) => p.test_slot === piece.test_slot && p.test_week < piece.test_week && !p.angle_pending)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  const completo = []
  const parcial = []
  refs.forEach((p) => {
    const d14 = addDays(p.scheduled_date, 14)
    const d72h = addDays(p.scheduled_date, 3)
    if (d14 <= deadline) completo.push(p.internal_id)
    else if (d72h <= deadline) parcial.push(p.internal_id)
  })

  return { deadline, completo, parcial }
}

// Critério de escolha de cada peça de repetição, escrito para o dado que
// realmente existe no prazo — não para o dado ideal.
const DECISION_RULES = {
  A5: 'Maior alcance de 72h entre os episódios de Wilson já publicados. Alcance de reel se define nas primeiras 72h, então o dado existe para todos até o prazo.',
  A6: 'Segundo maior alcance de 72h entre os episódios de Wilson já publicados.',
  B6: 'Melhor conversão em clique. Use 14 dias fechados onde já houver; a peça da semana 4 entra só com o dado de 72h e vale como desempate, não como base.',
  C6: 'Melhor salvamento sobre alcance. Use 14 dias fechados onde já houver; a peça da semana 4 entra só com o dado de 72h e vale como desempate, não como base.',
}

// ─── Construção dos registros para o app ─────────────────────────────────────

function description(piece) {
  const c = CONTAINERS[piece.container]
  const lines = [
    `${c.label}${piece.variant ? ` · variante ${piece.variant}` : ''}`,
    c.spec,
    `Prova de performance: ${c.prova}`,
    `Alvo: ${c.targets.map((t) => `${t.label} ${t.kind === 'pct' ? `${String(t.target).replace('.', ',')}%+` : `${t.target}+`}`).join(' · ')}`,
  ]
  if (piece.series) {
    lines.push(`Série ${SERIES[piece.series].label} · episódio ${piece.episode}${piece.role && piece.role !== 'a definir' ? ` — Wilson como ${piece.role}` : ''}`)
  }
  if (piece.bridge) {
    lines.push(`Ponte com ${piece.bridge}: citar o reel da mesma semana no primeiro slide.`)
  }
  if (piece.pending) {
    lines.push('Ângulo pendente — depende da revisão dos resultados das semanas anteriores. O slot está reservado, não produza antes da revisão.')
    if (DECISION_RULES[piece.id]) lines.push(`Critério de escolha: ${DECISION_RULES[piece.id]}`)
  }
  return lines.join('\n\n')
}

/**
 * Monta as 18 peças no formato de ideia do app a partir de DATA_INICIO
 * (segunda-feira da semana 1, AAAA-MM-DD).
 */
export function buildRepositioningIdeas(dataInicio) {
  return PIECES.map((piece) => {
    const c = CONTAINERS[piece.container]
    const { publish_date, produce_by, publish_time, holiday_shift } = pieceDates(piece, dataInicio)
    const testStatus = piece.pending ? 'a definir' : 'a produzir'

    return {
      // ── campos do app ──
      title: piece.series
        ? `${SERIES[piece.series].label} ${piece.episode} — ${piece.angle}`
        : piece.angle,
      description: description(piece),
      topic: PILLARS[piece.pillar].label,
      format: c.format,
      platform: 'instagram',
      platforms: ['instagram'],
      priority: piece.week <= 2 ? 'high' : 'medium',
      status: TEST_STATUSES[testStatus].appStatus,
      scheduled_date: publish_date,
      content_type: 'organic',
      source: 'Teste de Posicionamento · 6 semanas',
      creation_order: null,
      tags: [
        REPOSITIONING_TAG,
        `semana-${piece.week}`,
        piece.pillar,
        ...(piece.series ? [`serie-${piece.series.toLowerCase()}`] : []),
        ...(piece.campaign ? ['campanha'] : []),
      ],

      // ── campos do teste ──
      internal_id: piece.id,
      test_week: piece.week,
      test_slot: piece.slot,
      container: piece.container,
      container_variant: piece.variant || null,
      series: piece.series || null,
      episode: piece.episode || null,
      series_role: piece.role || null,
      bridge_with: piece.bridge || null,
      pillar: piece.pillar,
      angle: piece.angle,
      angle_pending: !!piece.pending,
      publish_time,
      produce_by,
      holiday_shift,
      decision_rule: piece.pending ? DECISION_RULES[piece.id] || null : null,
      test_status: testStatus,
      campaign_ready: !!piece.campaign,
      result_72h: { ...EMPTY_RESULT },
      result_14d: { ...EMPTY_RESULT },
    }
  })
}

/** Pautas fora do teste — sem data, para depois da semana 6. */
export function buildBacklogIdeas() {
  return BACKLOG_PIECES.map((p) => ({
    title: p.title,
    description: `${p.note}\n\nContainer previsto: ${CONTAINERS[p.container].label}`,
    topic: 'Fora do teste',
    format: CONTAINERS[p.container].format,
    platform: 'instagram',
    platforms: ['instagram'],
    priority: 'low',
    status: 'idea',
    scheduled_date: '',
    content_type: 'organic',
    source: 'Teste de Posicionamento · banco de pautas',
    creation_order: null,
    tags: [BACKLOG_TAG, 'pos-semana-6'],
    container: p.container,
    backlog_note: p.note,
  }))
}

// ─── Revisão de um calendário já carregado ───────────────────────────────────
// Quando a especificação muda (correção de ângulo, feriado, critério de decisão),
// os registros já no app continuam com a versão antiga. Isto compara o que está
// carregado com o que a especificação diz hoje e devolve só os campos de
// especificação que mudaram — status, resultados e ordem de criação ficam intactos.

const SPEC_FIELDS = [
  'title', 'description', 'topic', 'format', 'scheduled_date', 'publish_time', 'produce_by',
  'angle', 'angle_pending', 'pillar', 'series', 'episode', 'series_role', 'bridge_with',
  'container', 'container_variant', 'campaign_ready', 'decision_rule', 'holiday_shift',
  'test_week', 'test_slot',
]

/** Deriva DATA_INICIO a partir da peça A1 já carregada. */
export function inferDataInicio(loaded) {
  const a1 = loaded.find((i) => i.internal_id === 'A1')
  return a1?.scheduled_date || null
}

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Diferenças entre o calendário carregado e a especificação atual.
 * Retorna [{ id, internal_id, patch, changed: [campo] }] — vazio se estiver em dia.
 */
export function revisionPatches(loaded) {
  const dataInicio = inferDataInicio(loaded)
  if (!dataInicio) return []

  const canonical = buildRepositioningIdeas(dataInicio)
  const patches = []

  loaded.forEach((item) => {
    const spec = canonical.find((c) => c.internal_id === item.internal_id)
    if (!spec) return

    const patch = {}
    const changed = []
    SPEC_FIELDS.forEach((field) => {
      if (!sameValue(item[field], spec[field])) {
        patch[field] = spec[field]
        changed.push(field)
      }
    })

    // Tags da especificação entram sem apagar as que a Karen adicionou depois
    const merged = [...new Set([...(spec.tags || []), ...(item.tags || [])])]
    if (!sameValue([...(item.tags || [])].sort(), [...merged].sort())) {
      patch.tags = merged
      changed.push('tags')
    }

    if (changed.length) patches.push({ id: item.id, internal_id: item.internal_id, patch, changed })
  })

  return patches
}

/** Rótulo curto de cada campo, para explicar a revisão na interface. */
export const FIELD_LABELS_PT = {
  title: 'título',
  description: 'descrição',
  topic: 'pilar',
  scheduled_date: 'data de publicação',
  publish_time: 'horário',
  produce_by: 'prazo de produção',
  angle: 'ângulo',
  pillar: 'pilar',
  series: 'série',
  episode: 'episódio',
  series_role: 'papel na série',
  bridge_with: 'ponte',
  campaign_ready: 'marcação de campanha',
  decision_rule: 'critério de decisão',
  holiday_shift: 'ajuste de feriado',
  tags: 'tags',
}

// ─── Verificação (roda antes de escrever no app) ─────────────────────────────

/** Retorna lista de erros. Vazia = calendário íntegro. */
export function validateRepositioningPlan(items) {
  const errors = []

  if (items.length !== 18) errors.push(`Esperado 18 registros, encontrado ${items.length}.`)

  for (let week = 1; week <= 6; week++) {
    const n = items.filter((i) => i.test_week === week).length
    if (n !== 3) errors.push(`Semana ${week} tem ${n} peças (esperado 3).`)
  }

  const seenDates = new Map()
  items.forEach((i) => {
    const key = `${i.scheduled_date} ${i.publish_time}`
    if (seenDates.has(key)) errors.push(`Data duplicada em ${key}: ${seenDates.get(key)} e ${i.internal_id}.`)
    else seenDates.set(key, i.internal_id)

    if (!(i.produce_by < i.scheduled_date)) {
      errors.push(`${i.internal_id}: prazo de produção (${i.produce_by}) não é anterior à publicação (${i.scheduled_date}).`)
    }

    const [h, m] = (i.publish_time || '').split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m) || h * 60 + m > 21 * 60) {
      errors.push(`${i.internal_id}: publicação às ${i.publish_time} — depois das 21h.`)
    }

    const expectedDow = { A: 1, B: 3, C: 5 }[i.test_slot]
    const dow = new Date(`${i.scheduled_date}T12:00:00`).getDay()
    if (dow !== expectedDow && !i.holiday_shift) {
      errors.push(`${i.internal_id}: slot ${i.test_slot} caiu em dia da semana ${dow} (esperado ${expectedDow}).`)
    }

    if (isHoliday(i.scheduled_date)) {
      errors.push(`${i.internal_id}: publicação em ${i.scheduled_date}, feriado (${FERIADOS_BR[i.scheduled_date]}).`)
    }

    if (i.bridge_with && !items.some((o) => o.internal_id === i.bridge_with)) {
      errors.push(`${i.internal_id}: ponte aponta para ${i.bridge_with}, que não existe no calendário.`)
    }
  })

  const ids = new Set(items.map((i) => i.internal_id))
  if (ids.size !== items.length) errors.push('IDs internos duplicados.')

  // Séries: episódios numerados em sequência, sem buraco
  Object.values(SERIES).forEach((serie) => {
    const eps = items
      .filter((i) => i.series === serie.id)
      .map((i) => i.episode)
      .sort((a, b) => a - b)
    if (eps.length !== serie.episodes) {
      errors.push(`Série ${serie.label}: ${eps.length} episódios (esperado ${serie.episodes}).`)
    }
    eps.forEach((ep, idx) => {
      if (ep !== idx + 1) errors.push(`Série ${serie.label}: numeração fora de sequência em ${ep}.`)
    })
  })

  // Pontes obrigatórias do plano
  const expectedBridges = { B3: 'A3', B4: 'A4' }
  Object.entries(expectedBridges).forEach(([from, to]) => {
    const piece = items.find((i) => i.internal_id === from)
    if (piece && piece.bridge_with !== to) {
      errors.push(`${from}: ponte deveria apontar para ${to} (encontrado ${piece.bridge_with || 'nenhuma'}).`)
    }
  })

  return errors
}

/** Alvo do container em texto, para a view de medição. */
export function containerTargets(containerId) {
  return CONTAINERS[containerId]?.targets || []
}

/** Valor medido de um alvo, derivado dos campos de resultado. */
export function measuredValue(target, result) {
  if (!result) return null
  if (target.key === 'taxa_salvamento') {
    const alcance = Number(result.alcance)
    const saves = Number(result.salvamentos)
    if (!alcance || !saves) return null
    return (saves / alcance) * 100
  }
  const raw = result[target.key]
  if (raw === '' || raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * Retenção de alcance de um episódio para o seguinte dentro de uma série.
 * O alvo do plano: cada episódio retém pelo menos metade do alcance do anterior —
 * se cada um cai pela metade sem o anterior sustentar o seguinte, a série não
 * está serializando e virou reel avulso com nome.
 */
export function seriesRetention(items, serieId = 'Wilson', field = 'result_72h') {
  const eps = items
    .filter((i) => i.series === serieId)
    .sort((a, b) => a.episode - b.episode)

  let previous = null
  return eps.map((piece) => {
    const alcance = Number(piece[field]?.alcance)
    const value = Number.isFinite(alcance) && alcance > 0 ? alcance : null
    const retention = value != null && previous != null ? (value / previous) * 100 : null
    if (value != null) previous = value
    return {
      id: piece.internal_id,
      episode: piece.episode,
      role: piece.series_role,
      alcance: value,
      retention,
      target: SERIES[serieId]?.retentionTarget ?? null,
    }
  })
}
