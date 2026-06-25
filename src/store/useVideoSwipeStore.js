import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// State for the video swipe feature:
//   - selected categories
//   - the reaction queue (videos swiped right / saved)
//   - ids the user already swiped on (left or right) so we don't show them again
const useVideoSwipeStore = create(
  persist(
    (set, get) => ({
      selectedCategories: [],
      // Which platforms to pull from. null = not chosen yet (defaults to all
      // available); otherwise an explicit list of platform ids.
      selectedPlatforms: null,
      queue: [],
      seenIds: [],

      // `allIds` is the full set of currently-available platforms. When nothing
      // has been chosen yet (null = all active), we materialize from `allIds`
      // first so that clicking an active chip de-selects it (instead of flipping
      // the meaning of the list).
      togglePlatform: (id, allIds = []) =>
        set((s) => {
          const base = s.selectedPlatforms ?? allIds
          return {
            selectedPlatforms: base.includes(id)
              ? base.filter((p) => p !== id)
              : [...base, id],
          }
        }),

      setSelectedPlatforms: (selectedPlatforms) => set({ selectedPlatforms }),

      toggleCategory: (category) =>
        set((s) => ({
          selectedCategories: s.selectedCategories.includes(category)
            ? s.selectedCategories.filter((c) => c !== category)
            : [...s.selectedCategories, category],
        })),

      setSelectedCategories: (selectedCategories) => set({ selectedCategories }),

      // Swipe right → save to the reaction queue (deduplicated by id).
      saveToQueue: (video) =>
        set((s) => ({
          queue: s.queue.some((v) => v.id === video.id) ? s.queue : [video, ...s.queue],
          seenIds: s.seenIds.includes(video.id) ? s.seenIds : [...s.seenIds, video.id],
        })),

      // Swipe left → skip (just mark as seen).
      markSeen: (id) =>
        set((s) => ({
          seenIds: s.seenIds.includes(id) ? s.seenIds : [...s.seenIds, id],
        })),

      removeFromQueue: (id) =>
        set((s) => ({ queue: s.queue.filter((v) => v.id !== id) })),

      clearQueue: () => set({ queue: [] }),

      // Reset which videos have been seen so the same searches surface again.
      resetSeen: () => set({ seenIds: [] }),

      isSeen: (id) => get().seenIds.includes(id),
    }),
    {
      name: 'content-intelligence-video-swipe',
      partialize: (s) => ({
        selectedCategories: s.selectedCategories,
        selectedPlatforms: s.selectedPlatforms,
        queue: s.queue,
        seenIds: s.seenIds,
      }),
    }
  )
)

export default useVideoSwipeStore
