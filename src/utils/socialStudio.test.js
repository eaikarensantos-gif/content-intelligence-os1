import { describe, it, expect } from 'vitest'
import {
  SOCIAL_STRUCTURES, defaultSocialOptions, validateSocialBrief, buildSocialPrompt, socialSchema,
  validateSocialResult, reviewSocialResult, socialTextPaths, formatSocialScript, socialIdea, socialPublishText,
} from './socialStudio'

function resultFor(options) {
  const result = socialSchema(options)
  result.titulo = 'Uma decisão com contexto'
  result.blocos = result.blocos.map((b, i) => options.format === 'linkedin'
    ? { ...b, texto: `Etapa ${i + 1}: compare os critérios da decisão com as restrições descritas no material e registre o que mudou antes de recomendar a mesma escolha a outra pessoa.` }
    : { ...b, fala: `Etapa ${i + 1}: observe este detalhe concreto.`, texto_tela: `Detalhe ${i + 1}`, acao: `Mostrar o detalhe ${i + 1}`, interacao: '' })
  result.legenda = 'Contexto adicional.'
  return result
}
const cases = Object.entries(SOCIAL_STRUCTURES).flatMap(([persona, formats]) => Object.entries(formats).flatMap(([format, structures]) => Object.keys(structures).map(structure => ({ persona, format, structure }))))

describe('native social contracts in both Studios', () => {
  it.each(cases)('$persona / $format / $structure keeps an executable contract and a distinct narrative', ({ persona, format, structure }) => {
    const options = { ...defaultSocialOptions(format, persona), structure, topic: 'Minha escolha', material: 'Fatos fornecidos pela autora.' }
    expect(() => validateSocialBrief(options)).not.toThrow()
    const result = resultFor(options)
    expect(() => validateSocialResult(result, options)).not.toThrow()
    const prompt = buildSocialPrompt(options)
    expect(prompt).toContain(SOCIAL_STRUCTURES[persona][format][structure].label)
    expect(prompt).toContain('Fatos fornecidos pela autora.')
    if (persona === 'pessoal') expect(prompt).toContain('LinkedIn não muda essa identidade')
  })
  it('asks for material for real cases, news and offers, but not ordinary observations', () => {
    for (const selection of cases) {
      const options = { ...defaultSocialOptions(selection.format, selection.persona), ...selection, topic: 'Um assunto' }
      if (SOCIAL_STRUCTURES[selection.persona][selection.format][selection.structure].needsFacts) expect(() => validateSocialBrief(options)).toThrow('fatos reais')
      else expect(() => validateSocialBrief(options)).not.toThrow()
    }
  })
  it('rejects a structure belonging to the other persona', () => {
    expect(() => validateSocialBrief({ ...defaultSocialOptions('reels', 'pessoal'), structure: 'caso', topic: 'Cena' })).toThrow('estrutura válida')
  })
  it('rejects missing blocks, wrong roles and missing production directions', () => {
    const options = defaultSocialOptions('reels')
    const missing = resultFor(options); missing.blocos.pop()
    expect(() => validateSocialResult(missing, options)).toThrow('5 blocos')
    const wrong = resultFor(options); wrong.blocos[1].funcao = 'Qualquer coisa'
    expect(() => validateSocialResult(wrong, options)).toThrow('Bloco 2')
    const incomplete = resultFor(options); incomplete.blocos[0].acao = ''
    expect(() => validateSocialResult(incomplete, options)).toThrow('incompleto')
  })
  it('rejects invalid time and an aggregate reel exceeding the selected duration', () => {
    const options = defaultSocialOptions('reels')
    for (const duration of [0, -1, '9', NaN, Infinity]) {
      const result = resultFor(options); result.blocos[0].segundos = duration
      expect(() => validateSocialResult(result, options)).toThrow('incompleto')
    }
    const result = resultFor(options); result.blocos[0].segundos += 1
    expect(() => validateSocialResult(result, options)).toThrow('ultrapassam')
  })
  it('accepts silent frames, optional interactions and empty CTA', () => {
    const options = defaultSocialOptions('stories', 'pessoal')
    const result = resultFor(options); result.blocos[0].fala = ''
    expect(() => validateSocialResult(result, options)).not.toThrow()
    result.blocos[0].texto_tela = ''
    expect(() => validateSocialResult(result, options)).toThrow('sem conteúdo')
  })
  it('enforces the text budget including the invitation and validates document visuals separately', () => {
    const options = defaultSocialOptions('linkedin')
    const result = resultFor(options); result.cta = 'x'.repeat(2800)
    expect(() => validateSocialResult(result, options)).toThrow('2.800')
    const document = { ...options, presentation: 'documento' }
    const pages = resultFor(document)
    expect(() => validateSocialResult(pages, document)).not.toThrow()
    pages.blocos[1].visual = ''
    expect(() => validateSocialResult(pages, document)).toThrow('Página 2')
  })
  it('rejects malformed metadata before rendering', () => {
    const options = defaultSocialOptions('stories')
    for (const value of [null, [], 'bad', {}]) expect(() => validateSocialResult(value, options)).toThrow()
    const result = resultFor(options); result.pendencias = [null]
    expect(() => validateSocialResult(result, options)).toThrow('campos inválidos')
  })
  it('flags repetitions, excessive screen text, slow speech and unresolved facts', () => {
    const options = defaultSocialOptions('reels')
    const result = resultFor(options)
    result.blocos[0].fala = 'palavra '.repeat(40)
    result.blocos[0].texto_tela = 'texto '.repeat(20)
    result.blocos[1].fala = result.blocos[0].fala
    result.pendencias = ['Conferir a fonte.']
    const review = reviewSocialResult(result, options).join('\n')
    expect(review).toContain('não caber')
    expect(review).toContain('reduza o texto')
    expect(review).toContain('texto repetido')
    expect(review).toContain('Conferir a fonte')
  })
  it('retains the full production plan, optional interaction and review in saved drafts', () => {
    const options = { ...defaultSocialOptions('stories', 'pessoal'), topic: 'Um achado', material: 'Fatos reais' }
    const result = resultFor(options)
    result.blocos[1].interacao = 'Enquete: azul ou verde?'
    result.pendencias = ['Confirmar um detalhe.']
    const idea = socialIdea(result, options)
    expect(idea.status).toBe('draft')
    expect(idea.format).toBe('story')
    expect(idea.script).toContain('Enquete: azul ou verde?')
    expect(idea.script).toContain('REVISÃO PENDENTE')
    expect(idea.editorial).toEqual(options)
    expect(idea.social_script).toEqual(result)
    expect(idea.source).toContain('Studio Pessoal')
    expect(formatSocialScript(result, options, false)).not.toContain('REVISÃO PENDENTE')
  })
  it('saves LinkedIn posts as posts, documents as carousels and keeps article distinct', () => {
    const options = defaultSocialOptions('linkedin')
    const result = resultFor(options)
    expect(socialIdea(result, options).format).toBe('post')
    expect(socialPublishText(result, options)).not.toContain('Legenda:')
    expect(socialPublishText(result, options)).not.toContain('Contexto adicional.')
    const document = { ...options, presentation: 'documento' }
    expect(socialIdea(resultFor(document), document).format).toBe('carrossel')
  })
  it('checks speech, screen text and interactions without rewriting time or scene directions', () => {
    const options = defaultSocialOptions('stories')
    const result = resultFor(options); result.blocos[0].interacao = 'Pergunta específica'
    const fields = socialTextPaths(result).map(p => p.path.at(-1))
    expect(fields).toContain('fala'); expect(fields).toContain('texto_tela'); expect(fields).toContain('interacao')
    expect(fields).not.toContain('segundos'); expect(fields).not.toContain('funcao')
  })
})
