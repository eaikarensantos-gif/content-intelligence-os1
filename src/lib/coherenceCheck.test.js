import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkCoherence } from './coherenceCheck'

function mockFetchOnce(responseText) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ text: responseText }] }),
  })
}

describe('checkCoherence', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('rejeita sem API key', async () => {
    await expect(checkCoherence('', 'texto', null)).rejects.toThrow(/chave de API/)
  })

  it('rejeita rascunho vazio', async () => {
    await expect(checkCoherence('key', '  ', null)).rejects.toThrow(/vazio/)
  })

  it('faz parse do veredito, justificativa, frases banidas e ajustes', async () => {
    mockFetchOnce(JSON.stringify({
      veredito: 'dilui',
      justificativa: 'Genérico, não menciona critério de decisão.',
      frases_lista_negra_encontradas: ['em resumo'],
      ajustes: ['Trocar a abertura por uma cena específica', 'Cortar o fechamento genérico'],
    }))
    const result = await checkCoherence('key', 'Em resumo, isso é importante.', { teste_coerencia: 'Reforça?' })
    expect(result.veredito).toBe('dilui')
    expect(result.justificativa).toMatch(/critério de decisão/)
    expect(result.frases_lista_negra_encontradas).toEqual(['em resumo'])
    expect(result.ajustes).toHaveLength(2)
  })

  it('limita ajustes a no máximo 3, mesmo se a IA mandar mais', async () => {
    mockFetchOnce(JSON.stringify({ veredito: 'aumenta', ajustes: ['a', 'b', 'c', 'd', 'e'] }))
    const result = await checkCoherence('key', 'texto', null)
    expect(result.ajustes).toHaveLength(3)
  })

  it('normaliza veredito desconhecido pra "neutro"', async () => {
    mockFetchOnce(JSON.stringify({ veredito: 'talvez' }))
    const result = await checkCoherence('key', 'texto', null)
    expect(result.veredito).toBe('neutro')
  })

  it('lança erro quando a resposta não tem JSON', async () => {
    mockFetchOnce('isso não é json')
    await expect(checkCoherence('key', 'texto', null)).rejects.toThrow(/inválida/)
  })

  it('lança erro quando a API responde com falha', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Chave inválida' } }),
    })
    await expect(checkCoherence('key', 'texto', null)).rejects.toThrow(/Chave inválida/)
  })

  it('funciona sem posicionamento configurado', async () => {
    mockFetchOnce(JSON.stringify({ veredito: 'neutro' }))
    const result = await checkCoherence('key', 'texto qualquer', null)
    expect(result.veredito).toBe('neutro')
  })
})
