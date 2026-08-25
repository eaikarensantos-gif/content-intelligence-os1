-- Resposta pública opcional no próprio comentário (diferente da DM privada) —
-- ex: "Te mandei uma DM!" visível pra todo mundo embaixo do comentário.
alter table ig_trigger_rules add column if not exists comment_reply_text text;
