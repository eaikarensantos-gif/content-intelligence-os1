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

export function topicsFromThemeBank() {
  return TEMAS_CARROSSEL.map((c) => ({ label: c.categoria, query: c.categoria, source: 'tema' }))
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
