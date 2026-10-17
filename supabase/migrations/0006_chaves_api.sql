-- Cofre das chaves de API (OpenAI, Groq, YouTube...). Só o servidor (service role)
-- lê e grava: RLS ligado e nenhuma política, então a chave pública do app não
-- enxerga a tabela. O navegador nunca recebe o valor de volta, só o final.
create table if not exists chaves_api (
  nome          text primary key,
  valor         text not null,
  atualizado_em timestamptz not null default now()
);

alter table chaves_api enable row level security;
revoke all on chaves_api from anon, authenticated;
