// Swipe categories. Each category has:
//   - type: 'topic' (a subject area), 'subject' (people who speak/perform), or
//           'modifier' (refines others, e.g. podcast cuts)
//   - term: a short phrase used when combining categories
//   - queries: the standalone search queries used when the category is alone
//
// Combining categories is intersectional: e.g. "Personalidades Negras" (subject)
// + "Tech" (topic) → "personalidades negras falando sobre tecnologia".

const CATEGORY_META = {
  Finanças: {
    type: 'topic', term: 'finanças',
    queries: ['investimentos 2026', 'renda extra brasil', 'educação financeira'],
  },
  Tech: {
    type: 'topic', term: 'tecnologia',
    queries: ['inteligência artificial', 'startups brasil', 'programação web'],
  },
  Marketing: {
    type: 'topic', term: 'marketing',
    queries: ['marketing digital', 'crescimento instagram', 'copywriting'],
  },
  Lifestyle: {
    type: 'topic', term: 'lifestyle',
    queries: ['produtividade', 'rotina matinal', 'saúde mental criador'],
  },
  Empreendedorismo: {
    type: 'topic', term: 'empreendedorismo',
    queries: ['empreendedorismo brasil', 'negócio online', 'escalar negócio'],
  },
  'Criação de Conteúdo': {
    type: 'topic', term: 'criação de conteúdo',
    queries: ['crescer nas redes sociais', 'algoritmo 2026', 'monetização'],
  },
  Motivacional: {
    type: 'topic', term: 'motivacional',
    queries: ['mensagem motivacional', 'discurso motivacional', 'vídeo de motivação'],
  },
  Personalidades: {
    type: 'subject', term: 'personalidades',
    queries: ['entrevista personalidade', 'história de vida inspiradora', 'bastidores famosos'],
  },
  Discursos: {
    type: 'subject', term: 'discursos',
    queries: ['discurso inspirador', 'palestra figura pública', 'melhores discursos da história'],
  },
  'Personalidades Negras': {
    type: 'subject', term: 'personalidades negras',
    queries: [
      'discurso de personalidade negra',
      'palestra pessoa negra inspiradora',
      'artista negro brasileiro entrevista',
      'músico negro talk',
      'ator negra atriz negra entrevista',
      'político negro discurso',
      'pessoa negra LGBTQIA discurso',
      'pessoa negra com deficiência palestra',
    ],
  },
  'Cortes de Podcast': {
    type: 'modifier', term: 'cortes de podcast',
    // Standalone fallback — themed around professional/relatable subjects.
    queries: [
      'cortes de podcast tecnologia',
      'cortes de podcast empreendedorismo',
      'cortes de podcast comportamento profissional',
      'cortes de podcast relacionável',
    ],
  },
}

// Backwards-compatible map of category → standalone queries.
export const VIDEO_CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([name, meta]) => [name, meta.queries])
)

export const CATEGORY_NAMES = Object.keys(CATEGORY_META)

// Modifier categories (kept exported for reference/tests).
export const MODIFIER_CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORY_META)
    .filter(([, m]) => m.type === 'modifier')
    .map(([name, m]) => [name, m.term])
)

// Build the de-duplicated list of { category, query } for the selected
// categories, combining them intersectionally where it makes sense.
export function queriesForCategories(categories) {
  const sel = categories.map((name) => ({ name, ...CATEGORY_META[name] })).filter((c) => c.type)
  const subjects = sel.filter((c) => c.type === 'subject')
  const topics = sel.filter((c) => c.type === 'topic')
  const modifiers = sel.filter((c) => c.type === 'modifier')

  const seen = new Set()
  const out = []
  const add = (category, query) => {
    const key = `${category}::${query}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ category, query })
  }

  // Core: the subject/topic combination (or standalone queries).
  const core = []
  const pushCore = (category, query) => core.push({ category, query })

  if (subjects.length && topics.length) {
    // e.g. "personalidades negras falando sobre tecnologia"
    for (const s of subjects) {
      for (const t of topics) {
        pushCore(`${s.name} · ${t.name}`, `${s.term} falando sobre ${t.term}`)
      }
    }
  } else if (subjects.length) {
    for (const s of subjects) for (const q of s.queries) pushCore(s.name, q)
  } else if (topics.length > 1) {
    // Merge topics: a combined phrase plus each topic for variety.
    pushCore(topics.map((t) => t.name).join(' · '), topics.map((t) => t.term).join(' '))
    for (const t of topics) for (const q of t.queries) pushCore(t.name, q)
  } else if (topics.length === 1) {
    for (const q of topics[0].queries) pushCore(topics[0].name, q)
  }

  // Modifiers (e.g. podcast cuts) refine the core; alone they use generic queries.
  if (modifiers.length) {
    for (const m of modifiers) {
      if (core.length) {
        for (const c of core) add(m.name, `${m.term} ${c.query}`)
      } else {
        for (const q of m.queries) add(m.name, q)
      }
    }
  }

  // Always include the core queries too (so you get both the cut and the topic).
  for (const c of core) add(c.category, c.query)

  return out
}
