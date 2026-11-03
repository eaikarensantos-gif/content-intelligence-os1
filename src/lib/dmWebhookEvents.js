// Normaliza o payload bruto do webhook do Instagram numa lista plana de
// eventos, usada pelo matcher de gatilho (dmTriggerMatcher.js).
//
// Formato conferido em payloads reais gravados em ig_events (nov/2026):
//   - comentário: entry[].changes[].value = { id, from, text, media: { id }, parent_id? }
//     (o ID da publicação vem em value.media.id, NÃO em value.media_id)
//   - menção: value = { comment_id, media_id }
//   - mensagens e respostas de story: entry[].messaging[] (padrão Messenger).
export function parseWebhookPayload(body) {
  const events = []
  const entries = body?.entry || []

  // Índice global (não reinicia por entry) — usado só como desempate quando
  // Meta não manda um id de comentário/mensagem, pra duas entries com o
  // mesmo id+time num payload em lote não colidirem na chave de dedup.
  let i = 0

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {}
      const type = change.field === 'mentions' ? 'mention' : change.field === 'comments' ? 'comment' : change.field

      events.push({
        type,
        eventKey: `${entry.id}:${change.field}:${value.id || value.comment_id || `${entry.time}-${i++}`}`,
        time: entry.time,
        raw: change,
        commentId: value.id || value.comment_id || null,
        mediaId: value.media?.id || value.media_id || null,
        text: value.text || null,
        senderId: value.from?.id || null,
        fromUsername: value.from?.username || null,
      })
    }

    for (const msg of entry.messaging || []) {
      events.push({
        type: msg.message?.reply_to?.story ? 'story_reply' : 'message',
        eventKey: `${entry.id}:msg:${msg.message?.mid || `${entry.id}-${msg.timestamp}-${i++}`}`,
        time: msg.timestamp,
        raw: msg,
        commentId: null,
        mediaId: null,
        text: msg.message?.text || null,
        senderId: msg.sender?.id || null,
        fromUsername: null,
        isEcho: !!msg.message?.is_echo,
      })
    }
  }

  return events
}
