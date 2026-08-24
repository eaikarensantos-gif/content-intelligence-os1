-- DM Automation — Fase 2 (motor de fluxo)
-- Rodar manualmente no SQL Editor do mesmo projeto Supabase da Fase 1.

-- ig_flows: definição de fluxo, versionada, como estrutura JSON.
create table if not exists ig_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version int not null default 1,
  status text not null default 'draft', -- draft | active | archived
  definition jsonb not null,
  created_at timestamptz not null default now()
);

-- liga uma regra de gatilho a um fluxo completo (em vez de só response_text,
-- que continua funcionando pra regras simples da Fase 1).
alter table ig_trigger_rules add column if not exists flow_id uuid references ig_flows(id);

-- ig_flow_runs: em qual nó cada contato está dentro de um fluxo, e o que já
-- respondeu (context).
create table if not exists ig_flow_runs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references ig_contacts(id),
  flow_id uuid not null references ig_flows(id),
  current_node_id text,
  status text not null default 'running', -- running | waiting_input | completed | failed
  context jsonb not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ig_flow_queue: continuações agendadas (depois de um nó de delay), com
-- retry/backoff e dead-letter. Processada por api/processQueue.js, chamado
-- por um workflow agendado do GitHub Actions.
create table if not exists ig_flow_queue (
  id uuid primary key default gen_random_uuid(),
  flow_run_id uuid not null references ig_flow_runs(id),
  node_id text not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  status text not null default 'pending', -- pending | processing | done | failed | dead_letter
  last_error text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ig_flows disable row level security;
alter table ig_flow_runs disable row level security;
alter table ig_flow_queue disable row level security;
