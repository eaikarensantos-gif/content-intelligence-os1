// ─── Provider definitions ────────────────────────────────────────────────────

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    label: 'Groq (rápido e gratuito)',
    models: [
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    defaultModel: 'llama-3.1-8b-instant',
  },
  openrouter: {
    label: 'OpenRouter (qualquer modelo)',
    models: [
      'openai/gpt-4o-mini',
      'openai/gpt-4o',
      'anthropic/claude-3-5-haiku',
      'anthropic/claude-3-5-sonnet',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ],
    defaultModel: 'openai/gpt-4o-mini',
  },
  gemini: {
    label: 'Google Gemini',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    defaultModel: 'gemini-1.5-flash',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    models: [],
    defaultModel: '',
  },
}

// ─── JSON parser — strips markdown code fences if present ────────────────────

function parseJSON(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  return JSON.parse(cleaned)
}

// ─── Core call — goes through /api/ai serverless proxy (solves CORS) ─────────

export async function callAI(aiSettings, messages, opts = {}) {
  const { provider, apiKey, model, customBaseUrl } = aiSettings

  if (!apiKey?.trim()) {
    throw new Error('Nenhuma chave de API configurada. Vá em Configurações para adicionar.')
  }

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      model,
      messages,
      options: opts,
      customBaseUrl,
    }),
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error || `Proxy error ${res.status}`)
  }

  return data.content ?? ''
}

// ─── Feature-specific AI calls ───────────────────────────────────────────────

export async function aiTrendSearch(aiSettings, topic) {
  const messages = [
    {
      role: 'system',
      content: 'You are a content market research analyst. Respond ONLY with valid JSON, no explanations, no markdown.',
    },
    {
      role: 'user',
      content: `Analyze content trends for the topic: "${topic}"\n\nReturn this JSON structure exactly:\n{\n  "opportunities": [\n    {\n      "id": "opp-1",\n      "title": "...",\n      "description": "...",\n      "hook": "List Hook",\n      "hook_example": "...",\n      "format": "carousel",\n      "platform": "linkedin",\n      "content_gap": "...",\n      "potential": "Very High"\n    }\n  ],\n  "emerging_topics": ["topic1", "topic2", "topic3", "topic4", "topic5", "topic6"],\n  "recurring_hooks": [\n    { "hook": "List Hook", "example": "...", "frequency": "38%" }\n  ]\n}\n\nRules:\n- Generate exactly 5 opportunities\n- platform: linkedin | twitter | instagram | youtube | tiktok\n- format: carousel | thread | video | reel | article\n- hook: List Hook | Contrarian Hook | Story Hook | Data Hook | Problem Hook | Question Hook\n- potential: Very High | High | Medium\n- Generate 4 recurring_hooks\n- Return ONLY the JSON object`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.8, maxTokens: 2000 })
  const parsed = parseJSON(text)

  parsed.opportunities = (parsed.opportunities || []).map((o, i) => ({
    ...o,
    id: o.id || `opp-ai-${Date.now()}-${i}`,
  }))

  return parsed
}

export async function aiGenerateIdeas(aiSettings, { insights, trendResults, count = 8, source }) {
  let context = ''

  if (insights?.length && (source === 'insights' || source === 'all')) {
    context += `\nAnalytics insights:\n${insights
      .slice(0, 5)
      .map((i) => `- ${i.title}: ${i.recommendation || i.description}`)
      .join('\n')}`
  }

  if (trendResults && (source === 'trends' || source === 'all')) {
    context += `\nTrend topic: "${trendResults.topic}"\nOpportunities: ${trendResults.opportunities
      ?.slice(0, 3)
      .map((o) => o.title)
      .join(', ')}`
  }

  if (!context) context = '\nGenerate diverse, high-quality content ideas for a creator.'

  const sourceType = source === 'insights' ? 'insight' : source === 'trends' ? 'trend' : 'ai'

  const messages = [
    {
      role: 'system',
      content: 'You are a content strategy expert. Respond ONLY with valid JSON, no explanations, no markdown.',
    },
    {
      role: 'user',
      content: `Generate ${count} creative content ideas for a creator based on this context:\n${context}\n\nReturn a JSON array:\n[\n  {\n    "id": "idea-1",\n    "title": "...",\n    "description": "2-3 sentence description",\n    "topic": "...",\n    "hook": "list",\n    "format": "carousel",\n    "platform": "linkedin",\n    "priority": "high",\n    "source_type": "${sourceType}"\n  }\n]\n\nRules:\n- hook: list | contrarian | story | data | problem | question\n- format: carousel | thread | video | reel | article\n- platform: linkedin | twitter | instagram | youtube | tiktok\n- priority: high | medium | low\n- Make titles specific and compelling, not generic\n- Return ONLY the JSON array`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.9, maxTokens: 2500 })
  const parsed = parseJSON(text)

  return parsed.map((idea, i) => ({
    ...idea,
    id: idea.id || `ai-idea-${Date.now()}-${i}`,
    generated_at: new Date().toISOString(),
  }))
}

export async function aiGenerateInsights(aiSettings, { posts, metrics }) {
  const postsData = posts.slice(0, 20).map((p) => ({
    platform: p.platform,
    format: p.format,
    hook_type: p.hook_type,
    status: p.status,
  }))

  const metricsData = metrics.slice(0, 20).map((m) => ({
    platform: m.platform,
    format: m.format,
    hook_type: m.hook_type,
    views: m.views,
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
    engagement_rate: m.engagement_rate,
  }))

  const messages = [
    {
      role: 'system',
      content: 'You are a content analytics expert. Respond ONLY with valid JSON, no explanations, no markdown.',
    },
    {
      role: 'user',
      content: `Analyze this content performance data and generate actionable insights.\n\nPosts (${postsData.length}): ${JSON.stringify(postsData)}\nMetrics (${metricsData.length}): ${JSON.stringify(metricsData)}\n\nReturn a JSON array:\n[\n  {\n    "id": "ins-1",\n    "type": "format",\n    "title": "Specific insight title",\n    "description": "Detailed explanation with data references",\n    "recommendation": "Specific, actionable next step",\n    "value": 0.05\n  }\n]\n\nRules:\n- type: format | hook | platform | topic | summary\n- Generate 6 to 8 insights\n- value: 0–1 representing impact\n- Reference actual platforms, formats, numbers from the data\n- Return ONLY the JSON array`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.6, maxTokens: 2000 })
  const parsed = parseJSON(text)

  return parsed.map((ins, i) => ({
    ...ins,
    id: ins.id || `ai-ins-${Date.now()}-${i}`,
  }))
}

export async function testConnection(aiSettings) {
  const messages = [{ role: 'user', content: 'Reply with exactly: {"ok":true}' }]
  const text = await callAI(aiSettings, messages, { maxTokens: 20 })
  return text.includes('ok')
}

// ─── YouTube real search (via serverless proxy) ───────────────────────────────

export async function youtubeSearch(youtubeApiKey, query, opts = {}) {
  if (!youtubeApiKey?.trim()) {
    throw new Error('YouTube API key não configurada. Adicione em Configurações → YouTube.')
  }

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'youtube-search', youtubeApiKey, query, ...opts }),
  })

  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data.results ?? []
}

// ─── Other video platforms (via serverless proxy) ─────────────────────────────

async function platformSearch(body) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data.results ?? []
}

export async function dailymotionSearch(query, opts = {}) {
  return platformSearch({ action: 'dailymotion-search', query, ...opts })
}

export async function vimeoSearch(vimeoToken, query, opts = {}) {
  if (!vimeoToken?.trim()) throw new Error('Vimeo token não configurado.')
  return platformSearch({ action: 'vimeo-search', vimeoToken, query, ...opts })
}

export async function tiktokSearch(rapidApiKey, rapidApiHost, query) {
  if (!rapidApiKey?.trim()) throw new Error('RapidAPI key não configurada.')
  return platformSearch({ action: 'tiktok-search', rapidApiKey, rapidApiHost, query })
}

// ─── Whisper transcription (via serverless proxy) ─────────────────────────────

export async function transcribeAudio(openaiApiKey, audioUrl) {
  if (!openaiApiKey?.trim()) {
    throw new Error('OpenAI API key necessária para transcrição via Whisper.')
  }

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'transcribe', openaiApiKey, audioUrl }),
  })

  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data.transcript ?? ''
}
