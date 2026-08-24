-- DM Automation — segue a Fase 2, depois de confirmar com um evento real que
-- resposta privada a comentário (recipient.comment_id) não abre a janela de
-- 24h de mensageria: um delay/continuação depois de um fluxo iniciado por
-- comentário falha com "message is sent outside of allowed window" na Meta.
--
-- started_via guarda o tipo do evento que iniciou o flow_run (comment |
-- mention | message | story_reply), pra api/instagramWebhook.js e
-- src/lib/dmServer.js saberem quando bloquear um nó de delay antes de tentar
-- (e falhar) o envio.

alter table ig_flow_runs add column if not exists started_via text;
alter table ig_flow_runs add column if not exists error_message text;
