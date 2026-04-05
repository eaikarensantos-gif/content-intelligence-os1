// Vercel Serverless Function — AI proxy (solves CORS)
// Receives { provider, apiKey, model, messages, options }
// Forwards to the correct AI provider server-side

const PROVIDER_URLS = {
  openai:     'https://api.openai.com/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  custom:     null, // uses customBaseUrl
}

async function callOpenAICompatible(url, apiKey, model, messages, options = {}, extraHeaders = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens:  options.maxTokens ?? 2000,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`)
  return data.choices?.[0]?.message?.content ?? ''
}

async function callGemini(apiKey, model, messages, options = {}) {
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
      temperature:     options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2000,
    },
  }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Gemini error ${res.status}`)
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { provider, apiKey, model, messages, options = {}, customBaseUrl } = req.body

  if (!apiKey?.trim()) {
    return res.status(400).json({ error: 'API key is required' })
  }
  if (!messages?.length) {
    return res.status(400).json({ error: 'Messages are required' })
  }

  try {
    let content

    if (provider === 'gemini') {
      content = await callGemini(apiKey, model, messages, options)
    } else {
      let url = PROVIDER_URLS[provider]
      if (provider === 'custom') {
        if (!customBaseUrl) return res.status(400).json({ error: 'customBaseUrl required for custom provider' })
        url = `${customBaseUrl.replace(/\/$/, '')}/chat/completions`
      }
      if (!url) return res.status(400).json({ error: `Unknown provider: ${provider}` })

      const extraHeaders = provider === 'openrouter'
        ? { 'HTTP-Referer': req.headers.origin || 'https://content-intelligence-os.vercel.app', 'X-Title': 'Content Intelligence OS' }
        : {}

      content = await callOpenAICompatible(url, apiKey, model, messages, options, extraHeaders)
    }

    return res.status(200).json({ content })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI request failed' })
  }
}
