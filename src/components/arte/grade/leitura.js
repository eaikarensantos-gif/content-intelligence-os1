// Leitura de cor no navegador: carrega a imagem, reduz num canvas pequeno e passa os pixels para analisarPixels.
import { analisarPixels } from './cor'

const LARGURA = 30
const ALTURA = 40

export const carregarImagem = (src, { anonimo = false } = {}) =>
  new Promise((ok, erro) => {
    const img = new Image()
    if (anonimo) img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = () => erro(new Error('Não consegui carregar a imagem.'))
    img.src = src
  })

/** Lança SecurityError se a imagem veio de outra origem sem CORS. */
export function amostrar(img) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  // A grade do perfil mostra o recorte central em 3:4; o desenho cobre o canvas do mesmo jeito.
  const escala = Math.max(LARGURA / img.width, ALTURA / img.height)
  const w = img.width * escala, h = img.height * escala
  ctx.drawImage(img, (LARGURA - w) / 2, (ALTURA - h) / 2, w, h)
  return analisarPixels(ctx.getImageData(0, 0, LARGURA, ALTURA).data)
}

/** Cor de uma imagem de data URL (a nossa própria renderização). */
export async function lerCorDeDataUrl(dataUrl) {
  return amostrar(await carregarImagem(dataUrl))
}

/**
 * Cor de uma miniatura do Instagram. Tenta direto; se a CDN não liberar a leitura dos pixels,
 * baixa pela API do servidor (baixarPelaApi devolve um data URL).
 */
export async function lerCorDeUrl(url, baixarPelaApi) {
  try {
    return amostrar(await carregarImagem(url, { anonimo: true }))
  } catch {
    return amostrar(await carregarImagem(await baixarPelaApi(url)))
  }
}
