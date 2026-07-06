import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PROVIDERS } from '../lib/aiService'

// The Anthropic key is also entered in Settings (localStorage), used by the
// app's direct Claude calls. Bridge it here so choosing Anthropic as the AI
// engine works with the key the user already saved — no double entry.
const LS_ANTHROPIC = 'cio-anthropic-key'

function readAnthropicKey() {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_ANTHROPIC)) || ''
  } catch {
    return ''
  }
}

const useAIStore = create(
  persist(
    (set, get) => ({
      provider: 'anthropic',
      apiKey: '',
      model: PROVIDERS.anthropic.defaultModel,
      customBaseUrl: '',
      youtubeApiKey: '',

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
      setYoutubeApiKey: (youtubeApiKey) => set({ youtubeApiKey }),

      getSettings: () => {
        const { provider, apiKey, model, customBaseUrl } = get()
        // Fall back to the Settings-stored Anthropic key when running on Claude.
        const key = apiKey?.trim() || (provider === 'anthropic' ? readAnthropicKey() : '')
        return { provider, apiKey: key, model, customBaseUrl }
      },

      isConfigured: () => {
        const { provider, apiKey } = get()
        if (apiKey?.trim()) return true
        return provider === 'anthropic' && !!readAnthropicKey().trim()
      },
      isYoutubeConfigured: () => !!get().youtubeApiKey?.trim(),
    }),
    {
      name: 'content-intelligence-ai-settings',
      partialize: (s) => ({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
        customBaseUrl: s.customBaseUrl,
        youtubeApiKey: s.youtubeApiKey,
      }),
    }
  )
)

export default useAIStore
