// Webhook do Instagram — Fase 1 (captura e resposta).
//
// GET  → verificação do webhook (hub.mode/hub.verify_token/hub.challenge).
// POST → recebe o evento, verifica assinatura, deduplica, casa contra as
//         regras ativas em ig_trigger_rules e responde via DM. Processa
//         de forma síncrona (volume baixo confirmado, ~500 contatos/mês);
//         a fila assíncrona com retry/DLQ é escopo da Fase 2. Cada evento é
//         gravado em ig_events ANTES do envio, então mesmo se o envio falhar
//         o evento não se perde.
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — mesmo projeto configurado em
//     Configurações > Supabase no frontend.
//   INSTAGRAM_WEBHOOK_VERIFY_TOKEN — string arbitrária escolhida por você,
//     cadastrada também na config do webhook no painel da Meta.

import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '../src/lib/dmSignature.js'
import { parseWebhookPayload } from '../src/lib/dmWebhookEvents.js'
import { findMatchingRule } from '../src/lib/dmTriggerMatcher.js'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function getSupabaseServer() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados na Vercel.')
  return createClient(url, key)
}

// Envio via API do Instagram (graph.instagram.com), mesmo host e mesmo
// estilo de request (form-urlencoded) já usado em api/ai.js.
//
// NÃO CONFIRMADO NA DOCUMENTAÇÃO OFICIAL: developers.facebook.com está
// bloqueado neste ambiente e não deu pra verificar o endpoint exato de envio
// de mensagem / resposta privada a comentário. O formato abaixo segue o
// padrão do Messenger Platform (recipient.comment_id / recipient.id), que a
// API do Instagram com Login do Instagram tende a espelhar — mas isso
// precisa ser validado com um evento real (critério de aceite, seção 8)
// antes de considerar a Fase 1 pronta. Marca também não confirmado: se o
// escopo instagram_business_manage_messages exige revisão de app da Meta
// pra funcionar fora de contas de teste (ver seção 9 do escopo).
async function sendInstagramMessage(accessToken, recipient, text) {
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

async function upsertContact(db, igScopedId, username, tagToApply) {
  const { data: existing } = await db.from('ig_contacts').select('*').eq('ig_scoped_id', igScopedId).maybeSingle()
  const tags = new Set(existing?.tags || [])
  if (tagToApply) tags.add(tagToApply)

  const { data: contact, error } = await db
    .from('ig_contacts')
    .upsert(
      {
        ig_scoped_id: igScopedId,
        ig_username: username || existing?.ig_username || null,
        tags: Array.from(tags),
        last_interaction_at: new Date().toISOString(),
      },
      { onConflict: 'ig_scoped_id' }
    )
    .select()
    .maybeSingle()

  if (error) throw new Error(error.message)
  return { contact, isFirstContact: !existing }
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

    let rule = findMatchingRule(rules || [], event)

    if (rule?.match_mode === 'first_message' && event.senderId) {
      const { data: existingContact } = await db.from('ig_contacts').select('id').eq('ig_scoped_id', event.senderId).maybeSingle()
      if (existingContact) rule = null // já é contato conhecido, não é a primeira mensagem
    }

    if (!rule) {
      await db.from('ig_events').update({ status: 'skipped', processed_at: new Date().toISOString() }).eq('id', inserted.id)
      continue
    }

    try {
      const igScopedId = event.senderId
      const { contact } = igScopedId ? await upsertContact(db, igScopedId, event.fromUsername, rule.tag_to_apply) : { contact: null }

      const recipient = event.type === 'comment' || event.type === 'mention' ? { comment_id: event.commentId } : { id: igScopedId }
      const sendResult = await sendInstagramMessage(connection.access_token, recipient, rule.response_text)

      await db.from('ig_dm_log').insert({
        contact_id: contact?.id || null,
        event_id: inserted.id,
        rule_id: rule.id,
        message_text: rule.response_text,
        send_result: sendResult,
        status: 'sent',
      })
      await db
        .from('ig_events')
        .update({ status: 'sent', matched_rule_id: rule.id, processed_at: new Date().toISOString() })
        .eq('id', inserted.id)
    } catch (err) {
      await db.from('ig_dm_log').insert({
        event_id: inserted.id,
        rule_id: rule.id,
        message_text: rule.response_text,
        status: 'failed',
        send_result: { error: err.message },
      })
      await db
        .from('ig_events')
        .update({ status: 'error', error_message: err.message, matched_rule_id: rule.id, processed_at: new Date().toISOString() })
        .eq('id', inserted.id)
      console.error('[instagramWebhook] erro ao processar evento:', err.message)
    }
  }

  return res.status(200).end()
}
