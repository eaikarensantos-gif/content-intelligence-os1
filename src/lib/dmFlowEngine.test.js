import { describe, it, expect } from 'vitest'
import { computeStep } from './dmFlowEngine'

function flow(nodes, start = 'n1') {
  return { definition: { start_node: start, nodes } }
}

function run(currentNodeId = null, context = {}) {
  return { current_node_id: currentNodeId, context, status: 'running' }
}

describe('computeStep', () => {
  it('encadeia nós de message/action sem parar até achar um nó que espera', () => {
    const f = flow({
      n1: { type: 'message', text: 'Oi!', next: 'n2' },
      n2: { type: 'action', action: 'add_tag', params: { tag: 'lead' }, next: 'n3' },
      n3: { type: 'end' },
    })
    const result = computeStep(f, run(), null)
    expect(result.status).toBe('completed')
    expect(result.actions).toEqual([
      { type: 'send_message', text: 'Oi!' },
      { type: 'apply_tag', tag: 'lead' },
    ])
  })

  it('interpola {{campo}} do context na mensagem', () => {
    const f = flow({ n1: { type: 'message', text: 'Oi {{nome}}!', next: 'n2' }, n2: { type: 'end' } })
    const result = computeStep(f, run(null, { nome: 'Karen' }), null)
    expect(result.actions[0].text).toBe('Oi Karen!')
  })

  it('quick_reply sem input pausa esperando resposta', () => {
    const f = flow({
      n1: { type: 'quick_reply', text: 'Quer o material?', options: [{ label: 'Sim', value: 'yes', next: 'n2' }], next: null },
    })
    const result = computeStep(f, run(), null)
    expect(result.status).toBe('waiting_input')
    expect(result.currentNodeId).toBe('n1')
  })

  it('quick_reply com input que bate avança pro próximo nó da opção', () => {
    const f = flow({
      n1: {
        type: 'quick_reply',
        text: 'Quer o material?',
        save_as: 'resposta',
        options: [
          { label: 'Sim', value: 'yes', next: 'n2' },
          { label: 'Não', value: 'no', next: 'n3' },
        ],
      },
      n2: { type: 'end' },
      n3: { type: 'end' },
    })
    const result = computeStep(f, run('n1'), { text: 'sim' })
    expect(result.status).toBe('completed')
    expect(result.currentNodeId).toBe('n2')
    expect(result.context.resposta).toBe('yes')
  })

  it('quick_reply com input que não bate volta a perguntar', () => {
    const f = flow({
      n1: { type: 'quick_reply', text: 'Quer o material?', options: [{ label: 'Sim', value: 'yes', next: 'n2' }] },
      n2: { type: 'end' },
    })
    const result = computeStep(f, run('n1'), { text: 'talvez' })
    expect(result.status).toBe('waiting_input')
    expect(result.currentNodeId).toBe('n1')
  })

  it('collect_input guarda a resposta livre no context', () => {
    const f = flow({
      n1: { type: 'collect_input', text: 'Qual seu e-mail?', save_as: 'email', next: 'n2' },
      n2: { type: 'end' },
    })
    const waiting = computeStep(f, run(), null)
    expect(waiting.status).toBe('waiting_input')

    const resumed = computeStep(f, run('n1'), { text: 'karen@exemplo.com' })
    expect(resumed.status).toBe('completed')
    expect(resumed.context.email).toBe('karen@exemplo.com')
  })

  it('condition desvia pro ramo certo conforme o context', () => {
    const f = flow({
      n1: { type: 'condition', field: 'plano', operator: 'eq', value: 'pro', if_true: 'n2', if_false: 'n3' },
      n2: { type: 'message', text: 'Você é PRO', next: 'n4' },
      n3: { type: 'message', text: 'Você não é PRO', next: 'n4' },
      n4: { type: 'end' },
    })
    const proResult = computeStep(f, run(null, { plano: 'pro' }), null)
    expect(proResult.actions[0].text).toBe('Você é PRO')

    const freeResult = computeStep(f, run(null, { plano: 'free' }), null)
    expect(freeResult.actions[0].text).toBe('Você não é PRO')
  })

  it('delay pausa e devolve delaySeconds sem marcar waiting_input', () => {
    const f = flow({ n1: { type: 'delay', seconds: 3600, next: 'n2' }, n2: { type: 'end' } })
    const result = computeStep(f, run(), null)
    expect(result.status).toBe('running')
    expect(result.delaySeconds).toBe(3600)
    expect(result.currentNodeId).toBe('n2')
  })

  it('nó inexistente falha com mensagem clara', () => {
    const f = flow({ n1: { type: 'message', text: 'oi', next: 'nao-existe' } })
    const result = computeStep(f, run(), null)
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/não existe/)
  })

  it('tipo de nó desconhecido falha', () => {
    const f = flow({ n1: { type: 'algo-inventado' } })
    const result = computeStep(f, run(), null)
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/desconhecido/)
  })

  it('detecta loop infinito e para no limite de passos', () => {
    const f = flow({
      n1: { type: 'action', action: 'add_tag', params: { tag: 'x' }, next: 'n2' },
      n2: { type: 'action', action: 'add_tag', params: { tag: 'y' }, next: 'n1' },
    })
    const result = computeStep(f, run(), null)
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/Limite de passos/)
  })
})
