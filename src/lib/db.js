import { getSupabase, isSupabaseConfigured } from './supabase'

// ─── Load all ─────────────────────────────────────────────────────────────────

export async function dbLoadAll() {
  if (!isSupabaseConfigured()) return null
  const db = getSupabase()

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
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('ideas').upsert(idea)
  if (error) console.error('[DB] Insert idea:', error.message)
}

export async function dbUpdateIdea(id, updates) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('ideas').update(updates).eq('id', id)
  if (error) console.error('[DB] Update idea:', error.message)
}

export async function dbDeleteIdea(id) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('ideas').delete().eq('id', id)
  if (error) console.error('[DB] Delete idea:', error.message)
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function dbInsertPost(post) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('posts').upsert(post)
  if (error) console.error('[DB] Insert post:', error.message)
}

export async function dbUpdatePost(id, updates) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('posts').update(updates).eq('id', id)
  if (error) console.error('[DB] Update post:', error.message)
}

export async function dbDeletePost(id) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('posts').delete().eq('id', id)
  if (error) console.error('[DB] Delete post:', error.message)
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function dbInsertMetric(metric) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('metrics').upsert(metric)
  if (error) console.error('[DB] Insert metric:', error.message)
}

export async function dbUpdateMetric(id, updates) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('metrics').update(updates).eq('id', id)
  if (error) console.error('[DB] Update metric:', error.message)
}

export async function dbDeleteMetric(id) {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().from('metrics').delete().eq('id', id)
  if (error) console.error('[DB] Delete metric:', error.message)
}
