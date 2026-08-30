// Vercel Serverless Function — AI proxy + multi-platform video search + Whisper
// Routing (action via body.action):
//   'openai'           → OpenAI Responses API, with the legacy response shape
//   'youtube-search'   → YouTube Data API v3 (supports duration + sort filters)
//   'dailymotion-search' → Dailymotion public API (no key, supports sort)
//   'vimeo-search'     → Vimeo API (token required, supports sort)
//   'tiktok-search'    → TikTok via RapidAPI provider
//   'transcribe'       → OpenAI Whisper for an audio URL
//   'transcribe-url'   → YouTube captions or OpenAI transcription for direct media URLs
//   (default)          → AI chat completion

import { ANTI_AI_FILTER } from '../src/lib/antiAIFilter.js'

const PROVIDER_URLS = {
  openai:     'https://api.openai.com/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  custom:     null,
}

// Enforce the editorial protocol at the shared gateway so a new generator
// cannot accidentally bypass it. Faithful transformations such as translation
// may opt out explicitly because rewriting their source would be incorrect.
function withGlobalAntiCliche(system = '') {
  if (system.includes('FILTRO DE AUTENTICIDADE — REGRA GLOBAL')) return system
  return `${ANTI_AI_FILTER}\n\n---\n\n${system}`.trim()
}

function messagesWithGlobalAntiCliche(messages = [], skipAntiCliche = false) {
  if (skipAntiCliche) return messages
  const systemIndex = messages.findIndex((message) => message.role === 'system')
  if (systemIndex < 0) {
    return [{ role: 'system', content: withGlobalAntiCliche() }, ...messages]
  }
  return messages.map((message, index) => index === systemIndex
    ? { ...message, content: withGlobalAntiCliche(message.content || '') }
    : message)
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

// ─── OpenAI Responses API (legacy response shape out) ────────────────────────

function toOpenAIContent(content, role) {
  const textType = role === 'assistant' ? 'output_text' : 'input_text'
  if (typeof content === 'string') return [{ type: textType, text: content }]
  if (!Array.isArray(content)) return [{ type: textType, text: JSON.stringify(content) }]
  return content.flatMap((block) => {
    if (block.type === 'text') return [{ type: textType, text: block.text || '' }]
    if (role !== 'assistant' && block.type === 'image' && block.source?.type === 'base64') {
      return [{ type: 'input_image', image_url: `data:${block.source.media_type};base64,${block.source.data}`, detail: 'auto' }]
    }
    return []
  })
}

async function callOpenAIResponses(apiKey, { model, max_tokens, system, thinking, messages, grounding }) {
  const input = (messages || []).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: toOpenAIContent(message.content, message.role),
  }))
  const body = {
    model: model || 'gpt-5.6-terra',
    input,
    max_output_tokens: max_tokens || 2048,
    reasoning: { effort: thinking?.type === 'disabled' ? 'none' : 'medium' },
    text: { verbosity: 'medium' },
    store: false,
  }
  if (system) body.instructions = system
  if (grounding) body.tools = [{ type: 'web_search' }]

  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  const data = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    const message = data.error?.message || `OpenAI error ${upstream.status}`
    return { status: upstream.status, body: { error: { message } } }
  }

  const text = data.output_text || (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text || '')
    .join('')
  if (!text) return { status: 502, body: { error: { message: 'OpenAI não retornou conteúdo.' } } }

  const annotations = (data.output || [])
    .flatMap((item) => item.content || [])
    .flatMap((item) => item.annotations || [])
    .filter((annotation) => annotation.type === 'url_citation' && annotation.url)
  const seen = new Set()
  const grounding_sources = annotations
    .filter((annotation) => !seen.has(annotation.url) && seen.add(annotation.url))
    .map((annotation) => ({ uri: annotation.url, title: annotation.title || annotation.url }))
    .slice(0, 8)

  return {
    status: 200,
    body: {
      content: [{ type: 'text', text }],
      stop_reason: data.status === 'incomplete' ? 'max_tokens' : 'end_turn',
      ...(grounding ? { grounding_sources } : {}),
    },
  }
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
      caption:       item.snippet.description || '',
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
    caption:    v.desc || v.title || '',
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

// ─── Instagram via Apify ────────────────────────────────────────────────────
// Usa o ator oficial "Instagram Scraper" da Apify (apify/instagram-scraper),
// buscando por hashtag. O actorId é configurável (mesma ideia do host do
// RapidAPI no TikTok) porque outros atores de scraping do Instagram têm
// entrada/saída em formatos diferentes — o mapeamento abaixo segue o schema
// documentado do ator oficial e pode precisar de ajuste pra outros atores.

function normalizeInstagramItem(v) {
  const id = String(v.id || v.shortCode || '')
  const views = v.videoViewCount ?? v.videoPlayCount ?? null
  return {
    id,
    videoId:    id,
    platform:   'instagram',
    videoTitle: (v.caption || '').slice(0, 100) || 'Instagram Reel',
    caption:    v.caption || '',
    name:       v.ownerFullName || v.ownerUsername || 'Instagram',
    thumbnail:  v.displayUrl || null,
    url:        v.url || (v.shortCode ? `https://www.instagram.com/p/${v.shortCode}/` : ''),
    viewCount:  views != null ? String(views) : null,
    likeCount:  v.likesCount != null ? String(v.likesCount) : null,
  }
}

async function instagramSearch(apifyToken, actorId, query) {
  const actor = (actorId && actorId.trim()) || 'apify~instagram-scraper'
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search: query,
      searchType: 'hashtag',
      searchLimit: 1,
      resultsLimit: 10,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (data && !Array.isArray(data) && (data.error?.message || data.message)) || `Apify error ${res.status}`
    throw new Error(message)
  }
  const items = Array.isArray(data) ? data : []
  return items
    .filter((v) => v.type === 'Video' || v.productType === 'clips' || v.videoUrl)
    .map(normalizeInstagramItem)
    .filter((v) => v.id)
}

// ─── Instagram OAuth oficial (Instagram API com login da empresa) ─────────────
// Fluxo nativo do Instagram Business Login — login direto pela conta do
// Instagram, sem precisar de Página do Facebook. appId/appSecret aqui são o
// "ID do app do Instagram" e a "Chave secreta do app do Instagram" (Casos de
// uso → API do Instagram → Configuração da API com login da empresa no
// Instagram), não as credenciais do App do Facebook.

async function instagramOAuthConnect(appId, appSecret, code, redirectUri) {
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  })
  const shortData = await shortRes.json().catch(() => ({}))
  if (!shortRes.ok || !shortData.access_token) {
    throw new Error(shortData.error_message || shortData.error?.message || 'Falha ao trocar o código de autorização por um token.')
  }

  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&access_token=${encodeURIComponent(shortData.access_token)}`
  )
  const longData = await longRes.json().catch(() => ({}))
  if (!longRes.ok || !longData.access_token) {
    throw new Error(longData.error?.message || 'Falha ao gerar o token de longa duração.')
  }

  const meRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type,profile_picture_url` +
    `&access_token=${encodeURIComponent(longData.access_token)}`
  )
  const meData = await meRes.json().catch(() => ({}))
  if (!meRes.ok) {
    throw new Error(meData.error?.message || 'Falha ao buscar os dados da conta do Instagram.')
  }

  return {
    accessToken: longData.access_token,
    expiresIn:   longData.expires_in || null,
    accounts: [{
      id:                meData.id,
      username:          meData.username || null,
      accountType:       meData.account_type || null,
      profilePictureUrl: meData.profile_picture_url || null,
    }],
  }
}

// ─── Instagram — sincronizar posts recentes + insights ────────────────────────
// Busca os últimos posts da conta conectada e, pra cada um, tenta puxar
// alcance/salvamentos/compartilhamentos via /insights. Esse endpoint exige o
// escopo instagram_business_manage_insights — se o token só tem
// instagram_business_basic (conexões feitas antes desse escopo existir), a
// chamada de insights falha e devolvemos os posts só com like_count/comments_count
// (que vêm do próprio objeto de mídia, sem precisar de permissão extra).

async function instagramFetchMetrics(accessToken, limit) {
  const mediaRes = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count` +
    `&limit=${encodeURIComponent(limit)}&access_token=${encodeURIComponent(accessToken)}`
  )
  const mediaData = await mediaRes.json().catch(() => ({}))
  if (!mediaRes.ok) {
    throw new Error(mediaData.error?.message || 'Falha ao buscar publicações do Instagram.')
  }

  const items = mediaData.data || []
  let insightsAvailable = true
  let linkClicksAvailable = true

  const postTypeMap = { REELS: 'reel', CAROUSEL_ALBUM: 'carousel', IMAGE: 'image', VIDEO: 'video' }

  // "views" é a métrica universal de visualizações (substitui "plays", que só
  // existia pra Reels) — tentamos o conjunto completo primeiro e, se a API
  // rejeitar (nem todo media_product_type aceita "views"), caímos pro conjunto
  // básico que já sabemos que funciona antes de desistir de vez dos insights.
  async function fetchInsights(mediaId, metricNames) {
    const res = await fetch(
      `https://graph.instagram.com/${mediaId}/insights?metric=${metricNames}&access_token=${encodeURIComponent(accessToken)}`
    )
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  const rows = []
  for (const m of items) {
    let reach = 0, saves = 0, shares = 0, views = 0

    if (insightsAvailable) {
      const fullMetrics  = 'reach,saved,shares,views'
      const basicMetrics = 'reach,saved,shares'

      let { ok, status, data } = await fetchInsights(m.id, fullMetrics)
      if (!ok && (status === 400)) {
        ({ ok, status, data } = await fetchInsights(m.id, basicMetrics))
      }

      if (ok) {
        for (const metric of data.data || []) {
          const val = metric.values?.[0]?.value ?? metric.total_value?.value ?? 0
          if (metric.name === 'reach')  reach = val
          if (metric.name === 'saved')  saves = val
          if (metric.name === 'shares') shares = val
          if (metric.name === 'views')  views = val
        }
      } else if (status === 400 || status === 403) {
        insightsAvailable = false
      }
    }

    const isoDate = m.timestamp || ''
    rows.push({
      post_id:      m.id,
      platform:     'instagram',
      date:         isoDate.slice(0, 10),
      publish_time: isoDate.slice(11, 16),
      impressions:  views || reach,
      reach,
      likes:        m.like_count || 0,
      comments:     m.comments_count || 0,
      shares,
      saves,
      follows:      0,
      link_clicks:  0,
      duration_sec: 0,
      description:  m.caption || '',
      link:         m.permalink || '',
      post_type:    postTypeMap[m.media_product_type] || (m.media_type || '').toLowerCase(),
      client:       '',
    })
  }

  return { rows, insightsAvailable }
}

// ─── Instagram — posts com thumbnail, tempo assistido e comentários ──────────
// Fetch mais rico que instagramFetchMetrics, pra tela dedicada de Posts do
// Instagram (thumbnail, tempo médio assistido de Reels). Mantido separado do
// fetch usado no import de métricas pra não pesar o fluxo mais simples do
// MetricsForm com campos que ele não usa.

async function instagramFetchPosts(accessToken, limit) {
  const mediaRes = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
    `&limit=${encodeURIComponent(limit)}&access_token=${encodeURIComponent(accessToken)}`
  )
  const mediaData = await mediaRes.json().catch(() => ({}))
  if (!mediaRes.ok) {
    throw new Error(mediaData.error?.message || 'Falha ao buscar publicações do Instagram.')
  }

  const items = mediaData.data || []
  let insightsAvailable = true
  const postTypeMap = { REELS: 'reel', CAROUSEL_ALBUM: 'carousel', IMAGE: 'image', VIDEO: 'video' }

  async function fetchInsights(mediaId, metricNames) {
    const res = await fetch(
      `https://graph.instagram.com/${mediaId}/insights?metric=${metricNames}&access_token=${encodeURIComponent(accessToken)}`
    )
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  const posts = []
  for (const m of items) {
    let reach = 0, saves = 0, shares = 0, views = 0, avgWatchTimeMs = 0

    if (insightsAvailable) {
      // Tenta do conjunto mais completo pro mais básico — "ig_reels_avg_watch_time"
      // pode não existir nessa API (ela é nova, a métrica foi documentada
      // originalmente pro fluxo via Página do Facebook), então cada tier cai
      // pro anterior se a API rejeitar um nome de métrica específico (400).
      const tiers = m.media_product_type === 'REELS'
        ? ['reach,saved,shares,views,ig_reels_avg_watch_time', 'reach,saved,shares,views', 'reach,saved,shares']
        : ['reach,saved,shares,views', 'reach,saved,shares']

      let result = null
      for (const metricNames of tiers) {
        result = await fetchInsights(m.id, metricNames)
        if (result.ok || result.status !== 400) break
      }

      if (result?.ok) {
        for (const metric of result.data.data || []) {
          const val = metric.values?.[0]?.value ?? metric.total_value?.value ?? 0
          if (metric.name === 'reach')  reach = val
          if (metric.name === 'saved')  saves = val
          if (metric.name === 'shares') shares = val
          if (metric.name === 'views')  views = val
          if (metric.name === 'ig_reels_avg_watch_time') avgWatchTimeMs = val
        }
      } else if (result?.status === 400 || result?.status === 403) {
        insightsAvailable = false
      }
    }

    posts.push({
      id:              m.id,
      caption:         m.caption || '',
      postType:        postTypeMap[m.media_product_type] || (m.media_type || '').toLowerCase(),
      thumbnailUrl:    m.thumbnail_url || m.media_url || null,
      permalink:       m.permalink || '',
      timestamp:       m.timestamp || '',
      likes:           m.like_count || 0,
      comments:        m.comments_count || 0,
      reach, saves, shares, views,
      avgWatchTimeSec: avgWatchTimeMs ? Math.round(avgWatchTimeMs / 1000) : 0,
    })
  }

  return { posts, insightsAvailable }
}

// ─── Instagram — Stories ativos ────────────────────────────────────────────
// Stories somem 24h depois de publicados — não há como ter histórico sem uma
// sincronização recorrente própria (o app não tem cron, só serverless
// disparada por requisição), então isso sempre reflete só o que está no ar
// agora, no momento em que a página é aberta.

async function instagramFetchStories(accessToken) {
  const mediaRes = await fetch(
    `https://graph.instagram.com/me/stories?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp` +
    `&access_token=${encodeURIComponent(accessToken)}`
  )
  const mediaData = await mediaRes.json().catch(() => ({}))
  if (!mediaRes.ok) {
    throw new Error(mediaData.error?.message || 'Falha ao buscar Stories ativos.')
  }

  const items = mediaData.data || []
  let insightsAvailable = true

  async function fetchInsights(mediaId, metricNames) {
    const res = await fetch(
      `https://graph.instagram.com/${mediaId}/insights?metric=${metricNames}&access_token=${encodeURIComponent(accessToken)}`
    )
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  const stories = []
  for (const m of items) {
    let reach = 0, replies = 0, exits = 0, tapsForward = 0, tapsBack = 0, linkClicks = null

    if (insightsAvailable) {
      const tiers = ['reach,replies,exits,taps_forward,taps_back', 'reach,replies', 'reach']
      let result = null
      for (const metricNames of tiers) {
        result = await fetchInsights(m.id, metricNames)
        if (result.ok || result.status !== 400) break
      }
      if (result?.ok) {
        for (const metric of result.data.data || []) {
          const val = metric.values?.[0]?.value ?? metric.total_value?.value ?? 0
          if (metric.name === 'reach')        reach       = val
          if (metric.name === 'replies')      replies     = val
          if (metric.name === 'exits')        exits       = val
          if (metric.name === 'taps_forward') tapsForward = val
          if (metric.name === 'taps_back')    tapsBack    = val
        }
      } else if (result?.status === 400 || result?.status === 403) {
        insightsAvailable = false
      }
    }

    // Link sticker taps are requested separately. Meta exposes `link_clicks`
    // only for eligible Story/account/login combinations; keeping it out of
    // the main metric bundle prevents an unsupported metric from hiding reach,
    // replies and navigation that are still available.
    if (insightsAvailable && linkClicksAvailable) {
      const clickResult = await fetchInsights(m.id, 'link_clicks')
      if (clickResult.ok) {
        const metric = (clickResult.data.data || []).find((item) => item.name === 'link_clicks')
        linkClicks = metric
          ? (metric.values?.[0]?.value ?? metric.total_value?.value ?? 0)
          : null
      } else if (clickResult.status === 400 || clickResult.status === 403) {
        linkClicksAvailable = false
      }
    }

    stories.push({
      id:           m.id,
      mediaType:    m.media_type || '',
      thumbnailUrl: m.thumbnail_url || m.media_url || null,
      permalink:    m.permalink || '',
      timestamp:    m.timestamp || '',
      reach, replies, exits, tapsForward, tapsBack, linkClicks,
    })
  }

  return { stories, insightsAvailable, linkClicksAvailable }
}

// ─── Instagram — publicar post (imagem) ─────────────────────────────────────
// Fluxo em dois passos da Content Publishing API: cria um container de mídia
// a partir de uma image_url pública, depois publica esse container. A imagem
// já precisa estar hospedada numa URL pública antes desta chamada — quem
// resolve isso é o cliente (upload para o Supabase Storage).

async function instagramPublishPost(accessToken, imageUrl, caption) {
  const createRes = await fetch('https://graph.instagram.com/me/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image_url: imageUrl, caption: caption || '', access_token: accessToken }),
  })
  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok || !createData.id) {
    throw new Error(createData.error?.message || 'Falha ao criar o container de mídia no Instagram.')
  }

  const publishRes = await fetch('https://graph.instagram.com/me/media_publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: createData.id, access_token: accessToken }),
  })
  const publishData = await publishRes.json().catch(() => ({}))
  if (!publishRes.ok || !publishData.id) {
    throw new Error(publishData.error?.message || 'Falha ao publicar no Instagram.')
  }

  let permalink = null
  try {
    const permRes = await fetch(
      `https://graph.instagram.com/${publishData.id}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`
    )
    const permData = await permRes.json().catch(() => ({}))
    if (permRes.ok) permalink = permData.permalink || null
  } catch {
    // Permalink é só um extra pra UI — publicação já aconteceu, não falha por isso.
  }

  return { id: publishData.id, permalink }
}

// ─── Instagram — responder comentário ──────────────────────────────────────
// Requer o escopo instagram_business_manage_comments (conexões feitas antes
// desse escopo existir precisam reconectar antes de conseguir usar isso).

async function instagramReplyToComment(accessToken, commentId, message) {
  const res = await fetch(`https://graph.instagram.com/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: accessToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || 'Falha ao publicar a resposta no Instagram.')
  }
  return { id: data.id }
}

async function instagramFetchComments(accessToken, mediaId) {
  const res = await fetch(
    `https://graph.instagram.com/${mediaId}/comments?fields=id,text,username,timestamp,like_count` +
    `&access_token=${encodeURIComponent(accessToken)}`
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || 'Falha ao buscar comentários.')
  return (data.data || []).map((c) => ({
    id:        c.id,
    text:      c.text || '',
    username:  c.username || '',
    timestamp: c.timestamp || '',
    likeCount: c.like_count || 0,
  }))
}

// ─── Instagram — visão geral da conta (não por post) ──────────────────────────
// Perfil (contadores em tempo real), métricas agregadas dos últimos 30 dias,
// crescimento de seguidores dia a dia, e demografia da audiência. Cada bloco é
// buscado e degradado de forma independente — se um falhar (conta pequena
// demais pra ter demografia, métrica não suportada, etc.) os outros blocos
// continuam disponíveis em vez de derrubar a resposta inteira.

async function instagramFetchAccountOverview(accessToken) {
  const profileRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url` +
    `&access_token=${encodeURIComponent(accessToken)}`
  )
  const profile = await profileRes.json().catch(() => ({}))
  if (!profileRes.ok) {
    throw new Error(profile.error?.message || 'Falha ao buscar o perfil da conta.')
  }

  const until = Math.floor(Date.now() / 1000)
  const since = until - 30 * 24 * 60 * 60

  async function fetchInsights(metricNames, extraParams = '') {
    const url = `https://graph.instagram.com/me/insights?metric=${metricNames}&period=day&since=${since}&until=${until}${extraParams}` +
      `&access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url)
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  // Totais do período (soma os valores diários de cada métrica)
  let periodStats = null
  {
    const tiers = [
      'reach,profile_views,website_clicks,accounts_engaged,total_interactions',
      'reach,profile_views,accounts_engaged',
      'reach',
    ]
    let result = null
    for (const metricNames of tiers) {
      result = await fetchInsights(metricNames)
      if (result.ok || result.status !== 400) break
    }
    if (result?.ok) {
      periodStats = {}
      for (const metric of result.data.data || []) {
        periodStats[metric.name] = (metric.values || []).reduce((sum, v) => sum + (v.value || 0), 0)
      }
    }
  }

  // Crescimento de seguidores dia a dia
  let followerGrowth = []
  {
    const result = await fetchInsights('follower_count')
    if (result.ok) {
      const series = (result.data.data || []).find((m) => m.name === 'follower_count')
      followerGrowth = (series?.values || [])
        .map((v) => ({ date: (v.end_time || '').slice(0, 10), value: v.value || 0 }))
        .filter((p) => p.date)
    }
  }

  // Demografia — idade+gênero, cidade, país (cada dimensão é uma chamada própria)
  async function fetchDemographics(breakdown) {
    const url = `https://graph.instagram.com/me/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${breakdown}` +
      `&access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return null
    const results = data.data?.[0]?.total_value?.breakdowns?.[0]?.results || []
    return results
      .map((r) => ({ key: (r.dimension_values || []).join(' · '), value: r.value || 0 }))
      .sort((a, b) => b.value - a.value)
  }

  const [ageGender, city, country] = await Promise.all([
    fetchDemographics('age,gender'),
    fetchDemographics('city'),
    fetchDemographics('country'),
  ])

  // Seguidores online por hora — a métrica pública da Meta (online_followers)
  // agrega isso pela semana toda; não expõe uma quebra por dia da semana.
  let onlineFollowers = null
  {
    const res = await fetch(
      `https://graph.instagram.com/me/insights?metric=online_followers&period=lifetime` +
      `&access_token=${encodeURIComponent(accessToken)}`
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const raw = data.data?.[0]?.values?.[0]?.value
      if (raw && typeof raw === 'object') {
        onlineFollowers = Array.from({ length: 24 }, (_, hour) => ({ hour, count: raw[String(hour)] || 0 }))
      }
    }
  }

  // Melhores dias da semana pra postar — a Meta não expõe isso como métrica
  // agregada, então calculamos a partir do engajamento (curtidas + comentários)
  // dos próprios posts recentes, agrupado por dia da semana da publicação.
  let dayPeaks = null
  {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=timestamp,like_count,comments_count` +
      `&limit=50&access_token=${encodeURIComponent(accessToken)}`
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      const byDay = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
      for (const m of data.data || []) {
        if (!m.timestamp) continue
        const d = new Date(m.timestamp).getDay()
        byDay[d].sum += (m.like_count || 0) + (m.comments_count || 0)
        byDay[d].count += 1
      }
      const withPosts = byDay
        .map((d, i) => ({ day: DAY_NAMES[i], avgEngagement: d.count ? Math.round(d.sum / d.count) : 0, count: d.count }))
        .filter((d) => d.count > 0)
      if (withPosts.length) dayPeaks = withPosts
    }
  }

  return {
    profile: {
      username:          profile.username || '',
      name:              profile.name || '',
      biography:         profile.biography || '',
      website:           profile.website || '',
      followersCount:    profile.followers_count || 0,
      followsCount:      profile.follows_count || 0,
      mediaCount:        profile.media_count || 0,
      profilePictureUrl: profile.profile_picture_url || null,
    },
    periodStats,
    followerGrowth,
    dayPeaks,
    onlineFollowers,
    demographics: {
      ageGender: ageGender || [],
      city:      city || [],
      country:   country || [],
      available: !!(ageGender?.length || city?.length || country?.length),
    },
  }
}

// ─── Whisper ──────────────────────────────────────────────────────────────────

async function normalizeSocialMedia(audioBuffer, inputExtension) {
  const [{ default: ffmpegPath }, fs, os, path, childProcess] = await Promise.all([
    import('ffmpeg-static'),
    import('node:fs/promises'),
    import('node:os'),
    import('node:path'),
    import('node:child_process'),
  ])
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cio-transcribe-'))
  const inputPath = path.join(tempDir, `input.${inputExtension || 'mp4'}`)
  const outputPath = path.join(tempDir, 'audio.wav')
  try {
    await fs.writeFile(inputPath, Buffer.from(audioBuffer))
    await new Promise((resolve, reject) => {
      childProcess.execFile(ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
        '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath,
      ], { timeout: 120_000 }, (error, _stdout, stderr) => {
        if (!error) return resolve()
        const detail = String(stderr || error.message || '')
          .split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1)
        reject(new Error(detail || 'Falha desconhecida do conversor.'))
      })
    })
    return await fs.readFile(outputPath)
  } catch (error) {
    throw new Error(`O servidor não conseguiu preparar a faixa de áudio do vídeo para transcrição. ${error.message}`)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function downloadSocialTrack(videoUrl, formatId) {
  const [{ default: youtubeDl }, { default: ffmpegPath }, fs, os, path] = await Promise.all([
    import('youtube-dl-exec'),
    import('ffmpeg-static'),
    import('node:fs/promises'),
    import('node:os'),
    import('node:path'),
  ])
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cio-download-'))
  const outputTemplate = path.join(tempDir, 'source.%(ext)s')
  try {
    await youtubeDl(videoUrl, {
      format: formatId,
      output: outputTemplate,
      extractAudio: true,
      audioFormat: 'wav',
      ffmpegLocation: path.dirname(ffmpegPath),
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
    }, { timeout: 120_000 })
    const outputName = (await fs.readdir(tempDir)).find((name) => name.endsWith('.wav'))
    if (!outputName) throw new Error('O yt-dlp não gerou o arquivo WAV esperado.')
    return await fs.readFile(path.join(tempDir, outputName))
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function transcribeAudio(openaiApiKey, audioUrl, hintedExtension = '', normalize = false, downloadSource = null) {
  let contentType = ''
  let declaredSize = 0
  let audioBuffer
  if (downloadSource?.videoUrl && downloadSource?.formatId) {
    audioBuffer = await downloadSocialTrack(downloadSource.videoUrl, downloadSource.formatId)
    contentType = 'audio/wav'
    hintedExtension = 'wav'
    normalize = false
    declaredSize = audioBuffer.byteLength
  } else {
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error(`Could not fetch audio: ${audioRes.status}`)
    contentType = (audioRes.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) {
      throw new Error('O endereço de mídia retornou uma página HTML de bloqueio em vez do vídeo.')
    }
    declaredSize = Number(audioRes.headers.get('content-length') || 0)
    audioBuffer = await audioRes.arrayBuffer()
  }
  const maxBytes = 25 * 1024 * 1024
  if (declaredSize > maxBytes) {
    throw new Error('O arquivo do link ultrapassa 25 MB. Envie o arquivo pelo upload para que o app possa reduzi-lo antes da transcrição.')
  }
  if (audioBuffer.byteLength > maxBytes) {
    throw new Error('O arquivo do link ultrapassa 25 MB. Envie o arquivo pelo upload para que o app possa reduzi-lo antes da transcrição.')
  }
  const typeToExtension = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'video/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  }
  const urlPath = new URL(audioUrl).pathname
  const pathExt = urlPath.split('.').pop()?.toLowerCase()
  const ext = hintedExtension.toLowerCase() || typeToExtension[contentType.split(';')[0]] || pathExt || 'mp3'
  const supported = ['mp3','mp4','mpeg','mpga','m4a','wav','webm','ogg','flac']
  let fileExt = supported.includes(ext) ? ext : 'mp3'
  if (normalize) {
    audioBuffer = await normalizeSocialMedia(audioBuffer, fileExt)
    fileExt = 'wav'
  }
  const extensionMimeTypes = { m4a: 'audio/mp4', mp4: 'video/mp4', mp3: 'audio/mpeg' }
  const mimeType = normalize ? 'audio/wav' : (hintedExtension && extensionMimeTypes[fileExt]) || contentType.split(';')[0] || extensionMimeTypes[fileExt] || `audio/${fileExt}`
  const retryableStatuses = new Set([429, 502, 503, 504])

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${fileExt}`)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'json')
    const transcriptionRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
    })
    const responseText = await transcriptionRes.text()
    let data = null
    try { data = JSON.parse(responseText) } catch { /* handled below */ }

    if (transcriptionRes.ok && data?.text) return data.text
    const retryable = retryableStatuses.has(transcriptionRes.status)
    if (retryable && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)))
      continue
    }
    if (transcriptionRes.status === 401) {
      const authError = new Error('A chave da OpenAI foi recusada. Gere uma nova chave na OpenAI Platform e substitua a chave salva em Configurações.')
      authError.code = 'OPENAI_AUTH_ERROR'
      throw authError
    }
    if (data?.error?.message) throw new Error(data.error.message)
    throw new Error(`A API de transcrição falhou (${transcriptionRes.status}) após ${attempt + 1} tentativa${attempt ? 's' : ''}.`)
  }
  throw new Error('A API de transcrição não retornou uma resposta.')
}

function isYouTubeUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be'
  } catch {
    return false
  }
}

function isDirectMediaUrl(value) {
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const hostname = parsed.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false
    return /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|flac)$/i.test(parsed.pathname)
  } catch {
    return false
  }
}

function socialVideoService(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'TikTok'
    if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'Instagram'
    return null
  } catch {
    return null
  }
}

async function resolveSocialAudioUrl(videoUrl) {
  const service = socialVideoService(videoUrl)
  if (!service) return null
  try {
    const { default: youtubeDl } = await import('youtube-dl-exec')
    const output = await youtubeDl(videoUrl, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
    }, { timeout: 90_000 })
    const formats = Array.isArray(output?.formats) ? output.formats : []
    const progressive = formats.filter((format) =>
      format?.url && format.ext === 'mp4' && format.acodec !== 'none' && format.vcodec !== 'none'
    )
    const audioOnly = formats.filter((format) =>
      format?.url && format.acodec && format.acodec !== 'none' && format.vcodec === 'none'
    )
    const withinLimit = [...audioOnly, ...progressive].filter((format) =>
      Number(format.filesize || format.filesize_approx || 0) < 25 * 1024 * 1024
    )
    // Prefer the explicit audio-only track. Its fragmented M4A is normalized
    // to PCM WAV before transcription, so it is safer than ambiguous MP4s.
    const selected = withinLimit[0] || audioOnly.at(-1)
    if (!selected?.url) throw new Error('Nenhum arquivo de áudio foi retornado.')
    return {
      url: selected.url,
      fileExt: selected.ext || 'm4a',
      sourceVideoUrl: videoUrl,
      formatId: selected.format_id,
    }
  } catch {
    throw new Error(`Não foi possível acessar este vídeo do ${service}. Confirme que ele é público; vídeos privados, restritos por idade ou que exigem login precisam ser enviados pelo upload.`)
  }
}

function normalizeInstagramPermalink(value) {
  try {
    const parsed = new URL(value)
    return `${parsed.hostname.toLowerCase().replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}`
  } catch {
    return ''
  }
}

async function resolveInstagramFromOfficialApi(videoUrl, accessToken) {
  if (!accessToken?.trim()) return null
  let nextUrl = `https://graph.instagram.com/me/media?fields=id,media_url,permalink,media_type,media_product_type&limit=100&access_token=${encodeURIComponent(accessToken)}`
  const target = normalizeInstagramPermalink(videoUrl)
  for (let page = 0; nextUrl && page < 3; page += 1) {
    const response = await fetch(nextUrl)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return null
    const match = (data.data || []).find((item) => normalizeInstagramPermalink(item.permalink) === target)
    if (match?.media_url && (match.media_type === 'VIDEO' || match.media_product_type === 'REELS')) return match.media_url
    nextUrl = data.paging?.next || null
  }
  return null
}

async function resolveInstagramFromApify(videoUrl, apifyToken, actorId) {
  if (!apifyToken?.trim()) return null
  const actor = (actorId && actorId.trim()) || 'apify~instagram-scraper'
  const response = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directUrls: [videoUrl], resultsType: 'details', resultsLimit: 1 }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(data)) return null
  const item = data.find((entry) => entry?.videoUrl || entry?.video_url || entry?.url)
  return item?.videoUrl || item?.video_url || null
}

async function transcribeVideoUrl(openaiApiKey, videoUrl, language = 'pt', integrations = {}) {
  if (isYouTubeUrl(videoUrl)) {
    const { YoutubeTranscript } = await import('youtube-transcript')
    try {
      let segments = null
      const preferredLanguages = [...new Set([language, language === 'pt' ? 'pt-BR' : null, 'en'].filter(Boolean))]
      for (const lang of preferredLanguages) {
        try {
          segments = await YoutubeTranscript.fetchTranscript(videoUrl, { lang })
          break
        } catch {
          // Try the next preferred language before accepting YouTube's first track.
        }
      }
      if (!segments) segments = await YoutubeTranscript.fetchTranscript(videoUrl)
      const transcript = segments.map((segment) => segment.text).join(' ').replace(/\s+/g, ' ').trim()
      if (!transcript) throw new Error('A transcrição retornou vazia.')
      return { transcript, source: 'youtube_captions' }
    } catch {
      throw new Error('Este vídeo do YouTube não possui legendas públicas disponíveis. Envie o arquivo de vídeo ou cole a transcrição.')
    }
  }

  if (isDirectMediaUrl(videoUrl)) {
    const transcript = await transcribeAudio(openaiApiKey, videoUrl)
    return { transcript, source: 'openai_transcription' }
  }

  if (socialVideoService(videoUrl)) {
    const service = socialVideoService(videoUrl)
    const candidates = []
    try {
      const publicMedia = await resolveSocialAudioUrl(videoUrl)
      if (publicMedia) candidates.push(publicMedia)
    } catch {
      // Instagram and TikTok frequently block anonymous server requests.
    }
    if (service === 'Instagram' && candidates.length === 0) {
      const officialUrl = await resolveInstagramFromOfficialApi(videoUrl, integrations.instagramAccessToken)
      if (officialUrl) candidates.push(officialUrl)
      if (candidates.length === 0) {
        const apifyUrl = await resolveInstagramFromApify(videoUrl, integrations.apifyToken, integrations.apifyActorId)
        if (apifyUrl) candidates.push(apifyUrl)
      }
    }

    let lastError = null
    const uniqueCandidates = [...new Map(candidates.map((candidate) => {
      const normalized = typeof candidate === 'string' ? { url: candidate, fileExt: '' } : candidate
      return [normalized.url, normalized]
    })).values()]
    for (const media of uniqueCandidates) {
      try {
        const transcript = await transcribeAudio(openaiApiKey, media.url, media.fileExt, true,
          media.sourceVideoUrl && media.formatId
            ? { videoUrl: media.sourceVideoUrl, formatId: media.formatId }
            : null)
        if (transcript?.trim()) return { transcript, source: 'social_video_transcription' }
      } catch (error) {
        if (error?.code === 'OPENAI_AUTH_ERROR') throw error
        lastError = error
      }
    }

    const setupHint = service === 'Instagram'
      ? 'Conecte sua conta do Instagram ou configure a Apify em Configurações; vídeos privados continuam exigindo upload.'
      : 'Confirme que o vídeo é público ou envie o arquivo pelo upload.'
    const detail = lastError?.message ? ` Última tentativa: ${lastError.message}` : ''
    throw new Error(`Não foi possível acessar este vídeo do ${service}. ${setupHint}${detail}`)
  }

  throw new Error('Link não compatível. Use YouTube, Instagram, TikTok ou uma URL direta de MP4, MP3, M4A, WAV ou WebM.')
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
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
    // ── OpenAI Responses API (compatibility response shape) ─────────────────
    if (action === 'openai') {
      const apiKey = req.headers['x-api-key']
      if (!apiKey) return res.status(400).json({ error: 'API key is required' })
      const { action: _drop, skipAntiCliche = false, ...openaiBody } = req.body || {}
      if (!skipAntiCliche) openaiBody.system = withGlobalAntiCliche(openaiBody.system || '')
      const result = await callOpenAIResponses(apiKey, openaiBody)
      return res.status(result.status).json(result.body)
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

    // ── Instagram ─────────────────────────────────────────────────────────────
    if (action === 'instagram-search') {
      const { apifyToken, apifyActorId, query } = req.body
      if (!apifyToken?.trim()) return res.status(400).json({ error: 'Apify API token is required' })
      if (!query?.trim())      return res.status(400).json({ error: 'Search query is required' })
      const results = await instagramSearch(apifyToken, apifyActorId, query)
      return res.status(200).json({ results })
    }

    // ── Instagram OAuth (Meta Graph API oficial) ─────────────────────────────
    if (action === 'instagram-oauth-connect') {
      const { appId, appSecret, code, redirectUri } = req.body
      if (!appId?.trim() || !appSecret?.trim()) return res.status(400).json({ error: 'App ID e App Secret do Meta são obrigatórios.' })
      if (!code?.trim())        return res.status(400).json({ error: 'Código de autorização ausente.' })
      if (!redirectUri?.trim()) return res.status(400).json({ error: 'redirectUri é obrigatório.' })
      const result = await instagramOAuthConnect(appId, appSecret, code, redirectUri)
      return res.status(200).json(result)
    }

    // ── Instagram — sincronizar métricas ──────────────────────────────────────
    if (action === 'instagram-sync-metrics') {
      const { accessToken, limit } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      const result = await instagramFetchMetrics(accessToken, limit || 25)
      return res.status(200).json(result)
    }

    // ── Instagram — posts com thumbnail + comentários ─────────────────────────
    if (action === 'instagram-fetch-posts') {
      const { accessToken, limit } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      const result = await instagramFetchPosts(accessToken, limit || 25)
      return res.status(200).json(result)
    }

    if (action === 'instagram-fetch-comments') {
      const { accessToken, mediaId } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      if (!mediaId?.trim())      return res.status(400).json({ error: 'mediaId é obrigatório.' })
      const comments = await instagramFetchComments(accessToken, mediaId)
      return res.status(200).json({ comments })
    }

    // ── Instagram — publicar post (imagem já hospedada numa URL pública) ─────
    if (action === 'instagram-publish-post') {
      const { accessToken, imageUrl, caption } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      if (!imageUrl?.trim())    return res.status(400).json({ error: 'imageUrl é obrigatório — a imagem precisa estar hospedada numa URL pública.' })
      const result = await instagramPublishPost(accessToken, imageUrl, caption || '')
      return res.status(200).json(result)
    }

    if (action === 'instagram-reply-comment') {
      const { accessToken, commentId, message } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      if (!commentId?.trim())   return res.status(400).json({ error: 'commentId é obrigatório.' })
      if (!message?.trim())     return res.status(400).json({ error: 'Mensagem de resposta vazia.' })
      const result = await instagramReplyToComment(accessToken, commentId, message)
      return res.status(200).json(result)
    }

    // ── Instagram — visão geral da conta ──────────────────────────────────────
    if (action === 'instagram-account-overview') {
      const { accessToken } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      const result = await instagramFetchAccountOverview(accessToken)
      return res.status(200).json(result)
    }

    // ── Instagram — Stories ativos ────────────────────────────────────────────
    if (action === 'instagram-fetch-stories') {
      const { accessToken } = req.body
      if (!accessToken?.trim()) return res.status(400).json({ error: 'Token do Instagram ausente. Reconecte em Configurações.' })
      const result = await instagramFetchStories(accessToken)
      return res.status(200).json(result)
    }

    // ── Whisper ───────────────────────────────────────────────────────────────
    if (action === 'transcribe') {
      const { openaiApiKey, audioUrl } = req.body
      if (!openaiApiKey?.trim()) return res.status(400).json({ error: 'OpenAI API key is required' })
      if (!audioUrl?.trim())     return res.status(400).json({ error: 'Audio URL is required' })
      const transcript = await transcribeAudio(openaiApiKey, audioUrl)
      return res.status(200).json({ transcript })
    }

    if (action === 'transcribe-url') {
      const apiKey = req.headers['x-api-key'] || req.body?.openaiApiKey
      const { videoUrl, language, instagramAccessToken, apifyToken, apifyActorId } = req.body || {}
      if (!apiKey?.trim()) return res.status(400).json({ error: 'OpenAI API key is required' })
      if (!videoUrl?.trim()) return res.status(400).json({ error: 'Video URL is required' })
      const result = await transcribeVideoUrl(apiKey, videoUrl.trim(), language || 'pt', {
        instagramAccessToken,
        apifyToken,
        apifyActorId,
      })
      return res.status(200).json(result)
    }

    // ── AI chat completion (default) ──────────────────────────────────────────
    const { provider, apiKey, model, messages, options = {}, customBaseUrl, skipAntiCliche = false } = req.body
    if (!apiKey?.trim())    return res.status(400).json({ error: 'API key is required' })
    if (!messages?.length)  return res.status(400).json({ error: 'Messages are required' })

    const filteredMessages = messagesWithGlobalAntiCliche(messages, skipAntiCliche)
    let content
    if (provider === 'openai') {
      const systemMessage = filteredMessages.find((message) => message.role === 'system')
      const result = await callOpenAIResponses(apiKey, {
        model: model || 'gpt-5.6-terra',
        max_tokens: options.maxTokens,
        system: systemMessage?.content || '',
        thinking: { type: options.reasoningEffort === 'none' ? 'disabled' : 'adaptive' },
        messages: filteredMessages.filter((message) => message.role !== 'system'),
      })
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.body.error?.message || 'OpenAI request failed' })
      }
      content = result.body.content?.[0]?.text || ''
    } else if (provider === 'gemini') {
      content = await callGemini(apiKey, model, filteredMessages, options)
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
      content = await callOpenAICompatible(url, apiKey, model, filteredMessages, options, extraHeaders)
    }

    return res.status(200).json({ content })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Request failed' })
  }
}
