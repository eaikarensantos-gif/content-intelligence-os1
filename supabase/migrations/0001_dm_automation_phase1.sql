-- DM Automation — Fase 1 (captura e resposta)
-- Rodar manualmente no SQL Editor do projeto Supabase configurado em
-- Configurações (mesmo convite usado por src/lib/db.js). RLS fica desligada,
-- seguindo o padrão já usado na tabela user_data deste projeto (uso único,
-- sem multi-tenant).

-- ig_connection: token de acesso do Instagram usado pelo webhook (servidor).
-- Linha única (id = 'default'), escrita pelo frontend logo após o OAuth
-- (ver src/lib/instagramAuth.js) e lida pelo webhook via
-- SUPABASE_SERVICE_ROLE_KEY.
create table if not exists ig_connection (
  id text primary key default 'default',
  ig_user_id text,
  ig_username text,
  access_token text not null,
  app_secret text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ig_events: log bruto de cada evento recebido do webhook + chave de dedup.
create table if not exists ig_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null, -- comment | message | story_reply | mention
  raw_payload jsonb not null,
  matched_rule_id uuid,
  status text not null default 'received', -- received | sent | skipped | error
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ig_contacts: registro mínimo de contato (Fase 3 expande com busca/export).
create table if not exists ig_contacts (
  id uuid primary key default gen_random_uuid(),
  ig_scoped_id text not null unique,
  ig_username text,
  tags text[] not null default '{}',
  fields jsonb not null default '{}',
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ig_trigger_rules: gatilhos ativos. Sem UI na Fase 1 — popular via SQL
-- Editor do Supabase por enquanto (Fase 2 formaliza o fluxo como JSON).
create table if not exists ig_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text not null, -- comment | message | story_reply | mention
  match_mode text not null, -- any_comment_on_post | keyword_exact | keyword_partial | first_message
  match_value text,
  post_id text,
  response_text text not null,
  tag_to_apply text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ig_dm_log: log de cada tentativa de envio (auditoria + critério de aceite).
create table if not exists ig_dm_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references ig_contacts(id),
  event_id uuid references ig_events(id),
  rule_id uuid references ig_trigger_rules(id),
  message_text text not null,
  send_result jsonb,
  status text not null default 'pending', -- pending | sent | failed
  created_at timestamptz not null default now()
);

alter table ig_connection disable row level security;
alter table ig_events disable row level security;
alter table ig_contacts disable row level security;
alter table ig_trigger_rules disable row level security;
alter table ig_dm_log disable row level security;
