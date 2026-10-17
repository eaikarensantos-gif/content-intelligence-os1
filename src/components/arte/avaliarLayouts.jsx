import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { classificarLayouts, idLayout } from './layoutSuggestions'

const dentro = (a, b, folga = 3) => a.left >= b.left - folga && a.top >= b.top - folga && a.right <= b.right + folga && a.bottom <= b.bottom + folga
const sobrepoe = (a, b) => {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 4 && h > 4 && w * h > Math.min(a.width * a.height, b.width * b.height) * 0.18
}

/** Mede o texto renderizado com as fontes reais, em pixels do PNG, sem estimativa por caracteres. */
export function conferirTexto(canvas) {
  const problemas = new Set()
  const bounds = canvas.getBoundingClientRect()
  const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT)
  const trechos = []
  let no
  while ((no = walker.nextNode())) {
    if (!no.textContent.trim()) continue
    const el = no.parentElement
    if (!el || getComputedStyle(el).visibility === 'hidden' || el.closest('svg defs')) continue
    const range = document.createRange()
    range.selectNodeContents(no)
    const rects = [...range.getClientRects()].filter(r => r.width && r.height)
    if (!rects.length) continue
    const estilo = getComputedStyle(el)
    if (no.textContent.trim().length > 80 && parseFloat(estilo.fontSize) < 28) problemas.add('Texto longo com fonte pequena')
    if (estilo.fontFamily.includes('KS ') && !document.fonts.check(`${estilo.fontSize} ${estilo.fontFamily.split(',')[0]}`)) problemas.add('Fonte não carregada; não foi possível conferir')
    for (const rect of rects) {
      if (!dentro(rect, bounds)) problemas.add('Texto ultrapassa a borda da arte')
      let ancestral = el
      while (ancestral && ancestral !== canvas) {
        const css = getComputedStyle(ancestral)
        if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowX) && (rect.left < ancestral.getBoundingClientRect().left - 3 || rect.right > ancestral.getBoundingClientRect().right + 3)) problemas.add('Texto cortado pelo bloco')
        if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowY) && (rect.top < ancestral.getBoundingClientRect().top - 3 || rect.bottom > ancestral.getBoundingClientRect().bottom + 3)) problemas.add('Texto cortado pelo bloco')
        ancestral = ancestral.parentElement
      }
      trechos.push({ rect })
    }
  }
  if (!trechos.length) problemas.add('Não há texto visível para conferir')
  for (let i = 0; i < trechos.length; i++) {
    for (let j = i + 1; j < trechos.length; j++) {
      if (sobrepoe(trechos[i].rect, trechos[j].rect)) problemas.add('Blocos de texto se sobrepõem')
    }
  }
  return { cabe: problemas.size === 0, problemas: [...problemas] }
}

/** Até três opções aprovadas; sem opção segura, o conteúdo original é mantido. */
export async function avaliarLayouts(source, contexto, renderizar) {
  const candidatos = classificarLayouts(source, contexto)
  const container = document.createElement('div')
  Object.assign(container.style, { position: 'fixed', left: '-20000px', top: '0', width: '1080px', opacity: '0', pointerEvents: 'none' })
  container.setAttribute('aria-hidden', 'true')
  document.body.appendChild(container)
  const root = createRoot(container)
  const opcoes = []
  let atual = null
  let conferidos = 0
  try {
    // O modelo atual também é conferido, mesmo quando perde no pré-filtro.
    const origem = candidatos.find(c => c.id === idLayout(source))
    const verificar = async slide => {
      conferidos++
      flushSync(() => root.render(renderizar(slide)))
      await document.fonts.ready
      await new Promise(resolve => requestAnimationFrame(resolve))
      return conferirTexto(container.firstElementChild)
    }
    atual = await verificar(source)
    for (const candidato of candidatos) {
      const teste = candidato === origem ? atual : await verificar(candidato.slide)
      if (!teste.cabe) continue
      opcoes.push({ id: candidato.id, nome: candidato.nome, pontos: candidato.pontos, motivos: [...candidato.motivos, 'Texto conferido na prévia'], slide: candidato.slide })
      if (opcoes.length === 3) break
    }
    return { opcoes, problemas: atual.problemas, avaliados: conferidos, compativeis: candidatos.length }
  } finally {
    root.unmount()
    container.remove()
  }
}
