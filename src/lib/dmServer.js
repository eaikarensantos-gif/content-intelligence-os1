// Helpers de servidor (fazem I/O) compartilhados entre api/instagramWebhook.js,
// api/processQueue.js e api/previewFlow.js — extraído da Fase 1 quando um
// segundo endpoint (Fase 2) passou a precisar do mesmo código.

import { createClient } from '@supabase/supabase-js'
import { computeStep } from './dmFlowEngine.js'

export function getSupabaseServer() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados na Vercel.')
  return createClient(url, key)
}

// Confirmado contra um evento real em produção (24/08/2026): comentário →
// recipient com comment_id → DM entregue.
export async function sendInstagramMessage(accessToken, recipient, text) {
  const res = await fetch('https://graph.instagram.com/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      recipient: JSON.stringify(recipient),
      message: JSON.stringify({ text }),
      access_token: accessToken,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Falha ao enviar mensagem no Instagram (${res.status}).`)
  return data
}

// Resposta pública no comentário (visível pra todo mundo, diferente da DM
// privada). Mesmo endpoint já usado em api/ai.js (instagramReplyToComment)
// pra resposta manual — reaproveitado aqui pra resposta automática.
export async function replyToComment(accessToken, commentId, message) {
  const res = await fetch(`https://graph.instagram.com/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: accessToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Falha ao publicar resposta no comentário (${res.status}).`)
  return data
}

// isInboundMessage marca last_inbound_message_at — só passe true pra eventos
// message/story_reply de verdade (não comment/mention, que não abrem a
// janela de 24h — ver dmContacts.js e a migração 0003/0004). O broadcast
// (Fase 4) usa essa coluna, separada de last_interaction_at, pra nunca
// tentar mandar mensagem fora da janela.
export async function upsertContact(db, igScopedId, username, tagToApply, isInboundMessage = false) {
  const { data: existing, error: selErr } = await db.from('ig_contacts').select('*').eq('ig_scoped_id', igScopedId).maybeSingle()
  if (selErr) throw new Error(selErr.message)

  const tags = new Set(existing?.tags || [])
  if (tagToApply) tags.add(tagToApply)

  const patch = {
    ig_scoped_id: igScopedId,
    ig_username: username || existing?.ig_username || null,
    tags: Array.from(tags),
    last_interaction_at: new Date().toISOString(),
  }
  if (isInboundMessage) patch.last_inbound_message_at = new Date().toISOString()

  const { data: contact, error } = await db.from('ig_contacts').upsert(patch, { onConflict: 'ig_scoped_id' }).select().maybeSingle()

  if (error) throw new Error(error.message)
  return { contact, isFirstContact: !existing }
}

export async function markInboundMessage(db, contactId) {
  const { error } = await db.from('ig_contacts').update({ last_inbound_message_at: new Date().toISOString() }).eq('id', contactId)
  if (error) throw new Error(error.message)
}

// Aplica a lista de actions que computeStep() (dmFlowEngine.js) devolveu:
// envia mensagem de verdade, aplica tag, grava campo custom, chama webhook
// externo. Não é pura — por isso fica aqui, fora do motor de fluxo.
async function applyFlowActions(db, accessToken, recipient, contact, actions) {
  let currentContact = contact
  for (const action of actions) {
    if (action.type === 'send_message') {
      const text = action.options?.length ? `${action.text}\n\n${action.options.map((o) => `• ${o.label}`).join('\n')}` : action.text
      await sendInstagramMessage(accessToken, recipient, text)
    } else if (action.type === 'apply_tag') {
      const tags = new Set(currentContact?.tags || [])
      tags.add(action.tag)
      const { data, error } = await db.from('ig_contacts').update({ tags: Array.from(tags) }).eq('id', currentContact.id).select().maybeSingle()
      if (error) throw new Error(error.message)
      currentContact = data
    } else if (action.type === 'set_field') {
      const fields = { ...(currentContact?.fields || {}), [action.key]: action.value }
      const { data, error } = await db.from('ig_contacts').update({ fields }).eq('id', currentContact.id).select().maybeSingle()
      if (error) throw new Error(error.message)
      currentContact = data
    } else if (action.type === 'call_webhook' && action.url) {
      await fetch(action.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload || {}),
      })
    }
  }
  return { contact: currentContact }
}

// Resposta privada a um comentário (recipient.comment_id) não abre a janela
// normal de 24h de mensageria — confirmado com um evento real (24/08/2026):
// uma DM comum enviada minutos depois pro mesmo contato voltou com "message
// is sent outside of allowed window". Então um fluxo iniciado por comentário
// ou menção só pode ter certeza de entregar a primeira mensagem; um nó de
// delay tentando continuar depois vai falhar. Perguntas (quick_reply/
// collect_input) continuam válidas, porque a resposta do próprio contato é
// uma mensagem de verdade que abre a janela.
const STARTED_VIA_WITHOUT_MESSAGING_WINDOW = new Set(['comment', 'mention'])

// Executa um passo do fluxo (computeStep) e persiste o resultado: aplica as
// ações, atualiza ig_flow_runs, e — se o passo terminou num nó de delay —
// enfileira a continuação em ig_flow_queue pro processador (api/processQueue.js)
// pegar mais tarde.
export async function runFlowStep(db, connection, flow, flowRun, contact, input, recipient) {
  const step = computeStep(flow, flowRun, input)
  const { contact: updatedContact } = await applyFlowActions(db, connection.access_token, recipient, contact, step.actions)

  const blockedByMessagingWindow =
    step.status === 'running' && step.delaySeconds != null && STARTED_VIA_WITHOUT_MESSAGING_WINDOW.has(flowRun.started_via)

  const patch = blockedByMessagingWindow
    ? {
        status: 'failed',
        error_message:
          'Fluxo iniciado por comentário/menção não pode continuar depois de um delay: a resposta privada não abre a janela de 24h de mensageria da Meta.',
        context: step.context,
        updated_at: new Date().toISOString(),
      }
    : { current_node_id: step.currentNodeId, status: step.status, context: step.context, updated_at: new Date().toISOString() }

  const { error: updErr } = await db.from('ig_flow_runs').update(patch).eq('id', flowRun.id)
  if (updErr) throw new Error(updErr.message)

  if (step.status === 'running' && step.delaySeconds != null && !blockedByMessagingWindow) {
    const { error: qErr } = await db.from('ig_flow_queue').insert({
      flow_run_id: flowRun.id,
      node_id: step.currentNodeId,
      available_at: new Date(Date.now() + step.delaySeconds * 1000).toISOString(),
    })
    if (qErr) throw new Error(qErr.message)
  }

  return { step, contact: updatedContact, blockedByMessagingWindow }
}
