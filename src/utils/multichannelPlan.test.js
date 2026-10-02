import { describe, expect, it } from 'vitest'
import { DEFAULT_CHANNELS, validatePlan, buildPlanPrompt, reviewPlan, planSocialOptions, planContext, planMaterial, cardSignature, validateCompactScript, compactScriptText } from './multichannelPlan'
const brief = { topic: 'Métricas', audience: 'Criadores', goal: 'Apoiar decisões', material: 'Fato fornecido: analisei o relatório.', channels: DEFAULT_CHANNELS }
const card = (canal = 'instagram_reels') => ({ canal, publico: 'Criadores', objetivo: 'Demonstrar', pergunta: 'Como interpretar um número?', recorte: 'Uma leitura de relatório', entrega: 'Uma demonstração concreta', justificativa: 'O vídeo permite mostrar a tela.', evidencias: ['Relatório'], pendencias: ['Confirmar o período'], ressalva: '', material: '', selected: true })
const result = (canal, persona) => ({ titulo: 'Roteiro', blocos: Array.from({ length: canal === 'instagram_carousel' ? persona === 'pessoal' ? 7 : 8 : canal === 'x_post' ? 1 : 4 }, (_, i) => ({ numero: i + 1, titulo: 'Título', texto: 'Texto concreto.', visual: 'Comparação visual' })), legenda: '', pendencias: [] })

describe('multichannel plan', () => {
  it('requires exactly the selected channels, with no duplicates or invented destinations', () => {
    const plan = { propostas: DEFAULT_CHANNELS.map(c => card(c)) }
    expect(() => validatePlan(plan, DEFAULT_CHANNELS)).not.toThrow()
    plan.propostas[1] = card()
    expect(() => validatePlan(plan, DEFAULT_CHANNELS)).toThrow('repetiu')
    expect(() => validatePlan({ propostas: [card('youtube')] }, ['youtube'])).toThrow('incompleto')
    expect(() => validatePlan({ propostas: [] }, DEFAULT_CHANNELS)).toThrow('cada canal')
  })
  it('rejects missing editorial fields and malformed evidence', () => {
    expect(() => validatePlan({ propostas: [{ ...card(), entrega: '' }] }, ['instagram_reels'])).toThrow('incompleto')
    expect(() => validatePlan({ propostas: [{ ...card(), pendencias: 'nenhuma' }] }, ['instagram_reels'])).toThrow('incompleto')
  })
  it('distinguishes shared topic from repeated questions or deliverables', () => {
    expect(reviewPlan([card(), card('linkedin_post')])).toHaveLength(1)
    const distinct = { ...card('linkedin_post'), pergunta: 'Quais critérios orientaram a decisão de orçamento?', recorte: 'Limites de uma escolha comercial', entrega: 'Argumento sobre as alternativas descartadas' }
    expect(reviewPlan([card(), distinct])).toEqual([])
    expect(reviewPlan([card(), { ...distinct, entrega: 'Uma demonstração concreta!' }])).toHaveLength(1)
  })
  it('protects personal identity and asks for a plan rather than finished copies', () => {
    const prompt = buildPlanPrompt(brief, 'pessoal')
    expect(prompt).toContain('STUDIO PESSOAL')
    expect(prompt).toContain('sem escrever os roteiros ainda')
    expect(prompt).toContain('Trocar o título, resumir ou mudar o tom não diferencia')
    expect(prompt).toContain(brief.material)
  })
  it('passes strategy as intent, without converting AI suggestions into supplied evidence', () => {
    const proposal = { ...card('linkedin_document'), material: 'Fonte complementar real.' }
    const options = planSocialOptions(brief, proposal, 'pessoal')
    expect(options.presentation).toBe('documento')
    expect(options.persona).toBe('pessoal')
    expect(options.topic).toBe(proposal.recorte)
    expect(options.material).toBe(planMaterial(brief, proposal))
    expect(options.material).not.toContain(proposal.entrega)
    expect(planContext(brief, proposal)).toContain('não fatos confirmados')
  })
  it('invalidates a script on editorial edits but not on selection changes', () => {
    const original = cardSignature(brief, card(), 'trabalho')
    expect(cardSignature(brief, { ...card(), selected: false }, 'trabalho')).toBe(original)
    for (const change of [{ recorte: 'Outro ângulo' }, { material: 'Novos fatos' }, { pendencias: [] }]) expect(cardSignature(brief, { ...card(), ...change }, 'trabalho')).not.toBe(original)
  })
  it.each(['trabalho', 'pessoal'])('validates carousel and X generation in %s', persona => {
    for (const canal of ['instagram_carousel', 'x_post', 'x_thread']) expect(() => validateCompactScript(result(canal, persona), card(canal), persona)).not.toThrow()
    const incomplete = result('instagram_carousel', persona); incomplete.blocos.pop()
    expect(() => validateCompactScript(incomplete, card('instagram_carousel'), persona)).toThrow('incompleto')
    const long = result('x_post', persona); long.blocos[0].texto = 'a'.repeat(281)
    expect(() => validateCompactScript(long, card('x_post'), persona)).toThrow('280')
  })
  it('keeps visual instructions out of copy but in the production script', () => {
    const carousel = result('instagram_carousel', 'trabalho')
    expect(compactScriptText(carousel)).toContain('Visual:')
    expect(compactScriptText(carousel, false)).not.toContain('Visual:')
  })
})
