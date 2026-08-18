// Vercel Serverless Function — AI proxy + multi-platform video search + Whisper
// Routing (action via body.action):
//   'anthropic'        → Anthropic Messages API
//   'gemini'           → Gemini generateContent, translated to/from Anthropic Messages shape
//   'youtube-search'   → YouTube Data API v3 (supports duration + sort filters)
//   'dailymotion-search' → Dailymotion public API (no key, supports sort)
//   'vimeo-search'     → Vimeo API (token required, supports sort)
//   'tiktok-search'    → TikTok via RapidAPI provider
//   'transcribe'       → OpenAI Whisper
//   (default)          → AI chat completion

// The ~30 call sites across the app build requests in Anthropic Messages
// shape (model/system/messages/thinking/max_tokens) and parse responses as
// `content: [{type, text}]` + `stop_reason`. Rather than touch every call
// site, this map keeps the same Claude model names in the request body and
// translates them to their Gemini-generation equivalent here, then reshapes
// the Gemini response back into the same Anthropic shape the frontend
// already parses (see `src/utils/aiJson.js`).
const GEMINI_MODEL_MAP = {
  'claude-sonnet-5': 'gemini-3.5-flash',
  'claude-haiku-4-5-20251001': 'gemini-3.5-flash-lite',
}

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

// ─── Gemini (Anthropic-shape in, Anthropic-shape out) ─────────────────────────

function toGeminiRole(role) {
  return role === 'assistant' ? 'model' : 'user'
}

// Anthropic content blocks (`{type:'text'}` / `{type:'image', source:{type:'base64', media_type, data}}`)
// need translating to Gemini parts — otherwise a multi-block message (e.g. video
// frame analysis) gets JSON.stringified whole, sending raw base64 as text instead
// of an actual image the model can see.
function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }]
  if (!Array.isArray(content)) return [{ text: JSON.stringify(content) }]
  return content.map((block) => {
    if (block.type === 'text') return { text: block.text }
    if (block.type === 'image' && block.source?.type === 'base64') {
      return { inlineData: { mimeType: block.source.media_type, data: block.source.data } }
    }
    return { text: JSON.stringify(block) }
  })
}

async function callGeminiMessages(apiKey, { model, max_tokens, system, thinking, messages, grounding }) {
  const geminiModel = GEMINI_MODEL_MAP[model] || 'gemini-3.5-flash'
  const contents = (messages || []).map((m) => ({
    role: toGeminiRole(m.role),
    parts: toGeminiParts(m.content),
  }))

  const generationConfig = { maxOutputTokens: max_tokens || 2048 }
  if (thinking?.type === 'disabled') {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  } else {
    // Gemini's dynamic thinking budget (-1, uncapped) can consume most of
    // max_tokens on a complex prompt, starving the actual response and
    // causing silent truncation — the same failure mode as the Anthropic
    // adaptive-thinking bug from earlier in this app's history. This isn't
    // opt-in: Gemini enables thinking by default even when the caller never
    // passes a `thinking` param at all, so the cap has to apply
    // unconditionally — checking `thinking &&` here left every caller that
    // doesn't explicitly request thinking (title/hook/script/caption/cta in
    // the Hub, refQueries, etc.) fully exposed to the same truncation bug
    // this was supposed to have fixed for good. Capping at half the total
    // budget guarantees at least half stays for the text either way.
    const thinkingBudget = Math.max(1024, Math.floor((max_tokens || 2048) * 0.5))
    generationConfig.thinkingConfig = { thinkingBudget, includeThoughts: true }
  }

  const body = { contents, generationConfig }
  if (system) body.systemInstruction = { parts: [{ text: system }] }
  // Grounding com Google Search — usado quando o caller precisa de dados reais
  // e verificáveis (não a "memória" do modelo, que pode alucinar número e
  // fonte). Com isso ligado o Gemini pesquisa de verdade antes de responder,
  // e a resposta traz groundingMetadata com os links reais consultados.
  if (grounding) body.tools = [{ google_search: {} }]

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }
  )
  const data = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    const message = data.error?.message || `Gemini error ${upstream.status}`
    return { status: upstream.status, body: { error: { message } } }
  }

  const candidate = data.candidates?.[0]
  if (!candidate) {
    const reason = data.promptFeedback?.blockReason || 'sem candidatos na resposta'
    return { status: 502, body: { error: { message: `Gemini não retornou conteúdo (${reason})` } } }
  }

  const parts = candidate.content?.parts || []
  const text = parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('')
  const finishReason = candidate.finishReason
  const stop_reason =
    finishReason === 'MAX_TOKENS' ? 'max_tokens' : finishReason === 'STOP' ? 'end_turn' : finishReason || null

  const responseBody = { content: [{ type: 'text', text }], stop_reason }
  if (grounding) {
    const chunks = candidate.groundingMetadata?.groundingChunks || []
    const seen = new Set()
    responseBody.grounding_sources = chunks
      .map((c) => c.web)
      .filter((w) => w?.uri && w?.title && !seen.has(w.title) && seen.add(w.title))
      .slice(0, 8)

    // groundingSupports liga trechos específicos do texto gerado aos chunks
    // que os embasam — é o jeito confiável de saber QUAL fonte respalda QUAL
    // dado, em vez de confiar no modelo lembrar de citar a URL certa dentro
    // do JSON ou tentar casar nome de fonte por string (falha na maioria dos
    // casos, porque o título do resultado de busca raramente é igual ao nome
    // da instituição citada no texto).
    const supports = candidate.groundingMetadata?.groundingSupports || []
    responseBody.grounding_supports = supports
      .map((s) => ({
        text: s.segment?.text || '',
        sources: (s.groundingChunkIndices || [])
          .map((i) => chunks[i]?.web)
          .filter((w) => w?.uri)
          .map((w) => ({ uri: w.uri, title: w.title || null })),
      }))
      .filter((s) => s.text.trim().length > 0 && s.sources.length > 0)
      .slice(0, 40)
  }

  return { status: 200, body: responseBody }
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
    let reach = 0, replies = 0, exits = 0, tapsForward = 0, tapsBack = 0

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

    stories.push({
      id:           m.id,
      mediaType:    m.media_type || '',
      thumbnailUrl: m.thumbnail_url || m.media_url || null,
      permalink:    m.permalink || '',
      timestamp:    m.timestamp || '',
      reach, replies, exits, tapsForward, tapsBack,
    })
  }

  return { stories, insightsAvailable }
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

    // ── Gemini (Anthropic-shape compatibility) ───────────────────────────────
    if (action === 'gemini') {
      const apiKey = req.headers['x-api-key']
      if (!apiKey) return res.status(400).json({ error: 'API key is required' })
      const { action: _drop, ...geminiBody } = req.body || {}
      const result = await callGeminiMessages(apiKey, geminiBody)
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
