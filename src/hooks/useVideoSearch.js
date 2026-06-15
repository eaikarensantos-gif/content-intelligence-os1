import { useCallback, useState } from 'react'
import useVideoSwipeStore from '../store/useVideoSwipeStore'
import { queriesForCategories } from '../lib/videoCategories'
import { getEnabledPlatforms, normalizeResult } from '../lib/videoPlatforms'

// Fetches videos for the selected categories across every enabled platform
// (YouTube, Dailymotion, Vimeo, TikTok) and builds a deck, skipping anything the
// user already swiped on. Each (query × platform) call runs in parallel and the
// results are interleaved so the deck mixes platforms and categories.
export function useVideoSearch() {
  const seenIds = useVideoSwipeStore((s) => s.seenIds)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const search = useCallback(
    async (categories) => {
      const pairs = queriesForCategories(categories)
      if (pairs.length === 0) return []

      const platforms = getEnabledPlatforms()
      if (platforms.length === 0) return []

      setLoading(true)
      setError(null)
      try {
        const tasks = []
        for (const { category, query } of pairs) {
          for (const platform of platforms) {
            tasks.push(
              platform
                .run(query)
                .then((raw) => raw.map((r) => normalizeResult(r, category, query)))
            )
          }
        }

        const settled = await Promise.allSettled(tasks)
        const lists = settled
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value)

        const firstError = settled.find((r) => r.status === 'rejected')
        if (lists.every((l) => l.length === 0) && firstError) {
          throw firstError.reason
        }

        // Interleave round-robin so platforms/categories are mixed in the deck.
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
