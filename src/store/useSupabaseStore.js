import { create } from 'zustand'
import { resetSupabaseClient, getSupabaseUrl, getSupabaseKey, isSupabaseConfigured } from '../lib/supabase'

const useSupabaseStore = create((set, get) => ({
  url: getSupabaseUrl(),
  key: getSupabaseKey(),
  status: 'idle', // idle | loading | connected | error
  errorMsg: '',

  setUrl: (url) => {
    localStorage.setItem('supabase-url', url)
    resetSupabaseClient()
    set({ url, status: 'idle' })
  },

  setKey: (key) => {
    localStorage.setItem('supabase-key', key)
    resetSupabaseClient()
    set({ key, status: 'idle' })
  },

  setStatus: (status, errorMsg = '') => set({ status, errorMsg }),

  isConfigured: () => isSupabaseConfigured(),
}))

export default useSupabaseStore
