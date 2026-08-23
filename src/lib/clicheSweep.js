// src/lib/clicheSweep.js
// Varredura anti-clichê unificada sobre o texto JÁ GERADO.
//
// O app tinha dois detectores que nunca se encontravam: o clicheDetector
// (estruturas: "não é X, é Y", frases proibidas, fechamento em pergunta) e o
// brandLinter (frases de massa: "o segredo de", "a verdade é que", "ninguém te
// conta"). A geração só usava o primeiro, e só nos campos `content` e `caption`.
// Título e ganchos passavam sem nenhuma checagem — e no carrossel o título é o
// slide 1, o texto mais visível da peça.
//
// Este módulo junta as duas fontes e varre todos os campos de texto do resultado.

import { detectCliches, detectBannedWords } from './clicheDetector'
import { lintText } from '../utils/brandLinter'
import { ANTI_AI_FILTER } from './antiAIFilter'
import { withManualOperacional } from './manualOperacional'

/** Campos de texto do resultado que precisam passar pela varredura. */
export const SWEPT_FIELDS = ['content', 'caption', 'title', 'title_options', 'hook_alternatives']

/** Campos que são uma linha só — título, opções de título, ganchos. */
export const SHORT_FIELDS = ['title', 'title_options', 'hook_alternatives']

// Uma pergunta como fechamento de texto é padrão de coach; uma pergunta como
// título ou gancho de abertura não é a mesma coisa. A regra de fechamento só
// vale para o fim de um texto corrido ou para o último slide.
const CLOSING_RULE = 'fechamento-pergunta'

const norm = (hit, source) => ({
  id: hit.id,
  label: hit.label,
  match: hit.match,
  source,
})

/**
 * Varre um texto com as três camadas e devolve os achados normalizados.
 * `isClosing = false` desliga a regra de fechamento em pergunta (títulos,
 * ganchos e slides que não são o último). `bannedWords` é a lista pessoal —
 * cresce conforme a Karen bane frase por frase; diferente de BLOCK_PHRASES,
 * que é fixa e vem com o app.
 */
export function sweepText(text, { isClosing = true, bannedWords = [] } = {}) {
  const blocks = []
  const warns = []
  if (!text || typeof text !== 'string') return { blocks, warns }

  const det = detectCliches(text)
  det.blocks.forEach((h) => {
    if (!isClosing && h.id === CLOSING_RULE) return
    blocks.push(norm(h, 'estrutura'))
  })
  det.warns.forEach((h) => warns.push(norm(h, 'estrutura')))

  detectBannedWords(text, bannedWords).forEach((h) => blocks.push(norm(h, 'banido')))

  lintText(text).forEach((v) => {
    blocks.push({
      id: v.id,
      label: v.category,
      match: v.match,
      source: 'linter',
      suggestion: v.suggestion,
    })
  })

  return { blocks: dedupe(blocks), warns: dedupe(warns) }
}

function dedupe(hits) {
  const seen = new Set()
  return hits.filter((h) => {
    const key = `${h.id}|${(h.match || '').toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Divide o conteúdo de um carrossel em slides. Sem marcação, devolve o texto inteiro. */
export function splitSlides(content) {
  if (!content || typeof content !== 'string') return []
  const lines = content.split('\n')
  const isSlideStart = (l) => /^\s*(slide|card|p[áa]gina)\s*\d+\s*[:.\-—)]/i.test(l)
  if (!lines.some(isSlideStart)) return [{ label: null, text: content }]

  const slides = []
  let current = null
  for (const line of lines) {
    if (isSlideStart(line)) {
      if (current) slides.push(current)
      current = { label: line.trim().match(/^\s*\S+\s*\d+/)?.[0]?.trim() || 'Slide', text: line }
    } else if (current) {
      current.text += `\n${line}`
    } else if (line.trim()) {
      slides.push({ label: null, text: line })
    }
  }
  if (current) slides.push(current)
  return slides
}

/**
 * Varredura de carrossel: cada slide é uma unidade de leitura, então o clichê
 * precisa ser procurado slide a slide. A regra de fechamento em pergunta só se
 * aplica ao último slide — perguntas no meio do carrossel são conversa, não
 * fechamento de coach.
 */
export function sweepSlides(content, bannedWords = []) {
  const slides = splitSlides(content)
  const blocks = []
  const warns = []

  slides.forEach((slide, idx) => {
    const isLast = idx === slides.length - 1
    const { blocks: b, warns: w } = sweepText(slide.text, { isClosing: isLast, bannedWords })
    const tag = slide.label ? `${slide.label}` : null
    b.forEach((h) => blocks.push({ ...h, slide: tag }))
    w.forEach((h) => warns.push({ ...h, slide: tag }))
  })

  return { blocks: dedupe(blocks), warns: dedupe(warns), slideCount: slides.length }
}

/**
 * Varre o resultado inteiro da geração, campo a campo.
 * Devolve, por campo, os achados que exigem reescrita.
 *
 * Formato: [{ field, index, text, blocks, warns }]
 * `index` só existe em campos que são array (title_options, hook_alternatives).
 */
export function sweepResult(result, { format, bannedWords = [] } = {}) {
  const findings = []
  if (!result || typeof result !== 'object') return findings

  const push = (field, index, text, res) => {
    if (!res.blocks.length && !res.warns.length) return
    findings.push({ field, index, text, blocks: res.blocks, warns: res.warns })
  }

  // Conteúdo: no carrossel a varredura é por slide
  if (result.content) {
    const isCarrossel = (format || result.suggested_format || '').toLowerCase() === 'carrossel'
    push('content', undefined, result.content,
      isCarrossel ? sweepSlides(result.content, bannedWords) : sweepText(result.content, { bannedWords }))
  }

  if (result.caption) push('caption', undefined, result.caption, sweepText(result.caption, { bannedWords }))

  // Campos curtos: título é o slide 1 do carrossel, gancho é a primeira frase
  if (result.title) push('title', undefined, result.title, sweepText(result.title, { isClosing: false, bannedWords }))

  ;['title_options', 'hook_alternatives'].forEach((field) => {
    const list = Array.isArray(result[field]) ? result[field] : []
    list.forEach((line, index) => {
      push(field, index, line, sweepText(line, { isClosing: false, bannedWords }))
    })
  })

  return findings
}

// ─── Varredura por caminho ───────────────────────────────────────────────────
// O gerador do Studio Livre devolve um objeto plano; o da aba Carrossel devolve
// versões aninhadas com slides. Trabalhar por caminho cobre os dois sem duplicar
// a lógica de correção.

export function getByPath(obj, path) {
  return path.reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export function setByPath(obj, path, value) {
  const last = path[path.length - 1]
  const parent = path.slice(0, -1).reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
  if (parent != null) parent[last] = value
  return obj
}

/**
 * Varre uma lista de caminhos de texto.
 * entries: [{ path, isClosing, short, label }]
 */
export function sweepPaths(obj, entries, bannedWords = []) {
  const findings = []
  entries.forEach((entry) => {
    const text = getByPath(obj, entry.path)
    if (typeof text !== 'string' || !text.trim()) return
    const res = sweepText(text, { isClosing: entry.isClosing !== false, bannedWords })
    if (!res.blocks.length && !res.warns.length) return
    findings.push({ ...entry, text, blocks: res.blocks, warns: res.warns })
  })
  return findings
}

const CAROUSEL_VERSIONS = [
  { key: 'versao_principal', label: 'Versão principal' },
  { key: 'variacao_emocional', label: 'Variação emocional' },
  { key: 'variacao_provocativa', label: 'Variação provocativa' },
]

/**
 * Caminhos de texto de um carrossel do Protocolo (aba Carrossel).
 *
 * Cada slide é uma unidade: a regra de fechamento em pergunta vale só para o
 * último slide de cada versão. `pergunta_final` fica de fora dessa regra de
 * propósito — ali a pergunta direta é o formato, não o vício.
 */
export function carouselTextPaths(carResult) {
  const entries = []
  if (!carResult || typeof carResult !== 'object') return entries

  CAROUSEL_VERSIONS.forEach(({ key, label }) => {
    const slides = Array.isArray(carResult[key]?.slides) ? carResult[key].slides : []
    slides.forEach((slide, i) => {
      if (typeof slide?.texto !== 'string') return
      entries.push({
        path: [key, 'slides', i, 'texto'],
        isClosing: i === slides.length - 1,
        short: true,
        label: `${label} · slide ${slide.numero ?? i + 1}`,
      })
    })
    if (typeof carResult[key]?.pergunta_final === 'string') {
      entries.push({
        path: [key, 'pergunta_final'],
        isClosing: false,
        short: true,
        label: `${label} · pergunta final`,
      })
    }
  })

  if (typeof carResult.legenda === 'string') {
    entries.push({ path: ['legenda'], isClosing: true, short: false, label: 'Legenda' })
  }

  return entries
}

const ENGAGEMENT_TEXT_FIELDS = [
  { key: 'versao_principal', label: 'Versão principal' },
  { key: 'variacao_emocional', label: 'Variação emocional' },
  { key: 'variacao_provocativa', label: 'Variação provocativa' },
]

/**
 * Caminhos de texto do roteiro de engajamento (aba Reels). Ao contrário do
 * carrossel, aqui não há slides — cada versão é um texto corrido só, então
 * cada campo é uma unidade fechada (isClosing: true).
 *
 * `pergunta_final` e `exercicio_pratico` ficam fora da regra de fechamento em
 * pergunta: a pergunta final É pra ser pergunta, isso é o formato, não o vício.
 */
export function engagementTextPaths(engResult) {
  const entries = []
  if (!engResult || typeof engResult !== 'object') return entries

  ENGAGEMENT_TEXT_FIELDS.forEach(({ key, label }) => {
    if (typeof engResult[key] === 'string') {
      entries.push({ path: [key], isClosing: true, short: false, label })
    }
  })

  if (typeof engResult.exercicio_pratico === 'string') {
    entries.push({ path: ['exercicio_pratico'], isClosing: false, short: true, label: 'Exercício prático' })
  }
  if (typeof engResult.pergunta_final === 'string') {
    entries.push({ path: ['pergunta_final'], isClosing: false, short: true, label: 'Pergunta final' })
  }

  return entries
}

/** Caminhos de texto de uma lista de hooks (aba Reels / Hooks). */
export function hookListPaths(result, key = 'hooks', field = 'texto') {
  const list = Array.isArray(result?.[key]) ? result[key] : []
  return list.flatMap((item, i) => {
    if (typeof item === 'string') return [{ path: [key, i], isClosing: false, short: true, label: `Hook ${i + 1}` }]
    if (typeof item?.[field] === 'string') return [{ path: [key, i, field], isClosing: false, short: true, label: `Hook ${i + 1}` }]
    return []
  })
}

/** Só o que exige reescrita (blocks). Warns ficam como sinalização. */
export function blockingFindings(findings) {
  return findings.filter((f) => f.blocks.length > 0)
}

/** Total de ocorrências bloqueantes, para o relatório na interface. */
export function countBlocks(findings) {
  return findings.reduce((n, f) => n + f.blocks.length, 0)
}

// ─── Reescrita automática (extraído do Studio Livre / UnifiedCreator) ─────────
// Mesma lógica de correção usada na aba "Criar" — reaproveitada aqui pra
// qualquer módulo que gere texto e precise reescrever o que a varredura
// bloqueou, em vez de só sinalizar.

/** Reescreve um texto corrido (content, caption, legenda) sem os padrões apontados. */
export async function rewriteWithoutCliches(apiKey, text, hits) {
  const list = hits.map(h => `- ${h.label}: "${h.match}"`).join('\n')
  const res = await fetch('/api/ai?action=gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      max_tokens: 4000,
      system: withManualOperacional(ANTI_AI_FILTER),
      messages: [{
        role: 'user',
        content: `O texto abaixo saiu com padrões proibidos pelo filtro de autenticidade. Reescreva SOMENTE os trechos apontados, em declaração direta (sujeito + verbo + complemento, sem negação prévia, sem contraste corretivo, sem pergunta retórica no fechamento — fechamento é conclusão prática, dado ou observação seca). Mantenha todo o resto idêntico: estrutura, quebras de linha, indicações. Retorne APENAS o texto completo corrigido, sem comentários.\n\nPADRÕES ENCONTRADOS:\n${list}\n\nTEXTO:\n${text}`,
      }],
    }),
  })
  if (!res.ok) throw new Error(`Erro ${res.status}`)
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text?.trim() || text
}

/* Reescrita em lote das linhas curtas — título, opções de título e ganchos.
   São o slide 1 do carrossel e a primeira frase do reel, e precisam do mesmo
   filtro. */
export async function rewriteShortLines(apiKey, entries) {
  const list = entries.map((e, i) =>
    `${i + 1}. "${e.text}"\n   padrões: ${e.blocks.map(h => `${h.label} → "${h.match}"`).join('; ')}`
  ).join('\n')

  const res = await fetch('/api/ai?action=gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      max_tokens: 1500,
      system: withManualOperacional(ANTI_AI_FILTER),
      messages: [{
        role: 'user',
        content: `As linhas abaixo saíram com padrões proibidos pelo filtro de autenticidade. Reescreva cada uma em declaração direta, mantendo o mesmo assunto e o mesmo comprimento aproximado. Sem contraste corretivo, sem promessa de revelação, sem pergunta retórica, sem frase de efeito genérica. Seja concreto: cena, número ou consequência real.\n\n${list}\n\nResponda APENAS com um array JSON de ${entries.length} strings, na mesma ordem, sem markdown.`,
      }],
    }),
  })
  if (!res.ok) throw new Error(`Erro ${res.status}`)
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || ''
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Resposta inválida')
  const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
  if (!Array.isArray(parsed) || parsed.length !== entries.length) throw new Error('Tamanho inesperado')
  return parsed.map((s, i) => (typeof s === 'string' && s.trim() ? s.trim() : entries[i].text))
}

/**
 * Varredura + correção completa de um resultado com forma aninhada (caminhos
 * de texto arbitrários, via `entriesFn`). Reescreve o que a varredura bloquear
 * e confere de novo — a reescrita também é probabilística e pode reintroduzir
 * o padrão. Até 2 passadas; o que sobrar vai para `remaining` em vez de sumir
 * em silêncio.
 */
export async function sweepAndFixPaths(apiKey, obj, entriesFn, bannedWords = []) {
  const MAX_PASSES = 2
  let fixed = 0

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const findings = blockingFindings(sweepPaths(obj, entriesFn(obj), bannedWords))
    if (!findings.length) break

    const longOnes = findings.filter((f) => !f.short)
    const shortOnes = findings.filter((f) => f.short)

    for (const f of longOnes) {
      const rewritten = await rewriteWithoutCliches(apiKey, f.text, f.blocks)
      if (rewritten && rewritten !== f.text) { setByPath(obj, f.path, rewritten); fixed += f.blocks.length }
    }

    if (shortOnes.length) {
      const rewritten = await rewriteShortLines(apiKey, shortOnes)
      shortOnes.forEach((f, i) => {
        const value = rewritten[i]
        if (!value || value === f.text) return
        setByPath(obj, f.path, value)
        fixed += f.blocks.length
      })
    }
  }

  const findings = sweepPaths(obj, entriesFn(obj), bannedWords)
  return { fixed, remaining: blockingFindings(findings), warns: findings.flatMap((f) => f.warns) }
}
