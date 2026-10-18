import { CARTAO } from './colecao'
import { EMOJIS, FONTES, hex } from '../marca'

// Os geradores originais usam os nomes de família Bootzy, Inter, InstrSerif e Hand.
// No site as mesmas fontes estão declaradas como 'KS ...' (marca.css).
const FAMILIAS = { Inter: "'KS Inter'", Bootzy: "'KS Bootzy'", InstrSerif: "'KS Instrument'", Hand: "'KS Kinder'" }
export const fontes = (html) =>
  html
    .replace(/font-family:(Inter|Bootzy|InstrSerif|Hand)\b/g, (_, f) => `font-family:${FAMILIAS[f]}`)
    .replace(/(font:[^;"]*?)\b(Inter|Bootzy|InstrSerif|Hand)\b/g, (_, antes, f) => antes + FAMILIAS[f])
    .replace(/font-family="(Inter|Bootzy|InstrSerif|Hand)"/g, (_, f) => `font-family="${FAMILIAS[f].replace(/'/g, '')}"`)

// Granulado de papel dos cards originais.
const GRAO = '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:multiply"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .17 0 0 0 0 .13 0 0 0 0 .1 0 0 0 .14 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>'

const PASTA = '/marca/cartoes/'
export const formatoDe = (def) => def.formato ?? 'feed'

/** Foto padrão de um espaço: o arquivo original do card. */
export const fotoPadrao = (def, nome) => PASTA + (def.cabeca && nome === def.cabeca.slot ? def.cabeca.base : nome)
export const urlFoto = (def, arte, nome) => arte.fotos?.[nome] || fotoPadrao(def, nome)

/** Espaços de foto do card, na ordem em que aparecem. */
export const fotosDe = (def) => {
  const nomes = []
  const anotar = (n) => { if (!nomes.includes(n)) nomes.push(n); return 'url(x)' }
  const t = Object.fromEntries(def.campos.map((c) => [c.id, c.padrao]))
  def.html({ t, F: anotar, R: () => 'url(x)' })
  return nomes
}

/** Campos que recebem o título e o texto dela na troca de modelo. */
export const camposPrincipais = (def) => ({ titulo: def.recebe?.[0] ?? undefined, texto: def.recebe?.[1] ?? undefined })

const comparar = (t = '') => String(t).replace(/\*/g, '').replace(/\s+/g, '')

/**
 * Texto dela maior que o lugar do modelo: primeiro o elemento passa a quebrar linha na largura da arte
 * (a 40px das bordas); se ainda passar da altura, encolhe. Só mexe em elemento com texto dela que saiu
 * da arte e que ela não moveu nem redimensionou.
 */
export function caberNoQuadro(raiz, def, arte) {
  if (!raiz) return
  const { titulo, texto } = camposPrincipais(def)
  const padrao = Object.fromEntries(def.campos.map((c) => [c.id, c.padrao]))
  const alvos = [titulo, texto].filter((id) => id && arte.textos?.[id] && arte.textos[id] !== padrao[id]).map((id) => comparar(arte.textos[id])).filter(Boolean)
  const M = 40
  ;[...raiz.children].forEach((el, i) => {
    // Desfaz o encaixe da vez anterior antes de medir de novo.
    if (el.dataset.cabe) {
      const o = JSON.parse(el.dataset.cabe)
      el.style.width = o.w
      el.querySelectorAll('[data-ws]').forEach((d) => { d.style.whiteSpace = d.dataset.ws; delete d.dataset.ws })
      el.style.whiteSpace = o.ws
      delete el.dataset.cabe
    }
    el.style.transformOrigin = ''
    const c = arte.camadas?.[i] ?? {}
    if (!alvos.length || c.dx || c.dy || c.escala || !alvos.some((a) => comparar(el.textContent).includes(a))) return
    const caixa = raiz.getBoundingClientRect()
    const k = caixa.width / def.w || 1
    const medir = () => {
      const faixa = document.createRange()
      faixa.selectNodeContents(el)
      const r = faixa.getBoundingClientRect()
      const e = el.getBoundingClientRect()
      return { r, e, esq: (r.left - caixa.left) / k, dir: (r.right - caixa.left) / k, topo: (r.top - caixa.top) / k, base: (r.bottom - caixa.top) / k, elEsq: (e.left - caixa.left) / k }
    }
    let m = medir()
    if (m.esq >= 0 && m.dir <= def.w && m.base <= def.h) return
    let dx = 0
    if (m.esq < 0 || m.dir > def.w) {
      el.dataset.cabe = JSON.stringify({ w: el.style.width, ws: el.style.whiteSpace })
      // Tudo que estava travado numa linha só passa a quebrar.
      el.querySelectorAll('*').forEach((d) => { if (getComputedStyle(d).whiteSpace === 'nowrap') { d.dataset.ws = d.style.whiteSpace; d.style.whiteSpace = 'normal' } })
      el.style.whiteSpace = 'normal'
      el.style.width = `${def.w - 2 * M}px`
      m = medir()
      dx = M - m.elEsq
    }
    // Passou da altura: primeiro sobe (até 40px do topo); só encolhe se nem assim couber.
    const alt = m.base - m.topo
    const s = Math.min(1, (def.h - 2 * M) / alt)
    const topoNovo = Math.min(Math.max(m.topo, M), def.h - M - alt * s)
    const dy = topoNovo - m.topo
    if (s < 1) {
      el.style.transformOrigin = `${(m.r.left - m.e.left) / k}px ${(m.r.top - m.e.top) / k}px`
      el.style.scale = String(s)
    }
    el.style.translate = `${dx}px ${dy}px`
  })
}

export const textosDe = (def, arte) => ({ ...Object.fromEntries(def.campos.map((c) => [c.id, c.padrao])), ...(arte?.textos ?? {}) })

/** HTML completo do card com os textos e fotos do slide. */
export function htmlCartao(def, arte, { grao = true } = {}) {
  const F = (n) => `url('${urlFoto(def, arte, n)}')`
  const R = (n) => {
    const k = `${n}:recorte`
    if (arte.fotos && k in arte.fotos) return arte.fotos[k] ? `url('${arte.fotos[k]}')` : 'none'
    return `url('${PASTA}${def.cabeca.recorte}')`
  }
  return fontes(def.html({ t: textosDe(def, arte), F, R })) + (grao ? GRAO : '')
}

// ---------- slide ----------
export const novoCartao = (id, herdado = {}) => ({ template: 'cartao', cartao: id, fundo: 'tinta', textos: {}, fotos: {}, camadas: {}, emojis: [], ...herdado })

export const normalizarCartao = (s) => ({
  ...novoCartao(s.cartao),
  ...s,
  textos: { ...(s.textos ?? {}) },
  fotos: { ...(s.fotos ?? {}) },
  camadas: { ...(s.camadas ?? {}) },
  emojis: (s.emojis ?? []).filter((e) => EMOJIS.includes(e.cod)),
})

export const ehCartao = (s) => s?.template === 'cartao' && s.cartao in CARTAO

// ---------- camadas (cada filho direto do card) ----------
/** Índice da camada (filho direto da raiz) que contém o elemento, ou -1. */
export const camadaDe = (raiz, el) => {
  while (el && el !== raiz) {
    if (el.parentNode === raiz) return [...raiz.children].indexOf(el)
    el = el.parentNode
  }
  return -1
}

/** Aplica os ajustes da pessoa sobre o HTML original, guardando o estilo de origem para poder voltar. */
export function aplicarCamadas(raiz, camadas = {}, selecionado = null, estiloLote = {}) {
  if (!raiz) return
  const elementos = [...raiz.children]
  const recorte = elementos.findIndex((el) => el.hasAttribute('data-recorte-pessoa'))
  elementos.forEach((el, i) => {
    if (!el.dataset.orig) el.dataset.orig = JSON.stringify({ color: el.style.color, fontFamily: el.style.fontFamily, clipPath: el.style.clipPath, backgroundColor: el.style.backgroundColor })
    const orig = JSON.parse(el.dataset.orig)
    const o = camadas[i] ?? {}
    // Ordem explícita sem mover nós: os índices de camadas dos rascunhos continuam válidos.
    if (recorte >= 0) el.style.zIndex = String(o.plano === 'atras' ? recorte * 10 - 1 : o.plano === 'frente' ? recorte * 10 + 1 : i * 10)
    el.style.translate = o.dx || o.dy ? `${o.dx ?? 0}px ${o.dy ?? 0}px` : ''
    el.style.scale = o.escala && o.escala !== 1 ? String(o.escala) : ''
    if (el.classList.contains('ft') && !el.style.backgroundImage.includes('url(')) el.style.backgroundColor = estiloLote.fundo ? hex(estiloLote.fundo) : orig.backgroundColor || ''
    el.style.color = o.cor ? hex(o.cor) : estiloLote.cor && el.textContent.trim() ? hex(estiloLote.cor) : orig.color
    el.style.fontFamily = o.fonte && FONTES[o.fonte] ? FONTES[o.fonte].css : estiloLote.fonte && el.textContent.trim() ? FONTES[estiloLote.fonte]?.css || orig.fontFamily : orig.fontFamily
    for (const filho of el.querySelectorAll('*')) {
      if (!filho.textContent.trim() || filho.closest('svg')) continue
      if (!filho.dataset.loteOriginal) filho.dataset.loteOriginal = JSON.stringify({ color: filho.style.color, fontFamily: filho.style.fontFamily })
      const original = JSON.parse(filho.dataset.loteOriginal)
      filho.style.color = estiloLote.cor ? hex(o.cor || estiloLote.cor) : original.color
      filho.style.fontFamily = estiloLote.fonte ? FONTES[o.fonte || estiloLote.fonte]?.css || original.fontFamily : original.fontFamily
    }
    const { cima = 0, dir = 0, baixo = 0, esq = 0 } = o.corte ?? {}
    el.style.clipPath = cima || dir || baixo || esq ? `inset(${cima}% ${dir}% ${baixo}% ${esq}%)` : orig.clipPath
    el.style.visibility = o.oculto ? 'hidden' : ''
    const sel = selecionado === `camada:${i}`
    el.style.outline = sel ? '4px dashed #F97316' : ''
    el.style.outlineOffset = sel ? '6px' : ''
  })
}

/** Nome curto da camada para o painel. */
export function descreverCamada(el) {
  if (!el) return 'Elemento'
  const texto = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (el.tagName === 'IMG') return 'Emoji'
  if (texto) return `“${texto.length > 32 ? `${texto.slice(0, 32)}…` : texto}”`
  if (/url\(/.test(el.getAttribute('style') ?? '') || el.querySelector?.('[style*="url("]')) return 'Foto'
  return 'Forma'
}

/** Identifica os campos que desenham a camada, inclusive textos divididos em linhas ou sílabas. */
export function camposDaCamada(def, arte, indice) {
  if (indice < 0) return []
  const valores = textosDe(def, arte)
  return def.campos.filter((campo, i) => {
    const marca = `CIOCAMPO${i}MARCADOR`
    const valor = String(valores[campo.id] ?? '').replace(/(^|[\n-])/g, `$1${marca}`)
    const fragmento = document.createElement('template')
    fragmento.innerHTML = def.html({ t: { ...valores, [campo.id]: valor }, F: () => 'none', R: () => 'none' })
    return fragmento.content.children[indice]?.textContent.includes(marca)
  })
}
