import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import { strToU8, zipSync } from 'fflate'
import { conferirTexto } from './avaliarLayouts'

// O texto alternativo (slide.alt) não muda a arte desenhada: editar não pode invalidar a revisão.
const igualSemAlt = (s, t) => {
  if (s === t) return true
  const chaves = (o) => Object.keys(o).filter((k) => k !== 'alt')
  const ks = chaves(s)
  return ks.length === chaves(t).length && ks.every((k) => s[k] === t[k])
}
export const mesmaArte = (a, b) => a.formato === b.formato && a.contador === b.contador
  && (a.slides === b.slides || (a.slides.length === b.slides.length && a.slides.every((s, i) => igualSemAlt(s, b.slides[i]))))

export function contraste(a, b) {
  const lum = rgb => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const rgb = valor => valor.match(/[\d.]+/g)?.map(Number)
export function conferirAcabamento(canvas) {
  const problemas = new Set(conferirTexto(canvas).problemas)
  const fotos = !!canvas.querySelector('[data-foto]') || [...canvas.querySelectorAll('*')].some(e => getComputedStyle(e).backgroundImage.includes('url('))
  const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT)
  let no
  while ((no = walker.nextNode())) {
    if (!no.textContent.trim() || no.parentElement.closest('svg')) continue
    const el = no.parentElement
    const estilo = getComputedStyle(el)
    if (estilo.visibility === 'hidden' || !el.getClientRects().length) continue
    const tamanho = parseFloat(estilo.fontSize)
    if (tamanho < 28) problemas.add('Fonte pequena para leitura no celular')
    let ancestral = el, fundo = null
    while (ancestral) {
      const css = getComputedStyle(ancestral)
      // Foto sob o texto não tem uma cor única: não declarar contraste aprovado.
      const superficie = ancestral === canvas || ancestral.classList.contains('kc')
      if (css.backgroundImage.includes('url(') || (superficie && fotos)) break
      if (superficie) {
        const plano = canvas.querySelector('.kc > .ft')
        const corPlano = plano ? rgb(getComputedStyle(plano).backgroundColor) : null
        if (corPlano && (corPlano.length === 3 || corPlano[3] === 1)) { fundo = corPlano; break }
      }
      const cor = rgb(css.backgroundColor)
      if (cor && (cor.length === 3 || cor[3] === 1)) { fundo = cor; break }
      if (ancestral === canvas) break
      ancestral = ancestral.parentElement
    }
    const frente = rgb(estilo.color)
    if (fundo && frente && contraste(frente.slice(0, 3), fundo.slice(0, 3)) < (tamanho >= 48 ? 3 : 4.5)) problemas.add('Contraste baixo entre texto e fundo')
    if (!fundo && fotos) problemas.add('Confira visualmente o contraste do texto sobre a foto')
  }
  return [...problemas]
}

async function comCanvas(slide, indice, renderizar, acao) {
  const host = document.createElement('div')
  Object.assign(host.style, { position: 'fixed', left: '-20000px', top: '0', width: '1080px', pointerEvents: 'none' })
  host.setAttribute('aria-hidden', 'true')
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(renderizar(slide, indice)))
    await document.fonts.ready
    await new Promise(r => requestAnimationFrame(r))
    const canvas = host.firstElementChild
    return await acao(canvas)
  } finally { root.unmount(); host.remove() }
}

/** PNG reduzido de um card (a miniatura da grade do Instagram), com as fontes já carregadas. */
export const miniaturaDoCard = (slide, indice, renderizar, pixelRatio = 0.4) =>
  comCanvas(slide, indice, renderizar, canvas => toPng(canvas, { width: canvas.offsetWidth, height: canvas.offsetHeight, pixelRatio, cacheBust: true }))

export async function revisarCards(projeto, indices, renderizar) {
  const resultado = []
  for (const i of indices) resultado.push({ indice: i, problemas: await comCanvas(projeto.slides[i], i, renderizar, conferirAcabamento) })
  return resultado
}

/** Uma página por card, no tamanho da arte (1080 de largura): o formato que o LinkedIn aceita para carrossel. */
export async function montarPdf(imagens) {
  const { jsPDF } = await import('jspdf')
  let doc
  for (const { url, w, h } of imagens) {
    const orientacao = w > h ? 'l' : 'p'
    if (!doc) doc = new jsPDF({ unit: 'px', format: [w, h], orientation: orientacao, hotfixes: ['px_scaling'], compress: true })
    else doc.addPage([w, h], orientacao)
    doc.addImage(url, 'PNG', 0, 0, w, h, undefined, 'FAST')
  }
  return doc.output('blob')
}

/** formato: 'zip' (PNGs em ordem), 'png' (um card) ou 'pdf' (uma página por card). Booleano segue valendo: true = zip, false = png. */
export async function gerarDownload(projeto, indices, renderizar, formato, progresso = () => {}, extras = {}) {
  const tipo = formato === true ? 'zip' : formato === false ? 'png' : formato
  const imagens = []
  for (const [n, i] of indices.entries()) {
    progresso(`Preparando imagem ${n + 1} de ${indices.length}…`)
    const imagem = await comCanvas(projeto.slides[i], i, renderizar, async canvas => ({
      i, w: canvas.offsetWidth, h: canvas.offsetHeight,
      url: await toPng(canvas, { width: canvas.offsetWidth, height: canvas.offsetHeight, pixelRatio: 1, cacheBust: true }),
    }))
    imagens.push(imagem)
  }
  if (tipo === 'pdf') {
    progresso('Montando o PDF…')
    return { blob: await montarPdf(imagens), nome: 'carrossel.pdf' }
  }
  const arquivos = {}
  for (const { i, url } of imagens) arquivos[`card-${String(i + 1).padStart(2, '0')}.png`] = new Uint8Array(await (await fetch(url)).arrayBuffer())
  if (tipo === 'zip') for (const [nome, texto] of Object.entries(extras)) arquivos[nome] = strToU8(texto)
  if (tipo === 'zip') return { blob: new Blob([zipSync(arquivos, { level: 0 })], { type: 'application/zip' }), nome: 'carrossel.zip' }
  const [nome, bytes] = Object.entries(arquivos)[0]
  return { blob: new Blob([bytes], { type: 'image/png' }), nome }
}
