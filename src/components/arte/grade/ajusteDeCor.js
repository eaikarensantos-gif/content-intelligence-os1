// Troca de cor de fundo sugerida para um post novo, só nos modelos em que o texto fica direto sobre o fundo
// e sem foto (foto não tem uma cor única para trocar). Depois de aplicar, a cor real é lida de novo na renderização.
import { CORES } from '../marca'
import { contrasteHex, projetarFundo } from './cor'

// Modelos com título e texto direto sobre o fundo.
const MODELOS = ['corCheia', 'caixa', 'selecao', 'chat', 'busca']
// Cores que apagariam um elemento desenhado do próprio modelo (borda, caixa ou barra da mesma cor do fundo).
const EVITAR = { caixa: ['tinta'], chat: ['areia'], busca: ['creme'], selecao: ['creme', 'pessego'] }
const MINIMO = { corTitulo: 3, corTexto: 4.5, corDestaque: 3 }

export const podeTrocarFundo = (slide) => !!slide && MODELOS.includes(slide.template) && !slide.foto && !slide.recorte && slide.fundo in CORES

/**
 * O mesmo slide com outro fundo. Se alguma cor de texto perder contraste, ela passa para creme ou tinta,
 * a que ler melhor. Devolve null quando o fundo não serve para o modelo.
 */
export function variantePorFundo(slide, fundoId) {
  if (!podeTrocarFundo(slide) || fundoId === slide.fundo || !(fundoId in CORES) || EVITAR[slide.template]?.includes(fundoId)) return null
  const fundo = CORES[fundoId].hex
  const novo = { ...slide, fundo: fundoId }
  for (const [campo, minimo] of Object.entries(MINIMO)) {
    const atual = CORES[slide[campo]]?.hex
    if (atual && contrasteHex(atual, fundo) >= minimo) continue
    const [id, contraste] = ['creme', 'tinta'].map((c) => [c, contrasteHex(CORES[c].hex, fundo)]).sort((a, b) => b[1] - a[1])[0]
    if (contraste < minimo) return null
    novo[campo] = id
  }
  return novo
}

/**
 * Melhor fundo para um post novo. `notaCom(tile)` devolve a nota da grade inteira com este tile no lugar do atual.
 * Só sugere se a nota subir pelo menos `ganhoMinimo` pontos. Empate fica com a menor mudança de texto.
 */
export function sugerirFundo(slide, tile, notaCom, { ganhoMinimo = 3 } = {}) {
  if (!podeTrocarFundo(slide) || tile?.energia == null) return null
  const base = notaCom(tile)
  let melhor = null
  for (const id of Object.keys(CORES)) {
    const variante = variantePorFundo(slide, id)
    if (!variante) continue
    const nota = notaCom(projetarFundo(tile, CORES[slide.fundo].hex, CORES[id].hex))
    const mudancas = Object.keys(MINIMO).filter((c) => variante[c] !== slide[c]).length
    if (nota - base < ganhoMinimo) continue
    if (!melhor || nota > melhor.nota + 1e-9 || (Math.abs(nota - melhor.nota) < 1e-9 && mudancas < melhor.mudancas)) melhor = { fundo: id, slide: variante, nota, ganho: nota - base, mudancas }
  }
  return melhor
}
