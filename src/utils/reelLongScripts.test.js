import { describe, expect, it } from 'vitest'
import { SOCIAL_DURATIONS, SOCIAL_STRUCTURES, defaultSocialOptions, getSocialStructure, socialSchema, validateSocialBrief, validateSocialResult, formatSocialDuration, socialGenerationTokenLimit, reviewSocialResult, socialIdea } from './socialStudio'
import { applyReelSpeech, generateSpeechFirstReel, reelSpeechText, validateReelSpeech } from './reelSpeech'

describe('long Reel scripts', () => {
  for (const persona of ['trabalho', 'pessoal']) {
    for (const structure of Object.keys(SOCIAL_STRUCTURES[persona].reels)) {
      it.each(SOCIAL_DURATIONS)(`${persona}/${structure}: supports %s seconds with valid scenes`, duration => {
        const options = { ...defaultSocialOptions('reels', persona), structure, duration, topic: 'Um tema', material: 'Material real' }
        validateSocialBrief(options)
        const result = socialSchema(options)
        expect(result.blocos).toHaveLength(Math.max(5, Math.ceil(duration / 30)))
        expect(result.blocos.every(block => block.segundos <= 60)).toBe(true)
        expect(() => validateSocialResult(result, options)).not.toThrow()
        expect(getSocialStructure(options).roles.at(-1)).toBe(SOCIAL_STRUCTURES[persona].reels[structure].roles.at(-1))
      })
    }
  }
  it('preserves a 5-minute speech through generation, scene mapping and saving', async () => {
    const options = { ...defaultSocialOptions('reels'), duration: 300, topic: 'Exemplo' }
    const plan = socialSchema(options)
    const speech = { titulo: 'Um exemplo longo', falas: plan.blocos.map((_, i) => `Parte ${i + 1}. ${'Detalhe do exemplo hipotético. '.repeat(14)}`), pendencias: [] }
    validateReelSpeech(speech, options)
    const prompts = []
    const result = await generateSpeechFirstReel(async prompt => { prompts.push(prompt); return prompts.length === 1 ? speech : plan }, options)
    validateSocialResult(result, options)
    expect(reelSpeechText(result)).toBe(speech.falas.join('\n\n'))
    expect(socialIdea(result, options).editorial.duration).toBe(300)
    expect(prompts[0]).toContain('510 a 630 palavras')
    expect(prompts[1]).toContain('ROTEIRO LONGO')
    expect(applyReelSpeech(plan, speech, options).blocos).toHaveLength(10)
  })
  it('labels minutes, increases generation capacity and flags underdeveloped speech', () => {
    expect(formatSocialDuration(45)).toBe('45 segundos')
    expect(formatSocialDuration(90)).toBe('1 min 30s')
    expect(formatSocialDuration(240)).toBe('4 min')
    expect(formatSocialDuration(600)).toBe('10 min')
    expect(socialGenerationTokenLimit({ format: 'reels', duration: 600 })).toBe(18000)
    expect(socialGenerationTokenLimit({ format: 'linkedin', duration: 600 })).toBe(6500)
    const options = { ...defaultSocialOptions('reels'), duration: 600 }
    expect(reviewSocialResult(socialSchema(options), options).join(' ')).toContain('fala ficou curta')
    expect(() => validateSocialBrief({ ...options, topic: 'Tema', duration: 601 })).toThrow('duração válida')
  })
})
