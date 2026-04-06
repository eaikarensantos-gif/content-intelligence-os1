import { create } from 'zustand'
import { resetSupabaseClient } from '../lib/supabase'

const useSupabaseStore = create((set, get) => ({
  url: localStorage.getItem('supabase-url') || '',
  key: localStorage.getItem('supabase-key') || '',
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

  isConfigured: () => !!(get().url?.trim() && get().key?.trim()),
}))

export default useSupabaseStore
