// Monta o contexto editorial injetado nos prompts de geração — a camada
// que faz Analytics, Ideias, Creator e Planejador lerem a audiência do
// mesmo jeito. Lê valores de src/data/editorialStrategy.js; não define
// função, série ou regra nova aqui.
//
// buildEditorialContext() recebe só os campos que precisa (nunca o store
// inteiro, nunca a lista bruta de métricas) e devolve um bloco de texto
// pronto pra entrar no system prompt, já na ordem: função → público →
// série → aprendizado de desempenho.

import {
  EDITORIAL_FUNCTIONS,
  EDITORIAL_SERIES,
  ACTIVE_AUDIENCE_PROFILE,
  DEFAULT_AUDIENCE_CUTS,
  CONNECTION_PRINCIPLES,
  CONTENT_VALIDATION_RULES,
  getEditorialFunction,
  getEditorialSeries,
} from '../data/editorialStrategy'

const tokenize = (texto) => (texto || '').toLowerCase().split(/[^a-z0-9àáâãäçèéêëìíîïñòóôõöùúûü]+/i).filter(Boolean)
const hasAny = (tokens, ...palavras) => palavras.some((p) => tokens.includes(p))
const hasPhrase = (texto, ...frases) => {
  const t = (texto || '').toLowerCase()
  return frases.some((f) => t.includes(f))
}

/**
 * Classificação heurística de fallback (sem IA) — usada quando não há
 * function/series já escolhida manualmente. Não decide sozinha em
 * definitivo: a interface sempre mostra a classificação pra Karen revisar.
 */
export function classifyEditorialFunction(text) {
  const t = (text || '').toLowerCase()
  const tk = tokenize(t)

  const isCommunity = hasAny(tk, 'naomi', 'casa', 'rotina', 'fim', 'domingo', 'sábado', 'sabado')
    || hasPhrase(t, 'hoje eu', 'no fim de semana', 'em casa')
  if (isCommunity) return 'community_connection'

  const isBackstage = hasAny(tk, 'bastidor', 'bastidores', 'decidi', 'decidimos', 'errei', 'erro', 'dúvida', 'duvida')
    || hasPhrase(t, 'como eu decidi', 'por trás', 'por tras', 'ainda não sei', 'ainda nao sei')
  if (isBackstage) return 'decision_backstage'

  const isUtility = hasAny(tk, 'como', 'passo', 'checklist', 'critério', 'criterio', 'processo', 'aplicar', 'aplique')
    || hasPhrase(t, 'na prática', 'na pratica', 'passo a passo')
  if (isUtility) return 'practical_utility'

  const isCritical = hasAny(tk, 'dado', 'dados', 'discurso', 'custo', 'mito', 'exagero', 'hype')
    || hasPhrase(t, 'o que ficou de fora', 'quem paga', 'vale a pena')
  if (isCritical) return 'critical_reading'

  return null
}

/** Séries compatíveis com a função escolhida. Sem função, devolve todas. */
export function getCompatibleSeries(editorialFunction) {
  if (!editorialFunction) return EDITORIAL_SERIES
  return EDITORIAL_SERIES.filter((s) => s.compatibleFunctions.includes(editorialFunction))
}

/** Bloco de público — perfil ativo + corte específico deste conteúdo, se houver. */
export function buildAudienceContext(audienceCut) {
  let ctx = `\n\nPÚBLICO ATIVO (perfil comportamental, não demografia oficial):\n${ACTIVE_AUDIENCE_PROFILE.creator}\nResponde principalmente a:\n${ACTIVE_AUDIENCE_PROFILE.respondsTo.map((r) => `- ${r}`).join('\n')}\nParte mais mobilizada: ${ACTIVE_AUDIENCE_PROFILE.mostMobilized}\n`

  if (audienceCut) {
    const known = DEFAULT_AUDIENCE_CUTS.find((c) => c.id === audienceCut)
    const label = known ? known.label : audienceCut
    ctx += `\nESTE CONTEÚDO É DIRIGIDO ESPECIFICAMENTE A: ${label}\n`
  }

  return ctx
}

/**
 * Bloco de aprendizado de desempenho. Recebe um RESUMO já calculado (ex.:
 * saída de aggregateByEditorialFunction em utils/analytics.js) — nunca a
 * lista bruta de métricas ou o store inteiro. `summary` é opcional; sem
 * amostra suficiente, o bloco declara isso em vez de inventar causalidade.
 */
export function buildPerformanceLearningContext(metricsSummary) {
  if (!metricsSummary) return ''
  const { sampleSize = 0, byFunction = [], note } = metricsSummary

  if (sampleSize < 5) {
    return `\n\nAPRENDIZADO DE DESEMPENHO: amostra pequena (${sampleSize} posts com métrica). Trate qualquer diferença abaixo como SINAL OBSERVADO, não como causalidade comprovada.${note ? ` ${note}` : ''}\n`
  }

  if (!byFunction.length) return ''

  const lines = byFunction
    .map((f) => {
      const fn = getEditorialFunction(f.editorial_function)
      const label = fn?.label || f.editorial_function
      return `- ${label}: ${f.count} posts, ${f.saves_per_reach != null ? `${(f.saves_per_reach * 100).toFixed(1)}% salvamento/alcance` : 'sem dado de salvamento'}, ${f.shares_per_reach != null ? `${(f.shares_per_reach * 100).toFixed(1)}% compartilhamento/alcance` : 'sem dado de compartilhamento'}`
    })
    .join('\n')

  return `\n\nAPRENDIZADO DE DESEMPENHO (amostra: ${sampleSize} posts):\n${lines}\nUse isso pra calibrar ênfase, não pra repetir mecanicamente o que já funcionou.\n`
}

function buildFunctionBlock(editorialFunctionId) {
  const fn = getEditorialFunction(editorialFunctionId)
  if (!fn) return ''
  const connectionRule = CONNECTION_PRINCIPLES.byFunction[fn.id]
  return `\n\nFUNÇÃO EDITORIAL: ${fn.label.toUpperCase()}\nObjetivo: ${fn.goal}\n${fn.promptInstruction}\nFechamento: ${connectionRule} Nunca use "${CONNECTION_PRINCIPLES.forbidden.join('", "')}".\n`
}

function buildSeriesBlock(editorialSeriesId) {
  const series = getEditorialSeries(editorialSeriesId)
  if (!series) return ''
  return `\n\nSÉRIE EDITORIAL: ${series.label}\n${series.description}\n${series.promptInstruction}\n`
}

function buildBriefingBlock({ observedSituation, evidence, materialCost, decisionSupported, desiredResponse } = {}) {
  const rows = [
    observedSituation && `- Situação observada: ${observedSituation}`,
    evidence && `- Evidência/dado disponível: ${evidence}`,
    materialCost && `- Custo, risco ou consequência: ${materialCost}`,
    decisionSupported && `- Decisão que o conteúdo ajuda a tomar: ${decisionSupported}`,
    desiredResponse && `- Tipo de resposta/conversa desejada: ${desiredResponse}`,
  ].filter(Boolean)
  if (!rows.length) return ''
  return `\n\nBRIEFING DESTE CONTEÚDO:\n${rows.join('\n')}\nSe a tese depender de dado que não foi dado acima, marque isso como incerto em vez de inventar número ou fonte.\n`
}

function buildRelevantSignalsBlock({ relevantInsight, commentContext } = {}) {
  let ctx = ''
  if (relevantInsight) {
    ctx += `\n\nINSIGHT RELEVANTE DE DESEMPENHO:\n${relevantInsight}\n`
  }
  if (commentContext) {
    ctx += `\n\nORIGEM EM COMENTÁRIO REAL DA AUDIÊNCIA:\n${commentContext}\nUse a experiência real que apareceu no comentário como base — sem copiar texto privado nem expor a pessoa.\n`
  }
  return ctx
}

/**
 * Monta o bloco editorial completo, na ordem: função → público → série →
 * briefing → sinais relevantes (insight/comentário) → aprendizado de
 * desempenho. Todo campo é opcional — sem editorialFunction, devolve só o
 * que houver (público, série etc.), permitindo uso parcial.
 */
export function buildEditorialContext({
  editorialFunction,
  editorialSeries,
  audienceCut,
  format,
  theme,
  relevantInsight,
  commentContext,
  metricsSummary,
  observedSituation,
  evidence,
  materialCost,
  decisionSupported,
  desiredResponse,
} = {}) {
  let ctx = ''
  ctx += buildFunctionBlock(editorialFunction)
  ctx += buildAudienceContext(audienceCut)
  ctx += buildSeriesBlock(editorialSeries)
  ctx += buildBriefingBlock({ observedSituation, evidence, materialCost, decisionSupported, desiredResponse })
  ctx += buildRelevantSignalsBlock({ relevantInsight, commentContext })
  ctx += buildPerformanceLearningContext(metricsSummary)

  if (format) ctx += `\nFormato pedido: ${format}.\n`
  if (theme) ctx += `Tema: ${theme}.\n`

  return ctx
}

/** Bloco com a checklist de validação silenciosa — usado no fechamento do prompt (contrato de saída). */
export function buildValidationBlock() {
  const lines = CONTENT_VALIDATION_RULES.map((r, i) => `${i + 1}. ${r.question}`).join('\n')
  return `\n\nANTES DE RESPONDER, VERIFIQUE EM SILÊNCIO (não escreva as respostas, só corrija o texto se falhar):\n${lines}\nSe falhar nos itens 3, 6, 7, 8 ou 10, reescreva antes de entregar.\n`
}

export { EDITORIAL_FUNCTIONS, EDITORIAL_SERIES }
