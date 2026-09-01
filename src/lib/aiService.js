import { EDITORIAL_FUNCTIONS, EDITORIAL_SERIES } from '../data/editorialStrategy'

// ─── Provider definitions ────────────────────────────────────────────────────

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    models: ['gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-5.6-luna'],
    defaultModel: 'gpt-5.6-terra',
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
    context += `\nInsights de analytics:\n${insights
      .slice(0, 5)
      .map((i) => `- ${i.title}: ${i.recommendation || i.description}`)
      .join('\n')}`
  }

  if (trendResults && (source === 'trends' || source === 'all')) {
    context += `\nTópico em alta: "${trendResults.topic}"\nOportunidades: ${trendResults.opportunities
      ?.slice(0, 3)
      .map((o) => o.title)
      .join(', ')}`
  }

  if (!context) context = '\nGere ideias de conteúdo diversas e de alta qualidade.'

  const sourceType = source === 'insights' ? 'insight' : source === 'trends' ? 'trend' : 'ai'

  const functionsBlock = EDITORIAL_FUNCTIONS.map((f) => `- ${f.id}: ${f.label} — ${f.goal}`).join('\n')
  const seriesBlock = EDITORIAL_SERIES.map((s) => `- ${s.id}: ${s.label} — ${s.description}`).join('\n')

  const messages = [
    {
      role: 'system',
      content: 'Você é uma estrategista de conteúdo. Responda APENAS com JSON válido, sem explicações, sem markdown.',
    },
    {
      role: 'user',
      content: `Gere ${count} ideias de conteúdo para Instagram a partir deste contexto:\n${context}\n\nCada ideia precisa se encaixar em UMA das quatro funções editoriais:\n${functionsBlock}\n\nSe fizer sentido, associe a ideia a uma destas séries (ou deixe null):\n${seriesBlock}\n\nRetorne um array JSON:\n[\n  {\n    "id": "idea-1",\n    "title": "...",\n    "description": "descrição de 2-3 frases",\n    "editorial_function": "critical_reading",\n    "editorial_series": null,\n    "audience_cut": "quem especificamente esse conteúdo serve",\n    "observed_situation": "a situação concreta que origina o conteúdo",\n    "evidence_needed": "dado ou evidência que falta pra sustentar a tese, ou null se já tem o suficiente no contexto",\n    "material_cost": "custo, risco ou consequência material envolvida, ou null",\n    "decision_supported": "decisão que esse conteúdo ajuda a pessoa a tomar, ou null",\n    "desired_response": "tipo de resposta/comentário que esse conteúdo busca",\n    "topic": "...",\n    "hook": "list",\n    "format": "carrossel",\n    "platform": "instagram",\n    "priority": "high",\n    "confidence": "high",\n    "source_type": "${sourceType}"\n  }\n]\n\nRegras:\n- hook: list | contrarian | story | data | problem | question\n- format: carrossel | reel | stories | thread | artigo\n- platform: instagram\n- priority: high | medium | low\n- confidence: high | medium | low — marque "low" quando a tese depender de evidência que não foi dada\n- NUNCA invente dado, número ou fonte para completar a pauta — se faltar, preencha evidence_needed em vez de inventar\n- Títulos específicos e reconhecíveis, nunca genéricos de conta de IA ou carreira\n- Retorne APENAS o array JSON`,
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

export async function instagramSearch(apifyToken, apifyActorId, query) {
  if (!apifyToken?.trim()) throw new Error('Apify API token não configurado.')
  return platformSearch({ action: 'instagram-search', apifyToken, apifyActorId, query })
}

// ─── Instagram OAuth (Meta Graph API oficial, via serverless proxy) ──────────

export async function instagramOAuthConnect(appId, appSecret, code, redirectUri) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-oauth-connect', appId, appSecret, code, redirectUri }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export async function instagramSyncMetrics(accessToken, limit = 25) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-sync-metrics', accessToken, limit }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export async function instagramFetchPosts(accessToken, limit = 25) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-fetch-posts', accessToken, limit }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export async function instagramFetchComments(accessToken, mediaId) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-fetch-comments', accessToken, mediaId }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data.comments ?? []
}

export async function instagramAccountOverview(accessToken) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-account-overview', accessToken }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export async function instagramReplyComment(accessToken, commentId, message) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-reply-comment', accessToken, commentId, message }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export async function instagramPublishPost(accessToken, imageUrl, caption) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-publish-post', accessToken, imageUrl, caption }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export async function instagramFetchStories(accessToken) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram-fetch-stories', accessToken }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`)
  return data
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
