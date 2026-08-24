// Processador da fila de continuação de fluxo — Fase 2.
//
// Chamado por um workflow agendado do GitHub Actions a cada poucos minutos
// (a Vercel Hobby só permite Cron Jobs 1x/dia, insuficiente pra nós de
// delay). Pega itens de ig_flow_queue com available_at já vencido, executa
// o próximo passo do fluxo, e re-enfileira com backoff em caso de erro até
// esgotar as tentativas (dead_letter).
//
// Variável de ambiente necessária: PROCESS_QUEUE_SECRET — string arbitrária
// compartilhada com o secret do GitHub Actions (cabeçalho
// x-process-queue-secret), pra esse endpoint não ficar aberto pra qualquer
// um disparar o processamento da fila.

import { getSupabaseServer, runFlowStep } from '../src/lib/dmServer.js'

const BATCH_SIZE = 20
const BACKOFF_BASE_SECONDS = 30

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.PROCESS_QUEUE_SECRET || req.headers['x-process-queue-secret'] !== process.env.PROCESS_QUEUE_SECRET) {
    return res.status(401).end()
  }

  let db
  try {
    db = getSupabaseServer()
  } catch (err) {
    console.error('[processQueue] config error:', err.message)
    return res.status(500).end()
  }

  const { data: connection, error: connErr } = await db.from('ig_connection').select('*').eq('id', 'default').maybeSingle()
  if (connErr) {
    console.error('[processQueue] erro ao consultar ig_connection:', connErr.message)
    return res.status(500).end()
  }
  if (!connection?.access_token) {
    console.error('[processQueue] sem ig_connection salva.')
    return res.status(200).json({ processed: 0 })
  }

  const { data: dueItems, error: dueErr } = await db
    .from('ig_flow_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('available_at', new Date().toISOString())
    .order('available_at', { ascending: true })
    .limit(BATCH_SIZE)
  if (dueErr) {
    console.error('[processQueue] erro ao buscar fila:', dueErr.message)
    return res.status(500).end()
  }

  let processed = 0
  for (const item of dueItems || []) {
    const { error: claimErr } = await db
      .from('ig_flow_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('status', 'pending')
    if (claimErr) continue

    try {
      const { data: flowRun, error: runErr } = await db.from('ig_flow_runs').select('*').eq('id', item.flow_run_id).maybeSingle()
      if (runErr) throw new Error(runErr.message)
      if (!flowRun) throw new Error('flow_run não encontrado.')

      const { data: flow, error: flowErr } = await db.from('ig_flows').select('*').eq('id', flowRun.flow_id).maybeSingle()
      if (flowErr) throw new Error(flowErr.message)
      if (!flow) throw new Error('flow não encontrado.')

      const { data: contact, error: contactErr } = await db.from('ig_contacts').select('*').eq('id', flowRun.contact_id).maybeSingle()
      if (contactErr) throw new Error(contactErr.message)
      if (!contact) throw new Error('contato não encontrado.')

      await runFlowStep(db, connection, flow, flowRun, contact, null, { id: contact.ig_scoped_id })

      await db.from('ig_flow_queue').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', item.id)
      processed++
    } catch (err) {
      const attempts = item.attempts + 1
      const isDead = attempts >= item.max_attempts
      await db
        .from('ig_flow_queue')
        .update({
          status: isDead ? 'dead_letter' : 'pending',
          attempts,
          last_error: err.message,
          available_at: isDead ? item.available_at : new Date(Date.now() + BACKOFF_BASE_SECONDS * 2 ** attempts * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
      console.error('[processQueue] erro ao processar item', item.id, ':', err.message)
    }
  }

  return res.status(200).json({ processed, found: (dueItems || []).length })
}
