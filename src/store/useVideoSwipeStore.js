import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Older backups may contain null instead of arrays. Restore only data fields,
// keeping the store's actions and valid saved selections intact.
export function mergeVideoSwipeState(saved, current) {
  const data = saved && typeof saved === 'object' ? saved : {}
  const result = { ...current }
  for (const key of ['selectedCategories', 'selectedPlatforms', 'queue', 'seenIds']) {
    if (Array.isArray(data[key])) {
      result[key] = data[key].filter(value => key === 'queue'
        ? value && typeof value === 'object' && value.id != null
        : typeof value === 'string')
    }
  }
  if (['any', 'short', 'medium', 'long'].includes(data.filterDuration)) result.filterDuration = data.filterDuration
  if (['relevance', 'recent', 'views'].includes(data.filterSort)) result.filterSort = data.filterSort
  return result
}

const useVideoSwipeStore = create(
  persist(
    (set, get) => ({
      selectedCategories: [],
      selectedPlatforms: ['youtube', 'dailymotion'],
      filterDuration: 'any',
      filterSort: 'relevance',
      queue: [],
      seenIds: [],

      toggleCategory: (category) =>
        set((s) => ({
          selectedCategories: s.selectedCategories.includes(category)
            ? s.selectedCategories.filter((c) => c !== category)
            : [...s.selectedCategories, category],
        })),

      setSelectedCategories: (selectedCategories) => set({ selectedCategories }),

      togglePlatform: (platform) =>
        set((s) => ({
          selectedPlatforms: s.selectedPlatforms.includes(platform)
            ? s.selectedPlatforms.filter((p) => p !== platform)
            : [...s.selectedPlatforms, platform],
        })),

      setFilterDuration: (filterDuration) => set({ filterDuration }),
      setFilterSort:     (filterSort)     => set({ filterSort }),

      saveToQueue: (video) =>
        set((s) => ({
          queue: s.queue.some((v) => v.id === video.id) ? s.queue : [video, ...s.queue],
          seenIds: s.seenIds.includes(video.id) ? s.seenIds : [...s.seenIds, video.id],
        })),

      markSeen: (id) =>
        set((s) => ({
          seenIds: s.seenIds.includes(id) ? s.seenIds : [...s.seenIds, id],
        })),

      removeFromQueue: (id) =>
        set((s) => ({ queue: s.queue.filter((v) => v.id !== id) })),

      clearQueue: () => set({ queue: [] }),
      resetSeen:  () => set({ seenIds: [] }),
      isSeen: (id) => get().seenIds.includes(id),
    }),
    {
      name: 'content-intelligence-video-swipe',
      merge: mergeVideoSwipeState,
      partialize: (s) => ({
        selectedCategories: s.selectedCategories,
        selectedPlatforms:  s.selectedPlatforms,
        filterDuration:     s.filterDuration,
        filterSort:         s.filterSort,
        queue:   s.queue,
        seenIds: s.seenIds,
      }),
    }
  )
)

export default useVideoSwipeStore
