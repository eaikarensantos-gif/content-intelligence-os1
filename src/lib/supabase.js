import { createClient } from '@supabase/supabase-js'

const ENV_URL = import.meta.env.VITE_SUPABASE_URL || ''
const ENV_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

let _client = null

export function getSupabaseUrl() {
  return localStorage.getItem('supabase-url') || ENV_URL
}

export function getSupabaseKey() {
  return localStorage.getItem('supabase-key') || ENV_KEY
}

export function getSupabase() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null
  if (_client) return _client
  _client = createClient(url, key)
  return _client
}

export function resetSupabaseClient() {
  _client = null
}

export function isSupabaseConfigured() {
  return !!(getSupabaseUrl() && getSupabaseKey())
}
