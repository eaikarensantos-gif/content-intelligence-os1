import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PROVIDERS } from '../lib/aiService'

const useAIStore = create(
  persist(
    (set, get) => ({
      provider: 'groq',
      apiKey: '',
      model: PROVIDERS.groq.defaultModel,
      customBaseUrl: '',

      setProvider: (provider) => {
        const def = PROVIDERS[provider]
        set({
          provider,
          model: def?.defaultModel || '',
        })
      },

      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),

      getSettings: () => {
        const { provider, apiKey, model, customBaseUrl } = get()
        return { provider, apiKey, model, customBaseUrl }
      },

      isConfigured: () => !!get().apiKey?.trim(),
    }),
    {
      name: 'content-intelligence-ai-settings',
      partialize: (s) => ({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
        customBaseUrl: s.customBaseUrl,
      }),
    }
  )
)

export default useAIStore
