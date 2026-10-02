import { expect, it } from 'vitest'
import { buildVoiceContext, buildRegenerateInstruction } from './voiceContext'
import { KAREN_VOICE_RULES } from '../data/karenVoice'

it('mantém a base vigente após calibrações antigas', () => {
  const prompt = buildVoiceContext({ prompt: 'perfil antigo', calibration: { padrao_cta: 'pergunta antiga' } })
  expect(prompt.endsWith(KAREN_VOICE_RULES)).toBe(true)
  expect(prompt).toContain('ESTRATÉGIA → GATES → PERSONAGEM → VOZ → MARCADOR → FORMATO')
  expect(prompt).toContain('não é obrigação de vocabulário')
})
it('variações não pedem confissões ou dados inventados', () => {
  for (let i = 0; i < 5; i++) expect(buildRegenerateInstruction(i)).not.toMatch(/Reinvente totalmente|confissão pessoal\. Quebre|dados surpreendentes/)
})
