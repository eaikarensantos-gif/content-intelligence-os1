// Webhook do Instagram — Fase 1 + Fase 2.
//
// GET  → verificação do webhook (hub.mode/hub.verify_token/hub.challenge).
// POST → recebe o evento, verifica assinatura, deduplica, e:
//   - se a regra que bateu tem response_text simples (Fase 1) → envia direto.
//   - se a regra tem flow_id (Fase 2) → inicia um ig_flow_run e executa o
//     primeiro passo na hora (resposta instantânea).
//   - se o remetente já tem um ig_flow_run esperando resposta (status
//     'waiting_input') → a mensagem alimenta o fluxo em vez de casar contra
//     as regras de gatilho.
// Continuações depois de um nó de delay são responsabilidade do
// api/processQueue.js (chamado por GitHub Actions a cada poucos minutos).
//
// Cada evento é gravado em ig_events ANTES de qualquer envio, então mesmo se
// o envio falhar o evento não se perde.
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — mesmo projeto configurado em
//     Configurações > Supabase no frontend.
//   INSTAGRAM_WEBHOOK_VERIFY_TOKEN — string arbitrária escolhida por você,
//     cadastrada também na config do webhook no painel da Meta.

import { verifyWebhookSignature } from '../src/lib/dmSignature.js'
import { parseWebhookPayload } from '../src/lib/dmWebhookEvents.js'
import { findMatchingRule } from '../src/lib/dmTriggerMatcher.js'
import { getSupabaseServer, sendInstagramMessage, upsertContact, runFlowStep } from '../src/lib/dmServer.js'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function recipientForNewEvent(event) {
  return event.type === 'comment' || event.type === 'mention' ? { comment_id: event.commentId } : { id: event.senderId }
}

async function startFlow(db, connection, flowId, contact, event) {
  const { data: flow, error: flowErr } = await db.from('ig_flows').select('*').eq('id', flowId).maybeSingle()
  if (flowErr) throw new Error(flowErr.message)
  if (!flow) throw new Error(`Fluxo ${flowId} não encontrado.`)

  const { data: flowRun, error: createErr } = await db
    .from('ig_flow_runs')
    .insert({
      contact_id: contact.id,
      flow_id: flow.id,
      current_node_id: flow.definition?.start_node,
      status: 'running',
      context: {},
      started_via: event.type,
    })
    .select()
    .maybeSingle()
  if (createErr) throw new Error(createErr.message)

  return runFlowStep(db, connection, flow, flowRun, contact, null, recipientForNewEvent(event))
}

async function resumeFlow(db, connection, flowRun, contact, event) {
  const { data: flow, error: flowErr } = await db.from('ig_flows').select('*').eq('id', flowRun.flow_id).maybeSingle()
  if (flowErr) throw new Error(flowErr.message)
  if (!flow) throw new Error(`Fluxo ${flowRun.flow_id} não encontrado.`)

  return runFlowStep(db, connection, flow, flowRun, contact, { text: event.text }, { id: event.senderId })
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }
    return res.status(403).send('Verificação falhou.')
  }

  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await readRawBody(req)
  const signature = req.headers['x-hub-signature-256']

  let db
  try {
    db = getSupabaseServer()
  } catch (err) {
    console.error('[instagramWebhook] config error:', err.message)
    return res.status(500).end()
  }

  const { data: connection, error: connectionError } = await db.from('ig_connection').select('*').eq('id', 'default').maybeSingle()
  if (connectionError) {
    console.error('[instagramWebhook] erro ao consultar ig_connection:', connectionError.message)
    return res.status(500).end()
  }
  if (!connection?.app_secret) {
    console.error('[instagramWebhook] sem ig_connection salva — conecte o Instagram em Configurações primeiro.')
    return res.status(200).end() // 200 pra Meta não ficar reentregando; o problema é de config, não do evento
  }

  if (!verifyWebhookSignature(rawBody, signature, connection.app_secret)) {
    console.error('[instagramWebhook] assinatura inválida.')
    return res.status(401).end()
  }

  let body
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).end()
  }

  const events = parseWebhookPayload(body)
  const { data: rules } = await db.from('ig_trigger_rules').select('*').eq('active', true)

  for (const event of events) {
    const { data: inserted, error: insertError } = await db
      .from('ig_events')
      .insert({ event_key: event.eventKey, event_type: event.type, raw_payload: event.raw, status: 'received' })
      .select()
      .maybeSingle()

    if (insertError) {
      if (insertError.code !== '23505') console.error('[instagramWebhook] erro ao gravar evento:', insertError.message)
      continue // 23505 = event_key duplicado → Meta reentregou, ignora
    }

    if (event.isEcho) {
      await db.from('ig_events').update({ status: 'skipped', processed_at: new Date().toISOString() }).eq('id', inserted.id)
      continue
    }

    try {
      const igScopedId = event.senderId
      let contact = null

      if (igScopedId) {
        const { data: existingContact, error: contactErr } = await db.from('ig_contacts').select('*').eq('ig_scoped_id', igScopedId).maybeSingle()
        if (contactErr) throw new Error(contactErr.message)
        contact = existingContact
      }

      let activeFlowRun = null
      if (contact && event.type === 'message') {
        const { data: waitingRun, error: runErr } = await db
          .from('ig_flow_runs')
          .select('*')
          .eq('contact_id', contact.id)
          .eq('status', 'waiting_input')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (runErr) throw new Error(runErr.message)
        activeFlowRun = waitingRun
      }

      if (activeFlowRun) {
        await resumeFlow(db, connection, activeFlowRun, contact, event)
        await db.from('ig_events').update({ status: 'sent', processed_at: new Date().toISOString() }).eq('id', inserted.id)
        continue
      }

      let rule = findMatchingRule(rules || [], event)

      if (rule?.match_mode === 'first_message' && contact) rule = null // já é contato conhecido, não é a primeira mensagem

      if (!rule) {
        await db.from('ig_events').update({ status: 'skipped', processed_at: new Date().toISOString() }).eq('id', inserted.id)
        continue
      }

      const { contact: upsertedContact } = igScopedId ? await upsertContact(db, igScopedId, event.fromUsername, rule.tag_to_apply) : { contact: null }

      if (rule.flow_id) {
        await startFlow(db, connection, rule.flow_id, upsertedContact, event)
      } else {
        const sendResult = await sendInstagramMessage(connection.access_token, recipientForNewEvent(event), rule.response_text)
        await db.from('ig_dm_log').insert({
          contact_id: upsertedContact?.id || null,
          event_id: inserted.id,
          rule_id: rule.id,
          message_text: rule.response_text,
          send_result: sendResult,
          status: 'sent',
        })
      }

      await db
        .from('ig_events')
        .update({ status: 'sent', matched_rule_id: rule.id, processed_at: new Date().toISOString() })
        .eq('id', inserted.id)
    } catch (err) {
      await db
        .from('ig_events')
        .update({ status: 'error', error_message: err.message, processed_at: new Date().toISOString() })
        .eq('id', inserted.id)
      console.error('[instagramWebhook] erro ao processar evento:', err.message)
    }
  }

  return res.status(200).end()
}
