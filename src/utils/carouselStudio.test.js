import { describe, it, expect } from 'vitest'
import { CAROUSEL_STRUCTURES, buildProfessionalCarouselPrompt, validateCarouselResult, reviewCarousel, formatCarouselSlide } from './carouselStudio'
import { carouselTextPaths } from '../lib/clicheSweep'

const fixture = (structure = 'diagnostico') => ({
  versao_principal: {
    slides: CAROUSEL_STRUCTURES[structure].roles.map((funcao, i) => ({ numero: i + 1, funcao, titulo: `Título ${i + 1}`, texto: `Conteúdo ${i + 1}`, visual: 'Comparação em duas colunas' })),
    pergunta_final: '',
  },
  legenda: 'Complemento útil', pendencias: [],
})

describe('professional carousel contract', () => {
  it.each(Object.keys(CAROUSEL_STRUCTURES))('builds and accepts the %s structure with independent tone and goal', structure => {
    const prompt = buildProfessionalCarouselPrompt({ tema: 'Remuneração', structure, tone: 'Próximo', goal: 'Apoiar uma decisão', audience: 'Designers', texto: 'Fonte fornecida pelo autor' })
    expect(prompt).toContain(`FORMATO: ${CAROUSEL_STRUCTURES[structure].label}`)
    expect(prompt).toContain('TOM: Próximo')
    expect(prompt).toContain('OBJETIVO: Apoiar uma decisão')
    expect(prompt).toContain('PÚBLICO: Designers')
    expect(prompt).toContain('Fonte fornecida pelo autor')
    expect(prompt).toContain('8. Conclusão')
    expect(() => validateCarouselResult(fixture(structure), structure)).not.toThrow()
  })
  it('rejects the old five-aphorism response for a new professional request', () => {
    const result = fixture(); result.versao_principal.slides.length = 5
    expect(() => validateCarouselResult(result, 'diagnostico')).toThrow('8 slides')
  })
  it('rejects missing content, wrong numbering and the wrong narrative structure', () => {
    const result = fixture()
    result.versao_principal.slides[2].texto = ' '
    expect(() => validateCarouselResult(result, 'diagnostico')).toThrow('slide 3')
    const wrongNumber = fixture(); wrongNumber.versao_principal.slides[1].numero = 1
    expect(() => validateCarouselResult(wrongNumber, 'diagnostico')).toThrow('slide 2')
    expect(() => validateCarouselResult(fixture('tutorial'), 'tese')).toThrow('slide 1')
  })
  it('rejects malformed provider data without exposing a render exception', () => {
    for (const result of [null, {}, { versao_principal: { slides: null } }]) expect(() => validateCarouselResult(result, 'diagnostico')).toThrow('8 slides')
    const result = fixture(); result.pendencias = [null]
    expect(() => validateCarouselResult(result, 'diagnostico')).toThrow('revisão incompleta')
  })
  it('flags shallow content, repeated slides, excessive length and unresolved evidence', () => {
    const result = fixture()
    result.versao_principal.slides[1].texto = 'Compare salário fixo, benefícios utilizados e responsabilidades assumidas.'
    result.versao_principal.slides[2].texto = result.versao_principal.slides[1].texto
    result.versao_principal.slides[4].texto = 'palavra '.repeat(66)
    result.pendencias = ['Confirmar a fonte do resultado.']
    const issues = reviewCarousel(result).join('\n')
    expect(issues).toContain('Slide 2: desenvolvimento curto')
    expect(issues).toContain('Slides 2 e 3: possível repetição')
    expect(issues).toContain('Slide 5: texto longo')
    expect(issues).toContain('Conferir antes de publicar: Confirmar a fonte')
  })
  it('preserves legacy slides and includes titles/visual instructions when exporting new ones', () => {
    expect(formatCarouselSlide({ numero: 1, texto: 'Texto antigo' })).toContain('Texto antigo')
    const slide = fixture().versao_principal.slides[0]
    expect(formatCarouselSlide(slide)).toContain(slide.titulo)
    expect(formatCarouselSlide(slide)).not.toContain('Visual:')
    expect(formatCarouselSlide(slide, true)).toContain(`Visual: ${slide.visual}`)
  })
  it('checks new titles for clichés without losing legacy slide paths', () => {
    expect(carouselTextPaths(fixture()).some(p => p.path.at(-1) === 'titulo')).toBe(true)
    const paths = carouselTextPaths({ versao_principal: { slides: [{ numero: 1, texto: 'Legado' }] } })
    expect(paths).toHaveLength(1)
    expect(paths[0].path).toEqual(['versao_principal', 'slides', 0, 'texto'])
  })
})
