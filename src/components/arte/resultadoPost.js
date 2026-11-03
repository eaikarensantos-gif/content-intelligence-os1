// Liga a arte ao resultado do post no Instagram. Funções puras: sem React, sem rede.
// Metas e regra de amostra vêm de .claude/sistema-de-conteudo.md (seções 2 e 3).
import { CARTAO } from './cartoes/colecao'
import { ehCartao } from './cartoes/render'
import { TEMPLATES } from './Templates'

export const META_SALVAMENTO = 0.4
export const BASE_SALVAMENTO = 0.16
export const MIN_AMOSTRAS = 4

/** Salvamentos ÷ curtidas. Sem salvamento medido ou sem curtida, não há razão. */
export const razaoSalvamento = (post) => (!post || post.saves == null || !post.likes ? null : post.saves / post.likes)

export const formatarRazao = (r) => (r == null ? '–' : r.toFixed(2).replace('.', ','))

export const acharPost = (posts = [], mediaId) => posts.find((p) => String(p.id) === String(mediaId)) ?? null

/** Nome do modelo do primeiro card (a capa), que é o que identifica a arte na comparação. */
export function nomeDoModelo(slide) {
  if (!slide) return 'Sem modelo'
  if (ehCartao(slide)) return CARTAO[slide.cartao]?.nome ?? slide.cartao
  return TEMPLATES[slide.template]?.nome ?? slide.template ?? 'Sem modelo'
}

/**
 * Agrupa as artes ligadas a um post por modelo da capa e tira a média de salvamento ÷ curtida.
 * Cada post conta uma vez por modelo, mesmo que várias artes apontem para ele. Com menos de
 * MIN_AMOSTRAS posts medidos o grupo aparece, mas marcado como insuficiente para decidir.
 */
export function agruparPorModelo(artes, posts) {
  const grupos = new Map()
  let semPost = 0
  for (const arte of artes) {
    const mediaId = arte.projeto?.publicacao?.mediaId
    if (!mediaId) continue
    const post = acharPost(posts, mediaId)
    if (!post) { semPost++; continue }
    const modelo = nomeDoModelo(arte.projeto.slides?.[0])
    const grupo = grupos.get(modelo) ?? { modelo, medidos: new Map(), semDado: new Set() }
    const razao = razaoSalvamento(post)
    if (razao == null) grupo.semDado.add(String(post.id))
    else grupo.medidos.set(String(post.id), razao)
    grupos.set(modelo, grupo)
  }
  const linhas = [...grupos.values()].map((g) => {
    const razoes = [...g.medidos.values()]
    return {
      modelo: g.modelo,
      amostras: razoes.length,
      semDado: g.semDado.size,
      media: razoes.length ? razoes.reduce((a, b) => a + b, 0) / razoes.length : null,
      suficiente: razoes.length >= MIN_AMOSTRAS,
    }
  })
  linhas.sort((a, b) => Number(b.suficiente) - Number(a.suficiente) || (b.media ?? -1) - (a.media ?? -1) || b.amostras - a.amostras)
  return { linhas, semPost }
}
