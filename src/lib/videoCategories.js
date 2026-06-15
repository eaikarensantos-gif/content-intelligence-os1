// Pre-defined swipe categories → YouTube search queries.
// Each category maps to multiple queries so the swipe stack pulls varied results.
// Adapted from the Video Swipe feature spec (CLAUDE.md).

export const VIDEO_CATEGORIES = {
  Finanças: ['investimentos 2026', 'renda extra brasil', 'educação financeira'],
  Tech: ['inteligência artificial', 'startups brasil', 'programação web'],
  Marketing: ['marketing digital', 'crescimento instagram', 'copywriting'],
  Lifestyle: ['produtividade', 'rotina matinal', 'saúde mental criador'],
  Empreendedorismo: ['empreendedorismo brasil', 'negócio online', 'escalar negócio'],
  'Criação de Conteúdo': ['crescer nas redes sociais', 'algoritmo 2026', 'monetização'],
  Personalidades: ['entrevista personalidade', 'história de vida inspiradora', 'bastidores famosos'],
  Motivacional: ['mensagem motivacional', 'discurso motivacional', 'vídeo de motivação'],
  Discursos: ['discurso inspirador', 'palestra figura pública', 'melhores discursos da história'],
}

export const CATEGORY_NAMES = Object.keys(VIDEO_CATEGORIES)

// Flatten the selected categories into a de-duplicated list of { category, query }.
export function queriesForCategories(categories) {
  const seen = new Set()
  const out = []
  for (const category of categories) {
    const queries = VIDEO_CATEGORIES[category] || []
    for (const query of queries) {
      const key = `${category}::${query}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ category, query })
    }
  }
  return out
}
