import { useCallback, useState } from 'react'
import { youtubeSearch, dailymotionSearch, vimeoSearch, tiktokSearch } from '../lib/aiService'
import useAIStore from '../store/useAIStore'
import useVideoSwipeStore from '../store/useVideoSwipeStore'
import { queriesForCategories } from '../lib/videoCategories'

function toVideoResult(raw, category, query) {
  const platform = raw.platform || 'youtube'
  const videoId  = raw.videoId || raw.id
  return {
    id:           `${platform}:${videoId}`,
    videoId,
    platform,
    title:        raw.videoTitle || raw.name || 'Sem título',
    channelName:  raw.name || raw.handle || '',
    thumbnailUrl:
      raw.thumbnail ||
      (platform === 'youtube' ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null),
    embedUrl:
      platform === 'youtube'     ? `https://www.youtube.com/embed/${videoId}` :
      platform === 'vimeo'       ? `https://player.vimeo.com/video/${videoId}` :
      platform === 'dailymotion' ? `https://www.dailymotion.com/embed/video/${videoId}` :
      null, // tiktok: no embed
    url:
      raw.url ||
      (platform === 'youtube' ? `https://www.youtube.com/watch?v=${videoId}` : null),
    viewCount:     raw.viewCount     || null,
    likeCount:     raw.likeCount     || null,
    engagementRate: raw.engagementRate || null,
    category,
    query,
  }
}

export function useVideoSearch() {
  const youtubeApiKey = useAIStore((s) => s.youtubeApiKey)
  const vimeoToken    = useAIStore((s) => s.vimeoToken)
  const rapidApiKey   = useAIStore((s) => s.rapidApiKey)
  const rapidApiHost  = useAIStore((s) => s.rapidApiHost)
  const seenIds = useVideoSwipeStore((s) => s.seenIds)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const search = useCallback(
    async (
      categories,
      { platforms = ['youtube', 'dailymotion'], filterDuration = 'any', filterSort = 'relevance' } = {}
    ) => {
      const pairs = queriesForCategories(categories)
      if (pairs.length === 0) return []

      setLoading(true)
      setError(null)

      try {
        const opts  = { duration: filterDuration, sort: filterSort }
        const tasks = []

        for (const { category, query } of pairs) {
          if (platforms.includes('youtube') && youtubeApiKey) {
            tasks.push(
              youtubeSearch(youtubeApiKey, query, opts)
                .then((r) => r.map((v) => toVideoResult(v, category, query)))
                .catch(() => [])
            )
          }
          if (platforms.includes('dailymotion')) {
            tasks.push(
              dailymotionSearch(query, opts)
                .then((r) => r.map((v) => toVideoResult(v, category, query)))
                .catch(() => [])
            )
          }
          if (platforms.includes('vimeo') && vimeoToken) {
            tasks.push(
              vimeoSearch(vimeoToken, query, opts)
                .then((r) => r.map((v) => toVideoResult(v, category, query)))
                .catch(() => [])
            )
          }
          if (platforms.includes('tiktok') && rapidApiKey) {
            tasks.push(
              tiktokSearch(rapidApiKey, rapidApiHost, query)
                .then((r) => r.map((v) => toVideoResult(v, category, query)))
                .catch(() => [])
            )
          }
        }

        if (tasks.length === 0) return []

        const lists = await Promise.all(tasks)

        // Interleave results round-robin across all task lists
        const interleaved = []
        const max = Math.max(0, ...lists.map((l) => l.length))
        for (let i = 0; i < max; i++) {
          for (const list of lists) {
            if (list[i]) interleaved.push(list[i])
          }
        }

        // De-dupe by id and drop already-seen videos
        const seen = new Set(seenIds)
        const out  = []
        for (const v of interleaved) {
          if (!v.id || seen.has(v.id)) continue
          seen.add(v.id)
          out.push(v)
        }
        return out
      } catch (err) {
        setError(err.message || 'Falha ao buscar vídeos')
        return []
      } finally {
        setLoading(false)
      }
    },
    [youtubeApiKey, vimeoToken, rapidApiKey, rapidApiHost, seenIds]
  )

  return { search, loading, error }
}
