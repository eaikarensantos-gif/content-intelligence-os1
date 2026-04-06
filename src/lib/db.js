// Todas as operações de banco de dados via Supabase
import { getSupabase } from './supabase'

function client() {
  const url = localStorage.getItem('supabase-url')
  const key = localStorage.getItem('supabase-key')
  return getSupabase(url, key)
}

function isConfigured() {
  return !!(localStorage.getItem('supabase-url') && localStorage.getItem('supabase-key'))
}

// ─── Load all ─────────────────────────────────────────────────────────────────

export async function dbLoadAll() {
  if (!isConfigured()) return null
  const db = client()

  const [ideasRes, postsRes, metricsRes] = await Promise.all([
    db.from('ideas').select('*').order('created_at', { ascending: false }),
    db.from('posts').select('*').order('created_at', { ascending: false }),
    db.from('metrics').select('*').order('created_at', { ascending: false }),
  ])

  if (ideasRes.error) throw new Error(ideasRes.error.message)
  if (postsRes.error) throw new Error(postsRes.error.message)
  if (metricsRes.error) throw new Error(metricsRes.error.message)

  return {
    ideas: ideasRes.data || [],
    posts: postsRes.data || [],
    metrics: metricsRes.data || [],
  }
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function dbInsertIdea(idea) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('ideas').upsert(idea)
  if (error) console.error('[DB] Insert idea:', error.message)
}

export async function dbUpdateIdea(id, updates) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('ideas').update(updates).eq('id', id)
  if (error) console.error('[DB] Update idea:', error.message)
}

export async function dbDeleteIdea(id) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('ideas').delete().eq('id', id)
  if (error) console.error('[DB] Delete idea:', error.message)
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function dbInsertPost(post) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('posts').upsert(post)
  if (error) console.error('[DB] Insert post:', error.message)
}

export async function dbUpdatePost(id, updates) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('posts').update(updates).eq('id', id)
  if (error) console.error('[DB] Update post:', error.message)
}

export async function dbDeletePost(id) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('posts').delete().eq('id', id)
  if (error) console.error('[DB] Delete post:', error.message)
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function dbInsertMetric(metric) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('metrics').upsert(metric)
  if (error) console.error('[DB] Insert metric:', error.message)
}

export async function dbUpdateMetric(id, updates) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('metrics').update(updates).eq('id', id)
  if (error) console.error('[DB] Update metric:', error.message)
}

export async function dbDeleteMetric(id) {
  if (!isConfigured()) return
  const db = client()
  const { error } = await db.from('metrics').delete().eq('id', id)
  if (error) console.error('[DB] Delete metric:', error.message)
}
