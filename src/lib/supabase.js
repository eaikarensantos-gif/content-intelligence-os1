import { createClient } from '@supabase/supabase-js'

// Usa variáveis de ambiente do Vercel como padrão,
// com fallback para o que o usuário configurou manualmente no localStorage.
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

// ─── SQL para criar as tabelas no Supabase ────────────────────────────────────
// Cole isso no SQL Editor do Supabase (Dashboard → SQL Editor → New query):
//
// create table if not exists ideas (
//   id text primary key,
//   title text,
//   description text,
//   topic text,
//   format text,
//   hook_type text,
//   platform text,
//   priority text,
//   status text,
//   tags jsonb default '[]',
//   post_id text,
//   scheduled_date text,
//   created_at timestamptz default now()
// );
//
// create table if not exists posts (
//   id text primary key,
//   idea_id text,
//   title text,
//   content text,
//   platform text,
//   format text,
//   hook_type text,
//   status text,
//   published_at text,
//   created_at timestamptz default now()
// );
//
// create table if not exists metrics (
//   id text primary key,
//   post_id text,
//   platform text,
//   format text,
//   hook_type text,
//   views int default 0,
//   likes int default 0,
//   comments int default 0,
//   shares int default 0,
//   saves int default 0,
//   link_clicks int default 0,
//   engagement_rate float,
//   authority_score float,
//   recorded_at text,
//   created_at timestamptz default now()
// );
//
// -- Desativar RLS para uso single-user (ou configure policies conforme necessário)
// alter table ideas disable row level security;
// alter table posts disable row level security;
// alter table metrics disable row level security;
