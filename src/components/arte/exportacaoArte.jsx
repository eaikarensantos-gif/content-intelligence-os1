import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import { zipSync } from 'fflate'
import { conferirTexto } from './avaliarLayouts'

export const mesmaArte = (a, b) => a.slides === b.slides && a.formato === b.formato && a.contador === b.contador

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

export async function revisarCards(projeto, indices, renderizar) {
  const resultado = []
  for (const i of indices) resultado.push({ indice: i, problemas: await comCanvas(projeto.slides[i], i, renderizar, conferirAcabamento) })
  return resultado
}

export async function gerarDownload(projeto, indices, renderizar, zip, progresso = () => {}) {
  const arquivos = {}
  for (const [n, i] of indices.entries()) {
    progresso(`Preparando imagem ${n + 1} de ${indices.length}…`)
    const url = await comCanvas(projeto.slides[i], i, renderizar, canvas => toPng(canvas, { width: canvas.offsetWidth, height: canvas.offsetHeight, pixelRatio: 1, cacheBust: true }))
    arquivos[`card-${String(i + 1).padStart(2, '0')}.png`] = new Uint8Array(await (await fetch(url)).arrayBuffer())
  }
  if (zip) return { blob: new Blob([zipSync(arquivos, { level: 0 })], { type: 'application/zip' }), nome: 'carrossel.zip' }
  const [nome, bytes] = Object.entries(arquivos)[0]
  return { blob: new Blob([bytes], { type: 'image/png' }), nome }
}
