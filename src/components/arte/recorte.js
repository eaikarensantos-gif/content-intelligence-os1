// Recorte da pessoa no navegador (MediaPipe, modelo selfie multiclass). O motor e o modelo ficam em
// public/marca: o app roda com Cross-Origin-Embedder-Policy, então buscar de outro domínio falharia.
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

let segmentador

const abrir = (src) =>
  new Promise((ok, erro) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = erro
    img.src = src
  })

/** Devolve um PNG do mesmo tamanho da foto, com tudo transparente menos a pessoa. */
export async function recortarPessoa(fotoDataUrl) {
  if (!segmentador) {
    const visao = await FilesetResolver.forVisionTasks('/marca/wasm')
    segmentador = await ImageSegmenter.createFromOptions(visao, {
      baseOptions: { modelAssetPath: '/marca/modelos/selfie_multiclass.tflite' },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    })
  }
  const img = await abrir(fotoDataUrl)
  const { width: w, height: h } = img
  const resultado = segmentador.segment(img)
  const categorias = resultado.categoryMask.getAsUint8Array()
  resultado.close()

  // Categoria 0 é fundo; qualquer outra (cabelo, pele, roupa, acessório) é pessoa.
  const mascara = document.createElement('canvas')
  mascara.width = w
  mascara.height = h
  const mctx = mascara.getContext('2d')
  const dados = mctx.createImageData(w, h)
  for (let i = 0; i < categorias.length; i++) dados.data[i * 4 + 3] = categorias[i] > 0 ? 255 : 0
  mctx.putImageData(dados, 0, 0)

  const saida = document.createElement('canvas')
  saida.width = w
  saida.height = h
  const ctx = saida.getContext('2d')
  ctx.drawImage(img, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  // Borda levemente suavizada para não sobrar serrilhado nem halo do fundo.
  ctx.filter = `blur(${Math.max(1, Math.round(w / 900))}px)`
  ctx.drawImage(mascara, 0, 0)
  return saida.toDataURL('image/png')
}

/** Reduz a foto enviada para no máximo 1600px no lado maior: basta para 1080 de largura e cabe no rascunho. */
export async function prepararFoto(arquivo) {
  const url = await new Promise((ok) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(leitor.result)
    leitor.readAsDataURL(arquivo)
  })
  const img = await abrir(url)
  const k = Math.min(1, 1600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k)
  c.height = Math.round(img.height * k)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.9)
}
