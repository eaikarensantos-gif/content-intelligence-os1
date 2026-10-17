import { describe, expect, it } from 'vitest'
import { handleApiError, SEM_CHAVE } from './apiError'

const resposta = (status, body) => ({ status, json: async () => body, text: async () => JSON.stringify(body) })

describe('handleApiError', () => {
  it('servidor sem chave e aparelho sem chave: diz o que fazer em vez de "Erro na API: 400"', async () => {
    await expect(handleApiError(resposta(400, { error: 'OpenAI não está configurada no servidor.' }))).rejects.toThrow(SEM_CHAVE)
  })

  it('mostra a mensagem quando o /api/ai devolve o erro como texto', async () => {
    await expect(handleApiError(resposta(400, { error: 'Messages are required' }))).rejects.toThrow('Messages are required')
  })

  it('continua lendo o formato da OpenAI', async () => {
    await expect(handleApiError(resposta(400, { error: { message: 'Invalid API key provided' } }))).rejects.toThrow('Chave de API inválida')
  })
})
