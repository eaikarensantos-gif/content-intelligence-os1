import { describe, it, expect } from 'vitest'
import { prepareJob, validateJob, fitWarnings } from './job'
describe('native carousel handoff', () => {
  const result = { title: 'Teste', slides: [{ headline: 'Capa', subtext: 'Abertura' }, { headline: 'Título', subtext: 'Texto com acentos: decisão.' }, { headline: 'Fim', subtext: 'Revisar' }] }
  it('maps editorial roles without losing copy or editing decorations', () => {
    const job = validateJob(prepareJob(result))
    expect(job.slides.map(s => s.templateId)).toEqual(['capa', 'roteiros', 'encerramento'])
    expect(job.slides[1].fields).toEqual({ body: 'Título\n\nTexto com acentos: decisão.' })
    expect(Object.keys(job.slides[0].fields)).toEqual(['title', 'body', 'label'])
  })
  it('rejects foreign files, stale versions and arbitrary properties', () => {
    for (const replacement of [{ fileKey: 'foreign' }, { catalogVersion: 9 }, { schemaVersion: 9 }, { slides: [] }]) {
      expect(() => validateJob({ ...prepareJob(result), ...replacement })).toThrow()
    }
    const job = prepareJob(result); job.slides[0].fields['Sinal#290:75'] = 'alterar'
    expect(() => validateJob(job)).toThrow('não autorizado')
  })
  it('flags long copy without silently truncating it', () => {
    const job = prepareJob(result); job.slides[1].fields.body = 'conteúdo '.repeat(100)
    expect(fitWarnings(job).length).toBeGreaterThan(0)
    expect(validateJob(job).slides[1].fields.body).toBe('conteúdo '.repeat(100))
  })
})
