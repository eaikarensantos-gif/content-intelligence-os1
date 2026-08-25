-- DM Automation — Fase 4 (broadcast segmentado)
--
-- last_inbound_message_at guarda quando o contato mandou uma mensagem de
-- verdade pela última vez (evento message/story_reply, não comentário) —
-- é diferente de last_interaction_at, que também é tocado por respostas a
-- comentário (que NÃO abrem a janela de 24h, ver migração 0003). O
-- broadcast usa essa coluna pra nunca tentar mandar mensagem fora da janela
-- de mensageria da Meta.

alter table ig_contacts add column if not exists last_inbound_message_at timestamptz;
