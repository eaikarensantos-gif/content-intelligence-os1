const CREATORS_DB = {
  linkedin: [
    { name: 'Justin Welsh', handle: '@justinwelsh', followers: '510K', avg_engagement: '4.8%', niche: 'Solopreneur & Creator Economy', recent_topics: ['building in public', 'audience monetization', 'content systems'] },
    { name: 'Lara Acosta', handle: '@laraacosta', followers: '280K', avg_engagement: '6.2%', niche: 'Personal Branding', recent_topics: ['personal brand strategy', 'LinkedIn growth', 'storytelling'] },
    { name: 'Matt Gray', handle: '@mattgray', followers: '340K', avg_engagement: '5.1%', niche: 'Business Systems', recent_topics: ['systems for creators', 'scaling content', 'operating systems'] },
    { name: 'Sahil Bloom', handle: '@sahilbloom', followers: '490K', avg_engagement: '3.9%', niche: 'Mental Models & Growth', recent_topics: ['mental models', 'wealth creation', 'self-improvement'] },
  ],
  twitter: [
    { name: 'Dickie Bush', handle: '@dickiebush', followers: '215K', avg_engagement: '5.5%', niche: 'Writing & Creators', recent_topics: ['writing online', 'digital leverage', 'audience building'] },
    { name: 'Nicolas Cole', handle: '@nicolascole77', followers: '175K', avg_engagement: '4.7%', niche: 'Digital Writing', recent_topics: ['ghostwriting', 'content strategy', 'writing frameworks'] },
    { name: 'Kieran Drew', handle: '@kierandrew_', followers: '140K', avg_engagement: '6.0%', niche: 'Copywriting', recent_topics: ['copywriting', 'email marketing', 'hooks'] },
    { name: 'Jay Clouse', handle: '@jayclouse', followers: '95K', avg_engagement: '5.8%', niche: 'Creator Business', recent_topics: ['creator business', 'community', 'monetization'] },
  ],
  instagram: [
    { name: 'Alex Hormozi', handle: '@hormozi', followers: '2.8M', avg_engagement: '3.2%', niche: 'Business & Scaling', recent_topics: ['sales', 'offers', 'scaling business'] },
    { name: 'Vanessa Lau', handle: '@vanessalau.co', followers: '1.1M', avg_engagement: '4.0%', niche: 'Creator Economy', recent_topics: ['social media strategy', 'brand deals', 'creator income'] },
    { name: 'Chris Do', handle: '@thefutur', followers: '960K', avg_engagement: '3.8%', niche: 'Design & Business', recent_topics: ['design business', 'pricing', 'creative career'] },
  ],
  youtube: [
    { name: 'Ali Abdaal', handle: '@aliabdaal', followers: '5.2M', avg_engagement: '4.5%', niche: 'Productivity & Creator', recent_topics: ['productivity tools', 'feel-good productivity', 'passive income'] },
    { name: 'Mark Manson', handle: '@markmanson', followers: '1.3M', avg_engagement: '3.7%', niche: 'Self-Development', recent_topics: ['mindset', 'life philosophy', 'modern challenges'] },
    { name: 'Thomas Frank', handle: '@thomasfrank', followers: '3.1M', avg_engagement: '4.1%', niche: 'Productivity & Study', recent_topics: ['Notion systems', 'student productivity', 'task management'] },
  ],
  tiktok: [
    { name: 'Elise Darma', handle: '@elisedarma', followers: '870K', avg_engagement: '7.2%', niche: 'Social Media Strategy', recent_topics: ['TikTok for business', 'content batching', 'viral hooks'] },
    { name: 'Jasmin Alic', handle: '@jasmin.writes', followers: '620K', avg_engagement: '8.1%', niche: 'Copywriting', recent_topics: ['storytelling', 'persuasion', 'writing hooks'] },
  ],
}

const HOOK_PATTERNS = [
  { hook: 'List Hook', example: '"X things nobody tells you about [TOPIC]"', frequency: '38%' },
  { hook: 'Contrarian Hook', example: '"Everyone says [X] — they\'re wrong. Here\'s why..."', frequency: '24%' },
  { hook: 'Story Hook', example: '"I [did something] and here\'s what happened..."', frequency: '21%' },
  { hook: 'Data Hook', example: '"After analyzing 1,000 [X], I found..."', frequency: '17%' },
  { hook: 'Problem Hook', example: '"The real reason [PAIN POINT] happens (and how to fix it)"', frequency: '29%' },
  { hook: 'Question Hook', example: '"What if [conventional wisdom] is actually holding you back?"', frequency: '22%' },
]

const FORMAT_TRENDS = {
  linkedin: [
    { format: 'Carousel', trend: '+42%', dominance: '35%' },
    { format: 'Text Post (Long-form)', trend: '+18%', dominance: '40%' },
    { format: 'Short Video', trend: '+85%', dominance: '15%' },
  ],
  instagram: [
    { format: 'Reels', trend: '+120%', dominance: '55%' },
    { format: 'Carousel', trend: '+30%', dominance: '30%' },
    { format: 'Static Post', trend: '-15%', dominance: '15%' },
  ],
  tiktok: [
    { format: 'Short Video (< 30s)', trend: '+55%', dominance: '40%' },
    { format: 'Tutorial / How-To', trend: '+38%', dominance: '30%' },
    { format: 'Trend Duet', trend: '+22%', dominance: '20%' },
  ],
  youtube: [
    { format: 'Long-form Video (10-20 min)', trend: '+12%', dominance: '45%' },
    { format: 'YouTube Shorts', trend: '+200%', dominance: '30%' },
    { format: 'Documentary-style', trend: '+65%', dominance: '15%' },
  ],
  twitter: [
    { format: 'Thread', trend: '+48%', dominance: '50%' },
    { format: 'Single Tweet', trend: '-8%', dominance: '35%' },
    { format: 'Spaces', trend: '+15%', dominance: '10%' },
  ],
}

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function generateOpportunities(topic) {
  const hooks = pickRandom(HOOK_PATTERNS, 3)
  const platforms = pickRandom(['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok'], 5)
  const formats = ['carousel', 'thread', 'video', 'reel', 'article']

  return [
    {
      id: `opp-${Date.now()}-1`,
      title: `The ${topic} Framework No One Is Sharing`,
      description: `A step-by-step framework breaking down how ${topic} actually works, with practical examples most creators miss.`,
      hook: hooks[0]?.hook || 'Contrarian Hook',
      hook_example: hooks[0]?.example || '',
      format: 'carousel',
      platform: 'linkedin',
      content_gap: 'Deep frameworks with visual breakdowns are underrepresented in this niche',
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-2`,
      title: `${topic} Mistakes That Are Costing You Growth`,
      description: `Common mistakes people make in ${topic} that silently limit their results, with quick fixes for each.`,
      hook: hooks[1]?.hook || 'List Hook',
      hook_example: hooks[1]?.example || '',
      format: 'thread',
      platform: 'twitter',
      content_gap: 'Problem-solution content specific to beginners is missing',
      potential: 'Very High',
    },
    {
      id: `opp-${Date.now()}-3`,
      title: `I Tested Every ${topic} Strategy for 90 Days — Here\'s What Worked`,
      description: `A personal case study documenting a real experiment with ${topic}, including data, failures, and the winning approach.`,
      hook: hooks[2]?.hook || 'Story Hook',
      hook_example: hooks[2]?.example || '',
      format: 'video',
      platform: 'youtube',
      content_gap: 'Data-driven case studies from practitioners are rare and highly shareable',
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-4`,
      title: `How ${topic} Is Changing in 2025 (New Data)`,
      description: `An analysis of emerging shifts in ${topic}, what trends are accelerating, and how to position yourself ahead of the curve.`,
      hook: 'Data Hook',
      hook_example: '"After analyzing 500 posts about [TOPIC], here\'s what\'s actually changing..."',
      format: 'reel',
      platform: 'instagram',
      content_gap: 'Forward-looking, data-anchored content about this topic has low saturation',
      potential: 'Medium',
    },
    {
      id: `opp-${Date.now()}-5`,
      title: `${topic} 101: The Beginner\'s Guide to Getting Started`,
      description: `A foundational guide for people who are new to ${topic} — covering terminology, first steps, and common pitfalls.`,
      hook: 'Problem Hook',
      hook_example: '"Most people fail at [TOPIC] in the first 30 days because of this one thing..."',
      format: 'carousel',
      platform: 'instagram',
      content_gap: 'Entry-level educational content is scarce — most creators target intermediates',
      potential: 'High',
    },
  ]
}

export function simulateTrendSearch(topic) {
  const platforms = ['linkedin', 'twitter', 'instagram', 'youtube', 'tiktok']
  const allCreators = []
  platforms.forEach((plt) => {
    const pool = CREATORS_DB[plt] || []
    pickRandom(pool, Math.min(2, pool.length)).forEach((c) => {
      allCreators.push({ ...c, platform: plt, id: `creator-${Math.random().toString(36).substr(2, 6)}` })
    })
  })

  const creators = pickRandom(allCreators, Math.min(10, allCreators.length))

  const recurringHooks = pickRandom(HOOK_PATTERNS, 4).map((h) => ({
    ...h,
    relevance: `Highly effective for ${topic} content`,
  }))

  const dominantFormats = []
  platforms.forEach((plt) => {
    const fmts = FORMAT_TRENDS[plt] || []
    if (fmts.length) {
      dominantFormats.push({ platform: plt, formats: fmts.slice(0, 2) })
    }
  })

  const emergingTopics = [
    `${topic} automation tools`,
    `${topic} for beginners`,
    `${topic} case studies`,
    `Future of ${topic}`,
    `${topic} monetization`,
    `${topic} psychology`,
  ]

  const opportunities = generateOpportunities(topic)

  return {
    topic,
    searched_at: new Date().toISOString(),
    creators,
    patterns: {
      recurring_hooks: recurringHooks,
      dominant_formats: dominantFormats,
      emerging_topics: emergingTopics,
    },
    opportunities,
  }
}
