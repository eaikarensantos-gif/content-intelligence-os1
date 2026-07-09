import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PROVIDERS } from '../lib/aiService'

const LS_YOUTUBE      = 'cio-youtube-key'
const LS_VIMEO        = 'cio-vimeo-token'
const LS_RAPIDAPI     = 'cio-rapidapi-key'
const LS_RAPIDAPI_HOST = 'cio-rapidapi-tiktok-host'

const useAIStore = create(
  persist(
    (set, get) => ({
      provider: 'groq',
      apiKey: '',
      model: PROVIDERS.groq.defaultModel,
      customBaseUrl: '',
      youtubeApiKey: '',
      vimeoToken: '',
      rapidApiKey: '',
      rapidApiHost: '',

      setProvider: (provider) => {
        const def = PROVIDERS[provider]
        set({ provider, model: def?.defaultModel || '' })
      },
      setApiKey:      (apiKey)      => set({ apiKey }),
      setModel:       (model)       => set({ model }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
      setYoutubeApiKey: (youtubeApiKey) => set({ youtubeApiKey }),
      setVimeoToken:    (vimeoToken)    => set({ vimeoToken }),
      setRapidApiKey:   (rapidApiKey)   => set({ rapidApiKey }),
      setRapidApiHost:  (rapidApiHost)  => set({ rapidApiHost }),

      getSettings: () => {
        const { provider, apiKey, model, customBaseUrl } = get()
        return { provider, apiKey, model, customBaseUrl }
      },

      isConfigured:       () => !!get().apiKey?.trim(),
      isYoutubeConfigured: () => !!get().youtubeApiKey?.trim(),
      isVimeoConfigured:   () => !!get().vimeoToken?.trim(),
      isTiktokConfigured:  () => !!get().rapidApiKey?.trim(),
    }),
    {
      name: 'content-intelligence-ai-settings',
      partialize: (s) => ({
        provider:     s.provider,
        apiKey:       s.apiKey,
        model:        s.model,
        customBaseUrl: s.customBaseUrl,
        youtubeApiKey: s.youtubeApiKey,
        vimeoToken:    s.vimeoToken,
        rapidApiKey:   s.rapidApiKey,
        rapidApiHost:  s.rapidApiHost,
      }),
      // Bridge existing localStorage keys saved by SupabaseSettings
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.youtubeApiKey) {
          const v = localStorage.getItem(LS_YOUTUBE)
          if (v) state.youtubeApiKey = v
        }
        if (!state.vimeoToken) {
          const v = localStorage.getItem(LS_VIMEO)
          if (v) state.vimeoToken = v
        }
        if (!state.rapidApiKey) {
          const v = localStorage.getItem(LS_RAPIDAPI)
          if (v) state.rapidApiKey = v
        }
        if (!state.rapidApiHost) {
          const v = localStorage.getItem(LS_RAPIDAPI_HOST)
          if (v) state.rapidApiHost = v
        }
      },
    }
  )
)

export default useAIStore
