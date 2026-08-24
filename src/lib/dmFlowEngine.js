// Executor de fluxo — Fase 2. Função pura, sem I/O: recebe a definição do
// fluxo, o estado atual (ig_flow_runs) e uma entrada opcional (resposta do
// contato), e devolve as ações a executar (envio de mensagem, aplicar tag,
// etc.) mais o novo estado. Quem faz o I/O de verdade (enviar a mensagem,
// gravar no banco) é src/lib/dmServer.js.

const MAX_STEPS = 25

function interpolate(text, context) {
  if (!text) return text
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], context)
    return value === undefined || value === null ? '' : String(value)
  })
}

function matchOption(options, inputText) {
  const text = (inputText || '').trim().toLowerCase()
  if (!text) return null
  return (
    options.find(
      (opt) => (opt.value && opt.value.toLowerCase() === text) || (opt.label && opt.label.toLowerCase() === text)
    ) || null
  )
}

function evaluateCondition(fieldValue, operator, value) {
  switch (operator) {
    case 'eq':
      return String(fieldValue) === String(value)
    case 'neq':
      return String(fieldValue) !== String(value)
    case 'contains':
      return String(fieldValue || '').includes(String(value))
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
    default:
      return false
  }
}

// flow: linha de ig_flows (tem .definition = { start_node, nodes }).
// flowRun: { current_node_id, context, status } — pode ser um flow_run novo
//   (current_node_id null → começa em flow.definition.start_node).
// input: { text } quando é retomada de um nó que estava esperando resposta;
//   null quando é primeira execução ou continuação após delay.
export function computeStep(flow, flowRun, input) {
  const nodes = flow.definition?.nodes || {}
  let context = { ...(flowRun.context || {}) }
  let nodeId = flowRun.current_node_id || flow.definition?.start_node
  const actions = []
  let stepInput = input

  for (let i = 0; i < MAX_STEPS; i++) {
    const node = nodes[nodeId]
    if (!node) {
      return { actions, status: 'failed', currentNodeId: nodeId, context, error: `Nó "${nodeId}" não existe no fluxo.` }
    }

    if (node.type === 'message') {
      actions.push({ type: 'send_message', text: interpolate(node.text, context) })
      nodeId = node.next
      stepInput = null
      continue
    }

    if (node.type === 'quick_reply') {
      const matched = stepInput ? matchOption(node.options || [], stepInput.text) : null
      if (!matched) {
        actions.push({ type: 'send_message', text: interpolate(node.text, context), options: node.options })
        return { actions, status: 'waiting_input', currentNodeId: nodeId, context }
      }
      if (node.save_as) context = { ...context, [node.save_as]: matched.value }
      nodeId = matched.next
      stepInput = null
      continue
    }

    if (node.type === 'collect_input') {
      if (!stepInput) {
        actions.push({ type: 'send_message', text: interpolate(node.text, context) })
        return { actions, status: 'waiting_input', currentNodeId: nodeId, context }
      }
      context = { ...context, [node.save_as || nodeId]: stepInput.text }
      nodeId = node.next
      stepInput = null
      continue
    }

    if (node.type === 'condition') {
      const fieldValue = (node.field || '').split('.').reduce((obj, key) => obj?.[key], context)
      nodeId = evaluateCondition(fieldValue, node.operator, node.value) ? node.if_true : node.if_false
      continue
    }

    if (node.type === 'delay') {
      return { actions, status: 'running', currentNodeId: node.next, context, delaySeconds: node.seconds || 0 }
    }

    if (node.type === 'action') {
      if (node.action === 'add_tag') actions.push({ type: 'apply_tag', tag: interpolate(node.params?.tag, context) })
      else if (node.action === 'set_field')
        actions.push({ type: 'set_field', key: node.params?.key, value: interpolate(node.params?.value, context) })
      else if (node.action === 'call_webhook')
        actions.push({ type: 'call_webhook', url: node.params?.url, payload: node.params?.payload })
      nodeId = node.next
      continue
    }

    if (node.type === 'end') {
      return { actions, status: 'completed', currentNodeId: nodeId, context }
    }

    return { actions, status: 'failed', currentNodeId: nodeId, context, error: `Tipo de nó desconhecido: "${node.type}".` }
  }

  return { actions, status: 'failed', currentNodeId: nodeId, context, error: 'Limite de passos do fluxo excedido (possível loop).' }
}
