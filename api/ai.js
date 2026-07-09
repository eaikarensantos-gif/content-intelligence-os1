// Vercel Serverless Function — AI proxy + multi-platform video search + Whisper
// Routing (action via body.action):
//   'anthropic'        → Anthropic Messages API
//   'youtube-search'   → YouTube Data API v3 (supports duration + sort filters)
//   'dailymotion-search' → Dailymotion public API (no key, supports sort)
//   'vimeo-search'     → Vimeo API (token required, supports sort)
//   'tiktok-search'    → TikTok via RapidAPI provider
//   'transcribe'       → OpenAI Whisper
//   (default)          → AI chat completion

const PROVIDER_URLS = {
  openai:     'https://api.openai.com/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  custom:     null,
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
      max_tokens:  options.maxTokens  ?? 2000,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`)
  return data.choices?.[0]?.message?.content ?? ''
}

async function callGemini(apiKey, model, messages, options = {}) {
  const systemMsg = messages.find((m) => m.role === 'system')
  const contents  = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

  const body = {
    contents,
    generationConfig: { temperature: options.temperature ?? 0.7, maxOutputTokens: options.maxTokens ?? 2000 },
  }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Gemini error ${res.status}`)
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── YouTube Data API v3 ──────────────────────────────────────────────────────

async function youtubeSearch(youtubeApiKey, query, opts = {}) {
  const base = 'https://www.googleapis.com/youtube/v3'

  const orderMap = { recent: 'date', views: 'viewCount' }
  let searchUrl = `${base}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&relevanceLanguage=pt&key=${youtubeApiKey}`
  if (opts.duration && opts.duration !== 'any') searchUrl += `&videoDuration=${opts.duration}`
  searchUrl += `&order=${orderMap[opts.sort] || 'relevance'}`

  const searchRes  = await fetch(searchUrl)
  const searchData = await searchRes.json()
  if (!searchRes.ok || searchData.error) {
    throw new Error(searchData.error?.message || `YouTube search error ${searchRes.status}`)
  }
  if (!searchData.items?.length) return []

  const videoIds = searchData.items.map((i) => i.id.videoId).join(',')
  const statsUrl = `${base}/videos?part=statistics,contentDetails&id=${videoIds}&key=${youtubeApiKey}`
  const statsRes  = await fetch(statsUrl)
  const statsData = await statsRes.json()

  const statsMap = {}
  statsData.items?.forEach((v) => { statsMap[v.id] = v.statistics })

  return searchData.items.map((item) => {
    const stats        = statsMap[item.id.videoId] || {}
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

// ─── Dailymotion (public — no API key required) ───────────────────────────────

async function dailymotionSearch(query, opts = {}) {
  const sortMap = { recent: 'recent', views: 'visited' }
  const sortVal = sortMap[opts.sort] || 'relevance'
  const fields  = 'id,title,owner.screenname,thumbnail_360_url,views_total,url'
  const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}` +
    `&fields=${encodeURIComponent(fields)}&limit=10&sort=${sortVal}`
  const res  = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || `Dailymotion error ${res.status}`)
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

// ─── Vimeo (requires personal access token) ───────────────────────────────────

async function vimeoSearch(accessToken, query, opts = {}) {
  const sortMap = { recent: 'newest', views: 'plays' }
  const sortVal = sortMap[opts.sort] || 'relevant'
  const fields  = 'uri,name,link,user.name,pictures.sizes,stats.plays'
  const url = `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=10` +
    `&sort=${sortVal}&direction=desc&filter=playable&fields=${encodeURIComponent(fields)}`
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || data.developer_message || `Vimeo error ${res.status}`)
  return (data.data || []).map((v) => {
    const id    = String(v.uri || '').split('/').pop()
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

// ─── TikTok via RapidAPI ──────────────────────────────────────────────────────

function tiktokSearchUrl(host, query) {
  const kw = encodeURIComponent(query)
  if (host.includes('tiktok-api23')) return `https://${host}/api/search/general?keyword=${kw}&cursor=0&search_id=0`
  return `https://${host}/feed/search?keywords=${kw}&count=10&region=br`
}

function normalizeTiktokItem(raw) {
  const v      = raw.item || raw.aweme_info || raw
  const author = v.author || {}
  const stats  = v.stats  || v.statistics || {}
  const video  = v.video  || {}
  const id     = String(v.id || v.aweme_id || v.video_id || '')
  const unique = author.uniqueId || author.unique_id || '_'
  return {
    id,
    videoId:    id,
    platform:   'tiktok',
    videoTitle: v.desc || v.title || 'TikTok',
    name:       author.nickname || author.unique_id || author.uniqueId || 'TikTok',
    thumbnail:  video.cover || video.originCover || video.origin_cover || v.cover || null,
    url:        `https://www.tiktok.com/@${unique}/video/${id}`,
    viewCount:  String(stats.playCount ?? stats.play_count ?? v.play_count ?? '') || null,
    likeCount:  String(stats.diggCount ?? stats.digg_count ?? v.digg_count ?? '') || null,
  }
}

async function tiktokSearch(rapidApiKey, rapidApiHost, query) {
  const host = (rapidApiHost && rapidApiHost.trim()) || 'tiktok-scraper7.p.rapidapi.com'
  const res  = await fetch(tiktokSearchUrl(host, query), {
    headers: { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': host },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `TikTok error ${res.status}`)
  const items =
    data.data?.videos ||
    data.item_list ||
    data.videos ||
    (Array.isArray(data.data) ? data.data : null) ||
    (Array.isArray(data.data?.data) ? data.data.data : null) ||
    []
  return (Array.isArray(items) ? items : []).map(normalizeTiktokItem).filter((v) => v.id)
}

// ─── Whisper ──────────────────────────────────────────────────────────────────

async function transcribeAudio(openaiApiKey, audioUrl) {
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Could not fetch audio: ${audioRes.status}`)
  const audioBuffer = await audioRes.arrayBuffer()
  const urlPath = new URL(audioUrl).pathname
  const ext     = urlPath.split('.').pop()?.toLowerCase() || 'mp3'
  const supported = ['mp3','mp4','mpeg','mpga','m4a','wav','webm','ogg','flac']
  const fileExt   = supported.includes(ext) ? ext : 'mp3'
  const formData  = new FormData()
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

// ─── CORS ─────────────────────────────────────────────────────────────────────

function isAllowedOrigin(origin) {
  if (!origin) return false
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  try {
    const { hostname, protocol } = new URL(origin)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (hostname.endsWith('.vercel.app')) return true
  } catch { return false }
  return false
}

function applyCors(req, res) {
  const origin = req.headers.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
  return isAllowedOrigin(origin)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const originAllowed = applyCors(req, res)

  if (req.method === 'OPTIONS') return res.status(originAllowed ? 200 : 403).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers.origin && !originAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  const action = (req.body && req.body.action) || (req.query && req.query.action)

  try {
    // ── Anthropic ────────────────────────────────────────────────────────────
    if (action === 'anthropic') {
      const apiKey = req.headers['x-api-key']
      if (!apiKey) return res.status(400).json({ error: 'API key is required' })
      const { action: _drop, ...anthropicBody } = req.body || {}
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
        },
        body: JSON.stringify(anthropicBody),
      })
      const data = await upstream.json().catch(() => ({ error: { message: `Anthropic error ${upstream.status}` } }))
      return res.status(upstream.status).json(data)
    }

    // ── YouTube search ────────────────────────────────────────────────────────
    if (action === 'youtube-search') {
      const { youtubeApiKey, query, duration, sort } = req.body
      if (!youtubeApiKey?.trim()) return res.status(400).json({ error: 'YouTube API key is required' })
      if (!query?.trim())         return res.status(400).json({ error: 'Search query is required' })
      const results = await youtubeSearch(youtubeApiKey, query, { duration, sort })
      return res.status(200).json({ results })
    }

    // ── Dailymotion ───────────────────────────────────────────────────────────
    if (action === 'dailymotion-search') {
      const { query, sort } = req.body
      if (!query?.trim()) return res.status(400).json({ error: 'Search query is required' })
      const results = await dailymotionSearch(query, { sort })
      return res.status(200).json({ results })
    }

    // ── Vimeo ─────────────────────────────────────────────────────────────────
    if (action === 'vimeo-search') {
      const { vimeoToken, query, sort } = req.body
      if (!vimeoToken?.trim()) return res.status(400).json({ error: 'Vimeo access token is required' })
      if (!query?.trim())      return res.status(400).json({ error: 'Search query is required' })
      const results = await vimeoSearch(vimeoToken, query, { sort })
      return res.status(200).json({ results })
    }

    // ── TikTok ────────────────────────────────────────────────────────────────
    if (action === 'tiktok-search') {
      const { rapidApiKey, rapidApiHost, query } = req.body
      if (!rapidApiKey?.trim()) return res.status(400).json({ error: 'RapidAPI key is required' })
      if (!query?.trim())       return res.status(400).json({ error: 'Search query is required' })
      const results = await tiktokSearch(rapidApiKey, rapidApiHost, query)
      return res.status(200).json({ results })
    }

    // ── Whisper ───────────────────────────────────────────────────────────────
    if (action === 'transcribe') {
      const { openaiApiKey, audioUrl } = req.body
      if (!openaiApiKey?.trim()) return res.status(400).json({ error: 'OpenAI API key is required' })
      if (!audioUrl?.trim())     return res.status(400).json({ error: 'Audio URL is required' })
      const transcript = await transcribeAudio(openaiApiKey, audioUrl)
      return res.status(200).json({ transcript })
    }

    // ── AI chat completion (default) ──────────────────────────────────────────
    const { provider, apiKey, model, messages, options = {}, customBaseUrl } = req.body
    if (!apiKey?.trim())    return res.status(400).json({ error: 'API key is required' })
    if (!messages?.length)  return res.status(400).json({ error: 'Messages are required' })

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
        ? { 'HTTP-Referer': req.headers.origin || 'https://content-intelligence-os1.vercel.app', 'X-Title': 'Content Intelligence OS' }
        : {}
      content = await callOpenAICompatible(url, apiKey, model, messages, options, extraHeaders)
    }

    return res.status(200).json({ content })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Request failed' })
  }
}
