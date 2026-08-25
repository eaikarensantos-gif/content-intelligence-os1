// Fase 4 — broadcast segmentado. POST only, e por padrão em modo dry-run
// (não manda nada) — só envia de verdade com { "dryRun": false } explícito
// no corpo, pra uma requisição acidental (link clicado, prefetch de
// navegador) nunca disparar mensagem sem querer.
//
// Body:
//   tag, field/value, activeOnly — mesmos filtros de segmentação do
//     api/contacts.js (Fase 3)
//   message — texto pra mandar direto, OU flowId — inicia um fluxo completo
//     pra cada contato elegível
//   dryRun  — default true
//
// Respeita a janela de 24h de mensageria da Meta: só manda pra contatos com
// last_inbound_message_at dentro das últimas 24h (mensagem/story_reply de
// verdade — resposta a comentário não conta, confirmado nesta sessão com um
// evento real). Contatos fora da janela aparecem em "blocked", não recebem
// nada — não existe tag de mensagem aprovada pra broadcast automatizado sem
// revisão específica da Meta (ver seção 4 do escopo original).
//
// Sem UI ainda, mesmo padrão das fases anteriores — chame via POST (curl,
// Postman, etc.), não dá pra disparar só abrindo uma URL no navegador.

import { getSupabaseServer, sendInstagramMessage, runFlowStep } from '../src/lib/dmServer.js'
import { monthStartISO, isWithinMessagingWindow } from '../src/lib/dmContacts.js'

const MAX_RECIPIENTS_PER_CALL = 50

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let db
  try {
    db = getSupabaseServer()
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  const { data: connection, error: connErr } = await db.from('ig_connection').select('*').eq('id', 'default').maybeSingle()
  if (connErr) return res.status(500).json({ error: connErr.message })
  if (!connection?.access_token) return res.status(400).json({ error: 'Sem ig_connection salva — conecte o Instagram em Configurações primeiro.' })

  const { tag, field, value, activeOnly, message, flowId, dryRun = true } = req.body || {}
  if (!message && !flowId) return res.status(400).json({ error: 'Informe "message" ou "flowId".' })

  let query = db.from('ig_contacts').select('*')
  if (tag) query = query.contains('tags', [tag])
  if (field && value !== undefined) query = query.eq(`fields->>${field}`, value)
  if (activeOnly) query = query.gte('last_interaction_at', monthStartISO())

  const { data: contacts, error: contactsErr } = await query
  if (contactsErr) return res.status(500).json({ error: contactsErr.message })

  const now = new Date()
  const eligible = []
  const blocked = []
  for (const contact of contacts || []) {
    if (isWithinMessagingWindow(contact.last_inbound_message_at, now)) eligible.push(contact)
    else blocked.push({ id: contact.id, ig_username: contact.ig_username, reason: 'fora da janela de 24h de mensageria' })
  }

  const truncated = eligible.length > MAX_RECIPIENTS_PER_CALL
  const toSend = eligible.slice(0, MAX_RECIPIENTS_PER_CALL)

  if (dryRun) {
    return res.status(200).json({
      dryRun: true,
      wouldSendTo: toSend.length,
      blocked: blocked.length,
      truncated,
      eligible: toSend.map((c) => ({ id: c.id, ig_username: c.ig_username })),
      blockedDetail: blocked,
    })
  }

  let flow = null
  if (flowId) {
    const { data, error } = await db.from('ig_flows').select('*').eq('id', flowId).maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: `Fluxo ${flowId} não encontrado.` })
    flow = data
  }

  const results = []
  for (const contact of toSend) {
    try {
      const recipient = { id: contact.ig_scoped_id }
      if (flow) {
        const { data: flowRun, error: createErr } = await db
          .from('ig_flow_runs')
          .insert({
            contact_id: contact.id,
            flow_id: flow.id,
            current_node_id: flow.definition?.start_node,
            status: 'running',
            context: {},
            started_via: 'broadcast',
          })
          .select()
          .maybeSingle()
        if (createErr) throw new Error(createErr.message)
        await runFlowStep(db, connection, flow, flowRun, contact, null, recipient)
      } else {
        const sendResult = await sendInstagramMessage(connection.access_token, recipient, message)
        await db.from('ig_dm_log').insert({ contact_id: contact.id, message_text: message, send_result: sendResult, status: 'sent' })
      }
      results.push({ contact_id: contact.id, ig_username: contact.ig_username, status: 'sent' })
    } catch (err) {
      results.push({ contact_id: contact.id, ig_username: contact.ig_username, status: 'failed', error: err.message })
    }
  }

  return res.status(200).json({
    dryRun: false,
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    blocked: blocked.length,
    truncated,
    results,
  })
}
