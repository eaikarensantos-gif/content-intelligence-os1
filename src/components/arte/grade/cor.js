// Leitura de cor de uma imagem pequena e medidas simples usadas na nota de harmonia da grade.
// Funções puras: recebem pixels RGBA (o que o canvas devolve) e não tocam em DOM nem em rede.

export const LIMIAR_BARULHO = 0.6

const limitar = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export const hexParaRgb = (hex) => {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Matiz em graus (0 a 360) e croma (0 a 1) de uma cor RGB 0..255. */
function matizEcroma(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let matiz = 0
  if (d) {
    if (max === r) matiz = ((g - b) / d) % 6
    else if (max === g) matiz = (b - r) / d + 2
    else matiz = (r - g) / d + 4
    matiz = (matiz * 60 + 360) % 360
  }
  return { matiz, croma: d / 255 }
}

const luzDe = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/**
 * Régua de barulho: quanto a cor "grita" no feed. Mistura o croma médio (cor viva) com a variação de
 * luz dentro da imagem (muito contraste). Heurística de apresentação, não uma medida científica.
 * Na paleta da marca: creme, areia, café e tinta ficam calmos; pêssego fica no meio; mostarda e terracota passam de 0,6.
 */
export const barulhoDe = (cromaMedio, desvioLuz) => limitar(1.6 * cromaMedio + 0.5 * desvioLuz - 0.05)

const BINS = 12 // famílias de matiz de 30 graus

/**
 * Lê uma amostra RGBA e devolve { hex, energia, luz, tom, neutro }.
 * tom é o matiz dominante em graus; neutro vale true quando quase não há cor (creme, cinza, preto).
 * Devolve null se a amostra não tiver pixel opaco.
 */
export function analisarPixels(rgba) {
  let n = 0, r = 0, g = 0, b = 0, croma = 0, luz = 0, luz2 = 0
  const pesos = new Array(BINS).fill(0)
  let colorido = 0
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    const [pr, pg, pb] = [rgba[i], rgba[i + 1], rgba[i + 2]]
    n++; r += pr; g += pg; b += pb
    const m = matizEcroma(pr, pg, pb)
    const l = luzDe(pr, pg, pb)
    croma += m.croma; luz += l; luz2 += l * l
    if (m.croma >= 0.12) { pesos[Math.floor(m.matiz / (360 / BINS)) % BINS] += m.croma; colorido++ }
  }
  if (!n) return null
  const luzMedia = luz / n
  const desvio = Math.sqrt(Math.max(0, luz2 / n - luzMedia * luzMedia))
  const dominante = pesos.indexOf(Math.max(...pesos))
  const neutro = colorido / n < 0.12
  const h2 = (v) => Math.round(v / n).toString(16).padStart(2, '0')
  return {
    hex: `#${h2(r)}${h2(g)}${h2(b)}`.toUpperCase(),
    energia: barulhoDe(croma / n, desvio),
    luz: luzMedia,
    tom: neutro ? null : dominante * (360 / BINS) + 360 / BINS / 2,
    neutro,
  }
}

/** Barulho, luz e matiz de uma cor chapada (sem texto por cima). */
export function propsDeHex(hex) {
  const [r, g, b] = hexParaRgb(hex)
  const { matiz, croma } = matizEcroma(r, g, b)
  return { hex: hex.toUpperCase(), energia: barulhoDe(croma, 0), luz: luzDe(r, g, b), tom: croma < 0.12 ? null : matiz, neutro: croma < 0.12 }
}

/**
 * Como o tile fica se o fundo chapado trocar de uma cor para outra: soma a diferença entre as duas cores
 * chapadas, então o que veio do texto e da composição continua valendo.
 */
export function projetarFundo(tile, fundoAtual, fundoNovo) {
  const a = propsDeHex(fundoAtual)
  const b = propsDeHex(fundoNovo)
  return { ...tile, hex: b.hex, energia: limitar(tile.energia + b.energia - a.energia), luz: limitar(tile.luz + b.luz - a.luz), tom: b.tom, neutro: b.neutro }
}

const canal = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const luminancia = (hex) => { const [r, g, b] = hexParaRgb(hex); return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b) }

/** Razão de contraste WCAG entre duas cores hex. */
export function contrasteHex(a, b) {
  const x = luminancia(a), y = luminancia(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Família de matiz usada para dizer se duas cores "são da mesma cor": 45 graus cada, a volta fecha no vermelho. */
export const familiaDeTom = (tom) => (tom == null ? null : Math.floor(((tom + 22.5) % 360) / 45))
