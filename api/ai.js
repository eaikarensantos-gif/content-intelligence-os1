// Vercel Serverless Function — AI proxy + YouTube search + Whisper transcription
// Solves CORS by making all external API calls server-side.
//
// Routing:
//   action === 'youtube-search'  → YouTube Data API v3 (real creator/video data)
//   action === 'transcribe'      → OpenAI Whisper API (real audio transcription)
//   (default)                    → AI chat completion (OpenAI-compatible or Gemini)

const PROVIDER_URLS = {
  openai:     'https://api.openai.com/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  custom:     null, // uses customBaseUrl
}

// ─── AI chat helpers ─────────────────────────────────────────────────────────

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

// ─── YouTube Data API v3 ──────────────────────────────────────────────────────

async function youtubeSearch(youtubeApiKey, query) {
  const base = 'https://www.googleapis.com/youtube/v3'

  // Step 1: search videos
  const searchUrl = `${base}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&relevanceLanguage=pt&key=${youtubeApiKey}`
  const searchRes = await fetch(searchUrl)
  const searchData = await searchRes.json()

  if (!searchRes.ok || searchData.error) {
    throw new Error(searchData.error?.message || `YouTube search error ${searchRes.status}`)
  }

  if (!searchData.items?.length) return []

  // Step 2: fetch statistics (views, likes, comments)
  const videoIds = searchData.items.map((i) => i.id.videoId).join(',')
  const statsUrl = `${base}/videos?part=statistics,contentDetails&id=${videoIds}&key=${youtubeApiKey}`
  const statsRes = await fetch(statsUrl)
  const statsData = await statsRes.json()

  const statsMap = {}
  statsData.items?.forEach((v) => { statsMap[v.id] = v.statistics })

  // Step 3: merge into creator cards
  return searchData.items.map((item) => {
    const stats = statsMap[item.id.videoId] || {}
    const viewCount    = parseInt(stats.viewCount    || 0)
    const likeCount    = parseInt(stats.likeCount    || 0)
    const commentCount = parseInt(stats.commentCount || 0)
    const engagementRate = viewCount > 0
      ? ((likeCount + commentCount) / viewCount * 100).toFixed(2) + '%'
      : null

    return {
      id:            item.id.videoId,
      videoId:       item.id.videoId,
      name:          item.snippet.channelTitle,
      handle:        item.snippet.channelTitle,
      platform:      'youtube',
      videoTitle:    item.snippet.title,
      description:   item.snippet.description?.slice(0, 200) || '',
      publishedAt:   item.snippet.publishedAt,
      thumbnail:     item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channelId:     item.snippet.channelId,
      url:           `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channelUrl:    `https://www.youtube.com/channel/${item.snippet.channelId}`,
      viewCount:     stats.viewCount    || null,
      likeCount:     stats.likeCount    || null,
      commentCount:  stats.commentCount || null,
      engagementRate,
    }
  })
}

// ─── Dailymotion (public search — no API key required) ────────────────────────

async function dailymotionSearch(query) {
  const fields = 'id,title,owner.screenname,thumbnail_360_url,views_total,url'
  const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}` +
    `&fields=${encodeURIComponent(fields)}&limit=10&sort=relevance`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Dailymotion error ${res.status}`)
  }
  return (data.list || []).map((v) => ({
    id:         v.id,
    videoId:    v.id,
    platform:   'dailymotion',
    videoTitle: v.title,
    name:       v['owner.screenname'] || 'Dailymotion',
    thumbnail:  v.thumbnail_360_url || null,
    url:        v.url || `https://www.dailymotion.com/video/${v.id}`,
    viewCount:  v.views_total != null ? String(v.views_total) : null,
    likeCount:  null,
  }))
}

// ─── Vimeo (requires a personal access token) ─────────────────────────────────

async function vimeoSearch(accessToken, query) {
  const fields = 'uri,name,link,user.name,pictures.sizes,stats.plays'
  const url = `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=10` +
    `&fields=${encodeURIComponent(fields)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || data.developer_message || `Vimeo error ${res.status}`)
  }
  return (data.data || []).map((v) => {
    const id = String(v.uri || '').split('/').pop()
    const sizes = v.pictures?.sizes || []
    const thumb = sizes.length ? sizes[Math.min(3, sizes.length - 1)].link : null
    return {
      id,
      videoId:    id,
      platform:   'vimeo',
      videoTitle: v.name,
      name:       v.user?.name || 'Vimeo',
      thumbnail:  thumb,
      url:        v.link || `https://vimeo.com/${id}`,
      viewCount:  v.stats?.plays != null ? String(v.stats.plays) : null,
      likeCount:  null,
    }
  })
}

// ─── TikTok (best-effort, via a RapidAPI provider) ────────────────────────────
// TikTok has no official search API; this targets a RapidAPI host (configurable,
// defaults to tiktok-scraper7). Response shapes vary by provider, so we read the
// most common fields defensively.

async function tiktokSearch(rapidApiKey, rapidApiHost, query) {
  const host = (rapidApiHost && rapidApiHost.trim()) || 'tiktok-scraper7.p.rapidapi.com'
  const url = `https://${host}/feed/search?keywords=${encodeURIComponent(query)}&count=10&region=br`
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': host },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `TikTok error ${res.status}`)
  const items = data.data?.videos || data.videos || (Array.isArray(data.data) ? data.data : [])
  return (Array.isArray(items) ? items : []).map((v) => {
    const id = String(v.video_id || v.aweme_id || v.id || '')
    const author = v.author || {}
    return {
      id,
      videoId:    id,
      platform:   'tiktok',
      videoTitle: v.title || v.desc || 'TikTok',
      name:       author.nickname || author.unique_id || 'TikTok',
      thumbnail:  v.cover || v.origin_cover || v.ai_dynamic_cover || null,
      url:        `https://www.tiktok.com/@${author.unique_id || '_'}/video/${id}`,
      viewCount:  v.play_count != null ? String(v.play_count) : null,
      likeCount:  v.digg_count != null ? String(v.digg_count) : null,
    }
  }).filter((v) => v.id)
}

// ─── Whisper transcription ────────────────────────────────────────────────────

async function transcribeAudio(openaiApiKey, audioUrl) {
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Could not fetch audio: ${audioRes.status}`)
  const audioBuffer = await audioRes.arrayBuffer()

  const urlPath = new URL(audioUrl).pathname
  const ext = urlPath.split('.').pop()?.toLowerCase() || 'mp3'
  const supportedExts = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac']
  const fileExt = supportedExts.includes(ext) ? ext : 'mp3'

  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: `audio/${fileExt}` }), `audio.${fileExt}`)
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'json')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiApiKey}` },
    body: formData,
  })

  const data = await whisperRes.json()
  if (!whisperRes.ok) throw new Error(data.error?.message || `Whisper error ${whisperRes.status}`)
  return data.text
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.body || {}

  try {
    // ── YouTube search ────────────────────────────────────────────────────────
    if (action === 'youtube-search') {
      const { youtubeApiKey, query } = req.body
      if (!youtubeApiKey?.trim()) return res.status(400).json({ error: 'YouTube API key is required' })
      if (!query?.trim()) return res.status(400).json({ error: 'Search query is required' })

      const results = await youtubeSearch(youtubeApiKey, query)
      return res.status(200).json({ results })
    }

    // ── Dailymotion search (no key) ─────────────────────────────────────────────
    if (action === 'dailymotion-search') {
      const { query } = req.body
      if (!query?.trim()) return res.status(400).json({ error: 'Search query is required' })
      const results = await dailymotionSearch(query)
      return res.status(200).json({ results })
    }

    // ── Vimeo search ────────────────────────────────────────────────────────────
    if (action === 'vimeo-search') {
      const { vimeoToken, query } = req.body
      if (!vimeoToken?.trim()) return res.status(400).json({ error: 'Vimeo access token is required' })
      if (!query?.trim()) return res.status(400).json({ error: 'Search query is required' })
      const results = await vimeoSearch(vimeoToken, query)
      return res.status(200).json({ results })
    }

    // ── TikTok search (via RapidAPI) ─────────────────────────────────────────────
    if (action === 'tiktok-search') {
      const { rapidApiKey, rapidApiHost, query } = req.body
      if (!rapidApiKey?.trim()) return res.status(400).json({ error: 'RapidAPI key is required' })
      if (!query?.trim()) return res.status(400).json({ error: 'Search query is required' })
      const results = await tiktokSearch(rapidApiKey, rapidApiHost, query)
      return res.status(200).json({ results })
    }

    // ── Whisper transcription ─────────────────────────────────────────────────
    if (action === 'transcribe') {
      const { openaiApiKey, audioUrl } = req.body
      if (!openaiApiKey?.trim()) return res.status(400).json({ error: 'OpenAI API key is required for transcription' })
      if (!audioUrl?.trim()) return res.status(400).json({ error: 'Audio URL is required' })

      const transcript = await transcribeAudio(openaiApiKey, audioUrl)
      return res.status(200).json({ transcript })
    }

    // ── AI chat completion (default) ──────────────────────────────────────────
    const { provider, apiKey, model, messages, options = {}, customBaseUrl } = req.body

    if (!apiKey?.trim()) return res.status(400).json({ error: 'API key is required' })
    if (!messages?.length) return res.status(400).json({ error: 'Messages are required' })

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
        ? {
            'HTTP-Referer': req.headers.origin || 'https://content-intelligence-os1.vercel.app',
            'X-Title': 'Content Intelligence OS',
          }
        : {}

      content = await callOpenAICompatible(url, apiKey, model, messages, options, extraHeaders)
    }

    return res.status(200).json({ content })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Request failed' })
  }
}
