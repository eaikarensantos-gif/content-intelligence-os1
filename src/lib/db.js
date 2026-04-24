// Banco de dados via Supabase — tabela única user_data (chave/valor JSONB)
// SQL para rodar no Supabase SQL Editor:
//
// create table if not exists user_data (
//   key text primary key,
//   value jsonb not null default '[]',
//   updated_at timestamptz default now()
// );
// alter table user_data disable row level security;

import { getSupabase, isSupabaseConfigured } from './supabase'

const COLLECTIONS = [
  'ideas', 'posts', 'metrics', 'clients', 'videoAnalyses',
  'thoughtCaptures', 'tasks', 'ads', 'leads', 'archetypes',
  'hybridArchetypes', 'favorites', 'pricingProducts', 'proposals',
  'creatorProfile', 'brandVoice', 'bannedWords', 'hiddenReportTags',
]

// ─── Carrega todos os dados do Supabase ───────────────────────────────────────

export async function dbLoadAll() {
  if (!isSupabaseConfigured()) return null
  const db = getSupabase()

  const { data, error } = await db.from('user_data').select('key, value')
  if (error) throw new Error(error.message)

  const result = {}
  data.forEach((row) => { result[row.key] = row.value })
  return result
}

// ─── Salva todo o estado no Supabase (debounced pelo store) ───────────────────

export async function dbSaveAll(state) {
  if (!isSupabaseConfigured()) return
  const db = getSupabase()

  const rows = COLLECTIONS.map((key) => ({
    key,
    value: state[key] ?? [],
    updated_at: new Date().toISOString(),
  }))

  const { error } = await db.from('user_data').upsert(rows)
  if (error) console.error('[DB] Sync error:', error.message)
}

// ─── Testa a conexão ──────────────────────────────────────────────────────────

export async function dbTestConnection() {
  if (!isSupabaseConfigured()) throw new Error('Credenciais não configuradas')
  const db = getSupabase()
  const { error } = await db.from('user_data').select('key').limit(1)
  if (error) throw new Error(error.message)
  return true
}
