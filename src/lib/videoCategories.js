// Swipe categories. Each category has:
//   - type: 'topic' (a subject area), 'subject' (people who speak/perform), or
//           'modifier' (refines others, e.g. podcast cuts)
//   - term / termEn: short phrases used when combining categories (PT + EN)
//   - queries / queriesEn: standalone search queries used when the category is
//     alone (PT for national content, EN to reach international content)
//
// Both languages are searched so the deck mixes national and international
// content. Combining categories is intersectional: e.g. "Personalidades Negras"
// (subject) + "Tech" (topic) → "personalidades negras falando sobre tecnologia"
// and "black personalities talking about technology".

const CATEGORY_META = {
  Finanças: {
    type: 'topic', term: 'finanças', termEn: 'finance',
    queries: ['investimentos 2026', 'renda extra brasil', 'educação financeira'],
    queriesEn: ['investing 2026', 'passive income'],
  },
  Tech: {
    type: 'topic', term: 'tecnologia', termEn: 'technology',
    queries: ['inteligência artificial', 'startups brasil', 'programação web'],
    queriesEn: ['artificial intelligence', 'tech startups'],
  },
  Marketing: {
    type: 'topic', term: 'marketing', termEn: 'marketing',
    queries: ['marketing digital', 'crescimento instagram', 'copywriting'],
    queriesEn: ['digital marketing', 'copywriting tips'],
  },
  Lifestyle: {
    type: 'topic', term: 'lifestyle', termEn: 'lifestyle',
    queries: ['produtividade', 'rotina matinal', 'saúde mental criador'],
    queriesEn: ['productivity', 'morning routine'],
  },
  Empreendedorismo: {
    type: 'topic', term: 'empreendedorismo', termEn: 'entrepreneurship',
    queries: ['empreendedorismo brasil', 'negócio online', 'escalar negócio'],
    queriesEn: ['entrepreneurship', 'online business'],
  },
  'Criação de Conteúdo': {
    type: 'topic', term: 'criação de conteúdo', termEn: 'content creation',
    queries: ['crescer nas redes sociais', 'algoritmo 2026', 'monetização'],
    queriesEn: ['grow on social media', 'content monetization'],
  },
  Motivacional: {
    type: 'topic', term: 'motivacional', termEn: 'motivational',
    queries: ['mensagem motivacional', 'discurso motivacional', 'vídeo de motivação'],
    queriesEn: ['motivational speech', 'motivation video'],
  },
  Personalidades: {
    type: 'subject', term: 'personalidades', termEn: 'personalities',
    queries: ['entrevista personalidade', 'história de vida inspiradora', 'bastidores famosos'],
    queriesEn: ['celebrity interview', 'inspiring life story'],
  },
  Discursos: {
    type: 'subject', term: 'discursos', termEn: 'speeches',
    queries: ['discurso inspirador', 'palestra figura pública', 'melhores discursos da história'],
    queriesEn: ['inspiring speech', 'famous speeches'],
  },
  'Personalidades Negras': {
    type: 'subject', term: 'personalidades negras', termEn: 'black personalities',
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
    queriesEn: [
      'black leaders speech',
      'famous black artist interview',
      'black changemakers talk',
    ],
  },
  'Cortes de Podcast': {
    type: 'modifier', term: 'cortes de podcast', termEn: 'podcast clips',
    queries: [
      'cortes de podcast tecnologia',
      'cortes de podcast empreendedorismo',
      'cortes de podcast comportamento profissional',
      'cortes de podcast relacionável',
    ],
    queriesEn: [
      'podcast clips technology',
      'podcast clips entrepreneurship',
      'relatable podcast clips',
    ],
  },
}

const CONNECTIVE = { pt: 'falando sobre', en: 'talking about' }

// Backwards-compatible map of category → standalone (PT) queries.
export const VIDEO_CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([name, meta]) => [name, meta.queries])
)

export const CATEGORY_NAMES = Object.keys(CATEGORY_META)

export const MODIFIER_CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORY_META)
    .filter(([, m]) => m.type === 'modifier')
    .map(([name, m]) => [name, m.term])
)

// Build the { category, query } list for one language, given the selected
// categories split by type.
function buildForLanguage(subjects, topics, modifiers, lang, add) {
  const term = (c) => (lang === 'en' ? c.termEn : c.term)
  const queries = (c) => (lang === 'en' ? c.queriesEn : c.queries) || []

  const core = []
  const pushCore = (category, query) => core.push({ category, query })

  if (subjects.length && topics.length) {
    for (const s of subjects) {
      for (const t of topics) {
        pushCore(`${s.name} · ${t.name}`, `${term(s)} ${CONNECTIVE[lang]} ${term(t)}`)
      }
    }
  } else if (subjects.length) {
    for (const s of subjects) for (const q of queries(s)) pushCore(s.name, q)
  } else if (topics.length > 1) {
    pushCore(topics.map((t) => t.name).join(' · '), topics.map((t) => term(t)).join(' '))
    for (const t of topics) for (const q of queries(t)) pushCore(t.name, q)
  } else if (topics.length === 1) {
    for (const q of queries(topics[0])) pushCore(topics[0].name, q)
  }

  if (modifiers.length) {
    for (const m of modifiers) {
      if (core.length) {
        for (const c of core) add(m.name, `${term(m)} ${c.query}`)
      } else {
        for (const q of queries(m)) add(m.name, q)
      }
    }
  }

  for (const c of core) add(c.category, c.query)
}

// Build the de-duplicated list of { category, query } for the selected
// categories — in both Portuguese and English (national + international).
export function queriesForCategories(categories) {
  const sel = categories.map((name) => ({ name, ...CATEGORY_META[name] })).filter((c) => c.type)
  const subjects = sel.filter((c) => c.type === 'subject')
  const topics = sel.filter((c) => c.type === 'topic')
  const modifiers = sel.filter((c) => c.type === 'modifier')

  const seen = new Set()
  const out = []
  const add = (category, query) => {
    if (!query || !query.trim()) return
    const key = `${category}::${query}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ category, query })
  }

  buildForLanguage(subjects, topics, modifiers, 'pt', add)
  buildForLanguage(subjects, topics, modifiers, 'en', add)

  return out
}
