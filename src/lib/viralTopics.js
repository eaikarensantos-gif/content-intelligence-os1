// Fonte de temas pro Buscador de Vídeos Virais — combina os Pilares de
// Conteúdo reais definidos em /posicionamento com as categorias do banco de
// temas do Carrossel (src/data/temasCarrossel.js), em vez das categorias
// genéricas fixas do Video Swipe (Finanças, Tech, Marketing...), que não têm
// relação com o que a Karen de fato fala.

import { TEMAS_CARROSSEL } from '../data/temasCarrossel'

// pilares: [{ id, nome, objetivo, formato_preferido, gancho_tipico, exemplo }]
export function topicsFromPositioning(pilares = []) {
  return pilares
    .filter((p) => p.nome?.trim())
    .map((p) => ({ label: p.nome.trim(), query: p.nome.trim(), source: 'pilar' }))
}

// Categorias cujo nome de exibição é ambíguo pra busca de vídeo. "Criativos"
// em PT-BR é dominado por conteúdo de "criativos de anúncio" (marketing/ads),
// então buscar pelo nome da categoria puxa tutorial de ferramenta de ads, não
// conteúdo sobre profissionais criativos. Query alternativa só pra busca —
// o label de exibição continua o nome real da categoria.
const SEARCH_QUERY_OVERRIDES = {
  'IA para profissionais criativos': 'IA para designers, redatores e diretores de arte',
}

export function topicsFromThemeBank() {
  return TEMAS_CARROSSEL.map((c) => ({
    label: c.categoria,
    query: SEARCH_QUERY_OVERRIDES[c.categoria] || c.categoria,
    source: 'tema',
  }))
}

// Combina as duas fontes, deduplicando por label (case-insensitive).
export function combinedViralTopics(pilares = []) {
  const combined = [...topicsFromPositioning(pilares), ...topicsFromThemeBank()]
  const seen = new Set()
  return combined.filter((t) => {
    const key = t.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
