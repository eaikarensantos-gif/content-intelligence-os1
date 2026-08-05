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

import { detectCliches } from './clicheDetector'
import { lintText } from '../utils/brandLinter'

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
 * Varre um texto com as duas camadas e devolve os achados normalizados.
 * `isClosing = false` desliga a regra de fechamento em pergunta (títulos,
 * ganchos e slides que não são o último).
 */
export function sweepText(text, { isClosing = true } = {}) {
  const blocks = []
  const warns = []
  if (!text || typeof text !== 'string') return { blocks, warns }

  const det = detectCliches(text)
  det.blocks.forEach((h) => {
    if (!isClosing && h.id === CLOSING_RULE) return
    blocks.push(norm(h, 'estrutura'))
  })
  det.warns.forEach((h) => warns.push(norm(h, 'estrutura')))

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
export function sweepSlides(content) {
  const slides = splitSlides(content)
  const blocks = []
  const warns = []

  slides.forEach((slide, idx) => {
    const isLast = idx === slides.length - 1
    const { blocks: b, warns: w } = sweepText(slide.text, { isClosing: isLast })
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
export function sweepResult(result, { format } = {}) {
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
      isCarrossel ? sweepSlides(result.content) : sweepText(result.content))
  }

  if (result.caption) push('caption', undefined, result.caption, sweepText(result.caption))

  // Campos curtos: título é o slide 1 do carrossel, gancho é a primeira frase
  if (result.title) push('title', undefined, result.title, sweepText(result.title, { isClosing: false }))

  ;['title_options', 'hook_alternatives'].forEach((field) => {
    const list = Array.isArray(result[field]) ? result[field] : []
    list.forEach((line, index) => {
      push(field, index, line, sweepText(line, { isClosing: false }))
    })
  })

  return findings
}

/** Só o que exige reescrita (blocks). Warns ficam como sinalização. */
export function blockingFindings(findings) {
  return findings.filter((f) => f.blocks.length > 0)
}

/** Total de ocorrências bloqueantes, para o relatório na interface. */
export function countBlocks(findings) {
  return findings.reduce((n, f) => n + f.blocks.length, 0)
}
