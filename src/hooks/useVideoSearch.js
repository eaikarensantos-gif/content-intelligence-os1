import { useCallback, useState } from 'react'
import { youtubeSearch } from '../lib/aiService'
import useVideoSwipeStore from '../store/useVideoSwipeStore'
import { queriesForCategories } from '../lib/videoCategories'

// Same localStorage slot the rest of the app (Settings, Creator Insights) uses
// for the YouTube Data API key.
const LS_YOUTUBE = 'cio-youtube-key'

// Normalize a raw YouTube search result (shape from aiService.youtubeSearch)
// into the VideoResult shape the swipe cards consume.
function toVideoResult(raw, category, query) {
  const videoId = raw.videoId || raw.id
  return {
    id: `youtube:${videoId}`,
    videoId,
    platform: 'youtube',
    title: raw.videoTitle || raw.name || 'Sem título',
    channelName: raw.name || raw.handle || '',
    thumbnailUrl: raw.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    url: raw.url || `https://www.youtube.com/watch?v=${videoId}`,
    viewCount: raw.viewCount || null,
    likeCount: raw.likeCount || null,
    engagementRate: raw.engagementRate || null,
    category,
    query,
  }
}

// Fetches videos for the selected categories and builds a deck, skipping any
// video the user has already swiped on. Queries are fetched in parallel and
// interleaved so the deck mixes categories rather than running one at a time.
export function useVideoSearch() {
  const seenIds = useVideoSwipeStore((s) => s.seenIds)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const search = useCallback(
    async (categories) => {
      const pairs = queriesForCategories(categories)
      if (pairs.length === 0) return []

      const youtubeApiKey = localStorage.getItem(LS_YOUTUBE) || ''

      setLoading(true)
      setError(null)
      try {
        const settled = await Promise.allSettled(
          pairs.map(async ({ category, query }) => {
            const raw = await youtubeSearch(youtubeApiKey, query)
            return raw.map((r) => toVideoResult(r, category, query))
          })
        )

        // Interleave results round-robin across queries for a varied deck.
        const lists = settled
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value)

        const firstError = settled.find((r) => r.status === 'rejected')
        if (lists.length === 0 && firstError) {
          throw firstError.reason
        }

        const interleaved = []
        const max = Math.max(0, ...lists.map((l) => l.length))
        for (let i = 0; i < max; i++) {
          for (const list of lists) {
            if (list[i]) interleaved.push(list[i])
          }
        }

        // De-dupe by id and drop anything already swiped.
        const seen = new Set(seenIds)
        const out = []
        for (const v of interleaved) {
          if (seen.has(v.id)) continue
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
    [seenIds]
  )

  return { search, loading, error }
}
