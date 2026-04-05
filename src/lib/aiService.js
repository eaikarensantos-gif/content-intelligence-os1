// ─── Provider definitions ─────────────────────────────────────────────────────

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    type: 'openai',
  },
  groq: {
    label: 'Groq (rápido e gratuito)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    defaultModel: 'llama-3.1-8b-instant',
    type: 'openai',
  },
  openrouter: {
    label: 'OpenRouter (qualquer modelo)',
    baseUrl: 'https://openrouter.ai/api/v1',
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
    type: 'openai',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    defaultModel: 'gemini-1.5-flash',
    type: 'gemini',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    models: [],
    defaultModel: '',
    type: 'openai',
  },
}

// ─── JSON parser — strips markdown code fences if present ─────────────────────

function parseJSON(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  return JSON.parse(cleaned)
}

// ─── OpenAI-compatible call ───────────────────────────────────────────────────

async function callOpenAICompatible(baseUrl, apiKey, model, messages, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...opts.extraHeaders,
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Google Gemini call ────────────────────────────────────────────────────────

async function callGemini(apiKey, model, messages, opts = {}) {
  const systemMsg = messages.find((m) => m.role === 'system')
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const body = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2000,
    },
  }

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function callAI(aiSettings, messages, opts = {}) {
  const { provider, apiKey, model, customBaseUrl } = aiSettings

  if (!apiKey?.trim()) {
    throw new Error('Nenhuma chave de API configurada. Vá em Configurações para adicionar.')
  }

  const providerDef = PROVIDERS[provider]
  if (!providerDef) throw new Error(`Provedor desconhecido: ${provider}`)

  const type = providerDef.type
  const baseUrl = provider === 'custom' ? customBaseUrl : providerDef.baseUrl

  if (type === 'gemini') {
    return callGemini(apiKey, model, messages, opts)
  }

  const extraHeaders =
    provider === 'openrouter'
      ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Content Intelligence OS' }
      : {}

  return callOpenAICompatible(baseUrl, apiKey, model, messages, { ...opts, extraHeaders })
}

// ─── Feature-specific AI calls ────────────────────────────────────────────────

export async function aiTrendSearch(aiSettings, topic) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a content market research analyst. Respond ONLY with valid JSON, no explanations, no markdown.',
    },
    {
      role: 'user',
      content: `Analyze content trends for the topic: "${topic}"

Return this JSON structure exactly:
{
  "opportunities": [
    {
      "id": "opp-1",
      "title": "...",
      "description": "...",
      "hook": "List Hook",
      "hook_example": "...",
      "format": "carousel",
      "platform": "linkedin",
      "content_gap": "...",
      "potential": "Very High"
    }
  ],
  "emerging_topics": ["topic1", "topic2", "topic3", "topic4", "topic5", "topic6"],
  "recurring_hooks": [
    { "hook": "List Hook", "example": "...", "frequency": "38%" }
  ]
}

Rules:
- Generate exactly 5 opportunities
- platform must be one of: linkedin, twitter, instagram, youtube, tiktok
- format must be one of: carousel, thread, video, reel, article
- hook must be one of: List Hook, Contrarian Hook, Story Hook, Data Hook, Problem Hook, Question Hook
- potential must be one of: Very High, High, Medium
- Generate 4 recurring_hooks
- Return ONLY the JSON object`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.8, maxTokens: 2000 })
  const parsed = parseJSON(text)

  // Add sequential ids if missing
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

  if (!context) {
    context = '\nGenerate diverse, high-quality content ideas for a creator.'
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are a content strategy expert. Respond ONLY with valid JSON, no explanations, no markdown.',
    },
    {
      role: 'user',
      content: `Generate ${count} creative content ideas for a creator based on this context:
${context}

Return a JSON array exactly like this:
[
  {
    "id": "idea-1",
    "title": "...",
    "description": "2-3 sentence description",
    "topic": "...",
    "hook": "list",
    "format": "carousel",
    "platform": "linkedin",
    "priority": "high",
    "source_type": "${source === 'insights' ? 'insight' : source === 'trends' ? 'trend' : 'ai'}"
  }
]

Rules:
- hook: list | contrarian | story | data | problem | question
- format: carousel | thread | video | reel | article
- platform: linkedin | twitter | instagram | youtube | tiktok
- priority: high | medium | low
- Make titles specific and compelling, not generic
- Return ONLY the JSON array`,
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
      content:
        'You are a content analytics expert. Respond ONLY with valid JSON, no explanations, no markdown.',
    },
    {
      role: 'user',
      content: `Analyze this content performance data and generate actionable insights.

Posts (${postsData.length} posts): ${JSON.stringify(postsData)}
Metrics (${metricsData.length} snapshots): ${JSON.stringify(metricsData)}

Return a JSON array of insights:
[
  {
    "id": "ins-1",
    "type": "format",
    "title": "Specific insight title",
    "description": "Detailed explanation with data references",
    "recommendation": "Specific, actionable next step",
    "value": 0.05
  }
]

Rules:
- type: format | hook | platform | topic | summary
- Generate 6 to 8 insights
- value: a number between 0 and 1 representing impact (0.05 = high impact)
- Be specific — reference actual platforms, formats, and numbers from the data
- Return ONLY the JSON array`,
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
  const messages = [
    { role: 'user', content: 'Reply with exactly: {"ok":true}' },
  ]
  const text = await callAI(aiSettings, messages, { maxTokens: 20 })
  return text.includes('ok')
}
