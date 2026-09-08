import { describe, it, expect, vi } from 'vitest'
import { generateCompleteScript, validateImprovedScript } from './improvedScript'

const complete = { sections: ['Gancho', 'Desenvolvimento', 'CTA'].map(name => ({ name, text: 'Uma fala pronta para gravar.' })) }
const broken = { sections: [{ name: 'Gancho', text: null, note: 'Não existe na transcrição.' }, { name: 'Desenvolvimento', text: 'Trecho original.' }, { name: 'CTA', text: '' }], caption: 'Legenda completa', what_changed: ['Gancho corrigido'] }

describe('improved script generation', () => {
  it('rejects the screenshot failure even with a caption and claimed improvements', () => {
    expect(() => validateImprovedScript(broken)).toThrow('incompleto')
    expect(() => validateImprovedScript({ sections: complete.sections.slice(0, 2) })).toThrow('incompleto')
  })
  it('retries incomplete output and returns the complete script', async () => {
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(broken)).mockResolvedValueOnce(JSON.stringify(complete))
    expect(await generateCompleteScript(generate, 'Escreva o roteiro')).toEqual(complete)
    expect(generate).toHaveBeenCalledTimes(2)
  })
  it('fails after one repair and does not retry network errors', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify(broken))
    await expect(generateCompleteScript(generate, 'Roteiro')).rejects.toThrow('incompleto')
    expect(generate).toHaveBeenCalledTimes(2)
    const offline = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(generateCompleteScript(offline, 'Roteiro')).rejects.toThrow('offline')
    expect(offline).toHaveBeenCalledTimes(1)
  })
  it('accepts complete output without a repair request', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify(complete))
    expect(await generateCompleteScript(generate, 'Roteiro')).toEqual(complete)
    expect(generate).toHaveBeenCalledTimes(1)
  })
})
