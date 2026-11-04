import { describe, expect, it, vi } from 'vitest'
import { applyReelSpeech, buildReelSpeechPrompt, generateSpeechFirstReel, reelSpeechText, validateReelSpeech } from './reelSpeech'
import { defaultSocialOptions, socialSchema, socialIdea, validateSocialResult } from './socialStudio'

const options = { ...defaultSocialOptions('reels'), topic: 'Antes de chamar a saída de surpresa, quais alertas você ouviu?', material: '## Estado\nProposta não aprovada.\n## Evidência G\npeople are leaving his old team. Relato indireto; causas não verificadas.\n## Ângulo\nA ligação entre alerta ignorado e perda de confiança é interpretação editorial.' }
const speech = { titulo: 'O que foi dito antes da saída?', falas: [
  'Quando uma liderança diz que foi pega de surpresa com a saída de alguém, eu tenho uma pergunta: o que essa pessoa vinha dizendo antes de sair?',
  'Eu voltaria às conversas anteriores. Teve algum pedido de ajuda? Algum problema que apareceu mais de uma vez? O que foi feito depois dessas conversas?',
  'Pensa numa situação hipotética: alguém fala várias vezes que está com trabalho demais. A liderança escuta, mas a distribuição das tarefas continua igual. Quando essa pessoa sai, vale lembrar dessas conversas.',
  'Ela pode ter saído por outro motivo. Ainda assim, dá pra conferir se o problema que ela trouxe recebeu alguma resposta e se alguma coisa mudou.',
  'Se você lidera uma equipe, anota um problema que apareceu nas últimas conversas e confere o que aconteceu depois. Se ficou sem resposta, começa por retomar esse assunto.',
], pendencias: ['Causas da saída não verificadas.'] }

describe('speech-first Reels', () => {
  it('runs speech before production and gives the production pass the whole fixed conversation', async () => {
    const request = vi.fn().mockResolvedValueOnce(speech).mockResolvedValueOnce(socialSchema(options))
    const stage = vi.fn()
    const result = await generateSpeechFirstReel(request, options, stage)
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1][0]).toContain(JSON.stringify(speech))
    expect(stage.mock.calls.flat()).toEqual(['Escrevendo a fala...', 'Organizando as cenas...'])
    expect(reelSpeechText(result)).toBe(speech.falas.join('\n\n'))
  })
  it('does not spend a second generation on an invalid speech and propagates production failure', async () => {
    const invalid = vi.fn().mockResolvedValue({ falas: [] })
    await expect(generateSpeechFirstReel(invalid, options)).rejects.toThrow('incompleta')
    expect(invalid).toHaveBeenCalledTimes(1)
    const failed = vi.fn().mockResolvedValueOnce(speech).mockRejectedValueOnce(new Error('Falha no plano'))
    await expect(generateSpeechFirstReel(failed, options)).rejects.toThrow('Falha no plano')
  })
  it('keeps the user-approved conversation unchanged even if the production response rewrites speech', () => {
    validateReelSpeech(speech, options)
    const plan = socialSchema(options)
    plan.blocos.forEach(block => { block.fala = 'A leitura editorial registra causas sem verificação.' })
    const result = applyReelSpeech(plan, speech, options)
    validateSocialResult(result, options)
    expect(reelSpeechText(result)).toBe(speech.falas.join('\n\n'))
    expect(reelSpeechText(result)).not.toContain('leitura editorial')
    expect(result.pendencias).toEqual(speech.pendencias)
    expect(socialIdea(result, options).social_script.blocos.map(block => block.fala)).toEqual(speech.falas)
    expect(plan.blocos[0].fala).toContain('leitura editorial')
  })
  it('rejects missing paragraphs, invalid pending notes, excessive speech and mismatched scene counts', () => {
    expect(() => validateReelSpeech({ ...speech, falas: ['Só a abertura'] }, options)).toThrow('incompleta')
    expect(() => validateReelSpeech({ ...speech, pendencias: [null] }, options)).toThrow('incompleta')
    expect(() => validateReelSpeech({ ...speech, falas: Array(5).fill('palavra '.repeat(60)) }, options)).toThrow('duração')
    expect(() => applyReelSpeech({ blocos: [] }, speech, options)).toThrow('não corresponde')
  })
  it('provides research as input without asking for production fields in the first response schema', () => {
    const prompt = buildReelSpeechPrompt(options)
    expect(prompt).toContain(options.material)
    const schema = JSON.parse(prompt.split('Retorne somente JSON: ')[1])
    expect(schema.falas).toHaveLength(5)
    expect(schema.blocos).toBeUndefined()
    expect(defaultSocialOptions('reels').duration).toBe(60)
    expect(defaultSocialOptions('reels', 'pessoal').duration).toBe(45)
  })
})
