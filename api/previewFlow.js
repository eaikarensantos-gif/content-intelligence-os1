// Preview de fluxo — Fase 2. Roda o fluxo contra um "contato de teste" sem
// enviar mensagem real e sem gravar ig_flow_runs/ig_flow_queue. Recebe um
// flowId e, opcionalmente, uma lista de respostas simuladas (replies) pra
// resolver os nós que esperam entrada (quick_reply/collect_input).
//
// POST /api/previewFlow  { "flowId": "...", "replies": ["sim", "meu@email.com"] }

import { getSupabaseServer } from '../src/lib/dmServer.js'
import { computeStep } from '../src/lib/dmFlowEngine.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { flowId, replies } = req.body || {}
  if (!flowId) return res.status(400).json({ error: 'flowId é obrigatório.' })

  let db
  try {
    db = getSupabaseServer()
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  const { data: flow, error } = await db.from('ig_flows').select('*').eq('id', flowId).maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!flow) return res.status(404).json({ error: 'Fluxo não encontrado.' })

  const pendingReplies = [...(replies || [])]
  let flowRun = { current_node_id: null, context: {}, status: 'running' }
  const transcript = []
  let input = null

  while (flowRun.status !== 'completed' && flowRun.status !== 'failed') {
    const step = computeStep(flow, flowRun, input)
    transcript.push(...step.actions)
    if (step.error) transcript.push({ type: 'error', message: step.error })

    flowRun = { current_node_id: step.currentNodeId, context: step.context, status: step.status }

    if (step.status !== 'waiting_input') break
    if (!pendingReplies.length) break
    input = { text: pendingReplies.shift() }
  }

  return res.status(200).json({ status: flowRun.status, currentNodeId: flowRun.current_node_id, context: flowRun.context, transcript })
}
