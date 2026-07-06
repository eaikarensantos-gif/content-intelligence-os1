// Pre-defined swipe categories → YouTube search queries.
// Each category maps to multiple queries so the swipe stack pulls varied results.

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
  'Cortes de Podcast': ['cortes de podcast', 'melhores momentos podcast', 'podcast brasil cortes'],
  'Personalidades Negras': [
    'discurso de personalidade negra',
    'palestra pessoa negra inspiradora',
    'artista negro brasileiro entrevista',
    'músico negro talk',
    'ator negra atriz negra entrevista',
    'político negro discurso',
    'pessoa negra LGBTQIA discurso',
    'pessoa negra com deficiência palestra',
  ],
}

export const CATEGORY_NAMES = Object.keys(VIDEO_CATEGORIES)

// Modifier categories don't search on their own — they refine the other
// selected themes. "Cortes de Podcast" + "Finanças" → "cortes de podcast
// investimentos 2026" etc. Selected alone, they fall back to generic queries.
export const MODIFIER_CATEGORIES = {
  'Cortes de Podcast': 'cortes de podcast',
}

// Build the de-duplicated list of { category, query } for the selected
// categories, applying modifier categories on top of the regular themes.
export function queriesForCategories(categories) {
  const modifiers = categories.filter((c) => MODIFIER_CATEGORIES[c])
  const themes = categories.filter((c) => !MODIFIER_CATEGORIES[c])

  const seen = new Set()
  const out = []
  const add = (category, query) => {
    const key = `${category}::${query}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ category, query })
  }

  // Regular themes → their own queries.
  for (const theme of themes) {
    for (const query of VIDEO_CATEGORIES[theme] || []) add(theme, query)
  }

  // Modifiers refine the selected themes; alone they use their generic queries.
  for (const mod of modifiers) {
    const prefix = MODIFIER_CATEGORIES[mod]
    if (themes.length > 0) {
      for (const theme of themes) {
        for (const query of VIDEO_CATEGORIES[theme] || []) {
          add(mod, `${prefix} ${query}`)
        }
      }
    } else {
      for (const query of VIDEO_CATEGORIES[mod] || []) add(mod, query)
    }
  }

  return out
}
