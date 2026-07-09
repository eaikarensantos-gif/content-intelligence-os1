import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
