import { describe, it, expect } from 'vitest'
import { detectCliches, detectBannedWords, phraseToRegex } from './clicheDetector'

describe('detectCliches — estruturas e frases proibidas', () => {
  it('pega o contraste corretivo "não é X, é Y"', () => {
    const { blocks } = detectCliches('Isto não é insegurança com o trabalho. É saber, por experiência, que o número pesa diferente.')
    expect(blocks.some((b) => b.id === 'contraste-corretivo')).toBe(true)
  })

  it('pega os abridores-molde que o prompt do Reels chegou a sugerir', () => {
    const casos = [
      'Tem uma coisa que acontece quando você é a única mulher negra numa concorrência.',
      'Já reparou que isso sempre acontece do mesmo jeito?',
      'Muita gente passa por isso e não fala.',
    ]
    casos.forEach((t) => {
      const { blocks } = detectCliches(t)
      expect(blocks.some((b) => b.id === 'frase-proibida'), t).toBe(true)
    })
  })

  it('não acusa texto limpo', () => {
    const { blocks } = detectCliches('Cobrei R$ 4.000 por um escopo que levou 12 horas.')
    expect(blocks).toEqual([])
  })
})

describe('phraseToRegex — contração oral', () => {
  it('casa a forma escrita e a forma oral', () => {
    const re = phraseToRegex('para pensar')
    expect('já parou para pensar'.match(re)).toBeTruthy()
    expect('já parou pra pensar'.match(re)).toBeTruthy()
  })

  it('escapa caractere especial de regex numa frase banida', () => {
    const re = phraseToRegex('isso? sério (mesmo)')
    expect('isso? sério (mesmo)'.match(re)).toBeTruthy()
  })
})

describe('detectBannedWords — lista pessoal da Karen', () => {
  it('pega uma frase banida manualmente', () => {
    const blocks = detectBannedWords('Em resumo, o preço subiu.', ['em resumo'])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].id).toBe('palavra-banida-manual')
    expect(blocks[0].match.toLowerCase()).toBe('em resumo')
  })

  it('respeita a contração oral igual às frases estáticas', () => {
    const blocks = detectBannedWords('já parou pra pensar nisso', ['já parou para pensar'])
    expect(blocks).toHaveLength(1)
  })

  it('não acusa nada sem lista', () => {
    expect(detectBannedWords('qualquer texto', [])).toEqual([])
    expect(detectBannedWords('qualquer texto')).toEqual([])
  })

  it('ignora entrada vazia ou inválida', () => {
    expect(detectBannedWords('', ['banido'])).toEqual([])
    expect(detectBannedWords(null, ['banido'])).toEqual([])
    expect(detectBannedWords('frase com banido no meio', [null, '', 'banido'])).toHaveLength(1)
  })

  it('acusa mais de uma frase banida no mesmo texto', () => {
    const blocks = detectBannedWords('Em resumo, no fim das contas, deu certo.', ['em resumo', 'no fim das contas'])
    expect(blocks).toHaveLength(2)
  })
})
