const TEMPLATES = [
  {
    hook_type: 'list',
    title: (topic, n) => `${n} ${topic} Strategies That Actually Work in 2025`,
    description: (topic) => `A curated breakdown of the top ${topic} strategies, ranked by impact. Includes real examples, data points, and actionable next steps for each.`,
    formats: ['carousel', 'thread'],
    platforms: ['linkedin', 'twitter'],
  },
  {
    hook_type: 'contrarian',
    title: (topic) => `Why Most ${topic} Advice Is Wrong (And What to Do Instead)`,
    description: (topic) => `A contrarian take challenging conventional wisdom about ${topic}. Backed by data and personal experience, this post turns common assumptions upside down.`,
    formats: ['thread', 'video'],
    platforms: ['twitter', 'youtube'],
  },
  {
    hook_type: 'story',
    title: (topic) => `I Spent 6 Months Mastering ${topic} — Here's Everything I Learned`,
    description: (topic) => `A personal journey documenting the lessons, failures, and wins from deep-diving into ${topic}. Authentic, relatable, and packed with takeaways.`,
    formats: ['video', 'article'],
    platforms: ['youtube', 'linkedin'],
  },
  {
    hook_type: 'data',
    title: (topic) => `The ${topic} Data Nobody Is Talking About`,
    description: (topic) => `An analysis of underreported statistics and trends in ${topic}. Data-driven insights that challenge assumptions and provide a competitive edge.`,
    formats: ['carousel', 'thread'],
    platforms: ['linkedin', 'twitter'],
  },
  {
    hook_type: 'problem',
    title: (topic) => `The #1 Mistake People Make With ${topic} (And How to Fix It)`,
    description: (topic) => `A deep dive into the most common and costly mistake in ${topic}, why it happens, and a clear, step-by-step path to fix it.`,
    formats: ['reel', 'carousel'],
    platforms: ['instagram', 'tiktok'],
  },
  {
    hook_type: 'question',
    title: (topic) => `Is ${topic} Actually Worth It? An Honest Answer`,
    description: (topic) => `An unbiased, evidence-based answer to the question everyone is thinking but few are asking about ${topic}. Cuts through hype to deliver real perspective.`,
    formats: ['video', 'article'],
    platforms: ['youtube', 'linkedin'],
  },
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateIdeasFromInsights(insights, count = 6) {
  if (!insights || insights.length === 0) return []

  const generated = []
  const usedTemplates = new Set()

  insights.forEach((insight, i) => {
    if (generated.length >= count) return

    const topic = extractTopicFromInsight(insight)
    const template = TEMPLATES.find((t) => {
      if (insight.type === 'format') return t.hook_type === 'data'
      if (insight.type === 'hook') return t.hook_type === insight.recommendation?.split(' ')[2] || 'story'
      if (insight.type === 'platform') return t.hook_type === 'list'
      return true
    }) || pickRandom(TEMPLATES)

    const n = Math.floor(Math.random() * 3) + 5
    generated.push({
      id: `gen-${Date.now()}-${i}`,
      title: typeof template.title === 'function' ? template.title(topic, n) : template.title,
      description: typeof template.description === 'function' ? template.description(topic) : template.description,
      topic,
      hook: template.hook_type,
      format: pickRandom(template.formats),
      platform: pickRandom(template.platforms),
      source_insight: insight.id,
      source_type: 'insight',
      priority: insight.value > 0.04 ? 'high' : 'medium',
      generated_at: new Date().toISOString(),
    })
  })

  // Fill remaining slots with diverse ideas
  while (generated.length < count) {
    const template = pickRandom(TEMPLATES)
    const topics = ['Content Strategy', 'Creator Economy', 'AI Tools', 'Audience Building', 'Monetization']
    const topic = pickRandom(topics)
    const n = Math.floor(Math.random() * 4) + 4
    generated.push({
      id: `gen-${Date.now()}-extra-${generated.length}`,
      title: typeof template.title === 'function' ? template.title(topic, n) : template.title,
      description: typeof template.description === 'function' ? template.description(topic) : template.description,
      topic,
      hook: template.hook_type,
      format: pickRandom(template.formats),
      platform: pickRandom(template.platforms),
      source_insight: null,
      source_type: 'ai',
      priority: 'medium',
      generated_at: new Date().toISOString(),
    })
  }

  return generated.slice(0, count)
}

export function generateIdeasFromTrends(trendResults, count = 4) {
  if (!trendResults) return []
  const { topic, opportunities } = trendResults
  return (opportunities || []).slice(0, count).map((opp, i) => ({
    id: `trend-gen-${Date.now()}-${i}`,
    title: opp.title,
    description: opp.description,
    topic,
    hook: opp.hook?.toLowerCase().replace(' hook', '') || 'list',
    format: opp.format,
    platform: opp.platform,
    source_insight: null,
    source_type: 'trend',
    priority: opp.potential === 'Very High' ? 'high' : opp.potential === 'High' ? 'medium' : 'low',
    generated_at: new Date().toISOString(),
  }))
}

function extractTopicFromInsight(insight) {
  const words = insight.title?.split(' ') || []
  // Look for content topics mentioned
  const contentTopics = ['carousel', 'thread', 'video', 'reel', 'article', 'linkedin', 'instagram', 'twitter', 'youtube', 'tiktok']
  const found = words.find((w) => contentTopics.includes(w.toLowerCase()))
  if (found) {
    if (['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok'].includes(found.toLowerCase())) {
      return 'Platform Strategy'
    }
    return `${found.charAt(0).toUpperCase() + found.slice(1)} Content`
  }
  return 'Content Strategy'
}
