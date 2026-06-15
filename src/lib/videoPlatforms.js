import { youtubeSearch, dailymotionSearch, vimeoSearch, tiktokSearch } from './aiService'

// localStorage slots for the per-platform credentials. YouTube reuses the same
// slot the rest of the app already uses.
export const LS_YOUTUBE = 'cio-youtube-key'
export const LS_VIMEO = 'cio-vimeo-token'
export const LS_RAPIDAPI = 'cio-rapidapi-key'
export const LS_RAPIDAPI_HOST = 'cio-rapidapi-tiktok-host'

function embedUrl(platform, videoId) {
  switch (platform) {
    case 'youtube':     return `https://www.youtube.com/embed/${videoId}`
    case 'dailymotion': return `https://www.dailymotion.com/embed/video/${videoId}`
    case 'vimeo':       return `https://player.vimeo.com/video/${videoId}`
    case 'tiktok':      return `https://www.tiktok.com/embed/v2/${videoId}`
    default:            return ''
  }
}

function fallbackThumb(platform, videoId) {
  if (platform === 'youtube') return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  return null
}

// Normalize a raw result (from any platform) into the VideoResult shape the
// swipe cards consume. The id is namespaced by platform to avoid collisions.
export function normalizeResult(raw, category, query) {
  const platform = raw.platform || 'youtube'
  const videoId = raw.videoId || raw.id
  return {
    id: `${platform}:${videoId}`,
    videoId,
    platform,
    title: raw.videoTitle || raw.name || 'Sem título',
    channelName: raw.name || raw.handle || '',
    thumbnailUrl: raw.thumbnail || fallbackThumb(platform, videoId),
    embedUrl: embedUrl(platform, videoId),
    url: raw.url || '',
    viewCount: raw.viewCount || null,
    likeCount: raw.likeCount || null,
    engagementRate: raw.engagementRate || null,
    category,
    query,
  }
}

// Which platforms are active right now, based on configured credentials.
// Dailymotion needs no key, so it's always available; YouTube is included when
// its key is set; Vimeo/TikTok join once their credentials are configured.
export function getEnabledPlatforms() {
  const platforms = []

  const youtubeKey = (localStorage.getItem(LS_YOUTUBE) || '').trim()
  if (youtubeKey) {
    platforms.push({ id: 'youtube', label: 'YouTube', run: (q) => youtubeSearch(youtubeKey, q) })
  }

  // Always on — public search, no key.
  platforms.push({ id: 'dailymotion', label: 'Dailymotion', run: (q) => dailymotionSearch(q) })

  const vimeoToken = (localStorage.getItem(LS_VIMEO) || '').trim()
  if (vimeoToken) {
    platforms.push({ id: 'vimeo', label: 'Vimeo', run: (q) => vimeoSearch(vimeoToken, q) })
  }

  const rapidKey = (localStorage.getItem(LS_RAPIDAPI) || '').trim()
  if (rapidKey) {
    const host = (localStorage.getItem(LS_RAPIDAPI_HOST) || '').trim()
    platforms.push({ id: 'tiktok', label: 'TikTok', run: (q) => tiktokSearch(rapidKey, host, q) })
  }

  return platforms
}

export function enabledPlatformLabels() {
  return getEnabledPlatforms().map((p) => p.label)
}
