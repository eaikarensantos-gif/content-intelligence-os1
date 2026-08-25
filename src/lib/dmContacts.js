// Helpers puros pra Fase 3 (contatos): cálculo de "ativo no mês" e
// serialização CSV. A consulta em si (I/O) fica em api/contacts.js.

// "Ativo no mês" = teve alguma interação desde o início do mês corrente
// (UTC). É a definição usada pra comparar custo real com o de plataforma
// paga (critério da seção 8 do escopo) — mês calendário, não janela móvel
// de 30 dias.
export function monthStartISO(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

const CSV_COLUMNS = ['ig_scoped_id', 'ig_username', 'tags', 'fields', 'last_interaction_at', 'created_at']

export function contactsToCsv(contacts) {
  const header = CSV_COLUMNS.join(',')
  const rows = (contacts || []).map((contact) =>
    CSV_COLUMNS.map((col) => {
      if (col === 'tags') return escapeCsvField((contact.tags || []).join(';'))
      if (col === 'fields') return escapeCsvField(JSON.stringify(contact.fields || {}))
      return escapeCsvField(contact[col])
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

// Fase 4 (broadcast) — a Meta só entrega mensagem de fora da janela normal
// de 24h com tags especiais (uso restrito, não cobre broadcast automatizado)
// ou mensagem paga com revisão própria. Confirmado nesta sessão com um
// evento real: resposta a comentário NÃO conta como abrir a janela — só uma
// mensagem/story_reply de verdade do contato conta, por isso o broadcast
// usa last_inbound_message_at (não last_interaction_at) pra essa checagem.
const MESSAGING_WINDOW_HOURS = 24

export function isWithinMessagingWindow(lastInboundMessageAt, now = new Date()) {
  if (!lastInboundMessageAt) return false
  const elapsedMs = now.getTime() - new Date(lastInboundMessageAt).getTime()
  return elapsedMs >= 0 && elapsedMs < MESSAGING_WINDOW_HOURS * 60 * 60 * 1000
}
