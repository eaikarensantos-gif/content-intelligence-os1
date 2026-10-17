import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Banco falso no lugar do Supabase do servidor.
let tabela = {}
vi.mock('./dmServer.js', () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: async () => ({ data: Object.entries(tabela).map(([nome, valor]) => ({ nome, valor, atualizado_em: '2026-10-17' })), error: null }),
      upsert: async (r) => { tabela[r.nome] = r.valor; return { error: null } },
      delete: () => ({ eq: async (_c, nome) => { delete tabela[nome]; return { error: null } } }),
    }),
  }),
}))

const mem = {}
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v) }, removeItem: (k) => { delete mem[k] } }

let servidor, cliente, useAIStore
beforeAll(async () => {
  servidor = await import('./cofreServidor.js')
  cliente = await import('./cofre.js')
  useAIStore = (await import('../store/useAIStore')).default
})
beforeEach(() => {
  tabela = {}
  for (const k of Object.keys(mem)) delete mem[k]
  delete process.env.OPENAI_API_KEY
})

describe('cofre no servidor', () => {
  it('lista só o final da chave, nunca o valor', async () => {
    await servidor.salvarNoCofre('openai', 'sk-abcdefghijklmn1234')
    const lista = await servidor.listarCofre()
    expect(lista.openai.final).toBe('…1234')
    expect(JSON.stringify(lista)).not.toContain('sk-abcdef')
  })

  it('recusa nome desconhecido e valor curto', async () => {
    await expect(servidor.salvarNoCofre('qualquer', 'sk-abcdefghijk')).rejects.toThrow()
    await expect(servidor.salvarNoCofre('openai', 'curta')).rejects.toThrow()
  })

  it('troca a marca "cofre" pela chave real, no header e no corpo', async () => {
    tabela = { openai: 'sk-real-openai-0000', youtube: 'AIza-real-youtube', groq: 'gsk-real-groq-key' }
    const req = { headers: { 'x-api-key': 'cofre' }, body: { youtubeApiKey: 'cofre', provider: 'groq', apiKey: 'cofre', openaiApiKey: '' } }
    await servidor.completarComCofre(req)
    expect(req.headers['x-api-key']).toBe('sk-real-openai-0000')
    expect(req.body).toMatchObject({ youtubeApiKey: 'AIza-real-youtube', apiKey: 'gsk-real-groq-key', openaiApiKey: 'sk-real-openai-0000' })
  })

  it('não mexe na chave real que o aparelho mandou', async () => {
    tabela = { openai: 'sk-do-cofre-000000' }
    const req = { headers: { 'x-api-key': 'sk-do-aparelho-111' }, body: {} }
    await servidor.completarComCofre(req)
    expect(req.headers['x-api-key']).toBe('sk-do-aparelho-111')
  })

  it('sem chave no cofre, a marca some para cair na mensagem de chave faltando', async () => {
    const req = { headers: { 'x-api-key': 'cofre' }, body: { youtubeApiKey: 'cofre' } }
    await servidor.completarComCofre(req)
    expect(req.headers['x-api-key']).toBeUndefined()
    expect(req.body.youtubeApiKey).toBe('')
  })
})

describe('cofre no aparelho', () => {
  it('marca as chaves do cofre onde o aparelho não tem chave própria', () => {
    mem['cio-openai-key'] = 'sk-do-aparelho-111'
    useAIStore.setState({ provider: 'groq', apiKey: '', youtubeApiKey: '' })
    cliente.aplicarCofre({ openai: { final: '…0000' }, groq: { final: '…key' }, youtube: { final: '…ube' } })
    expect(mem['cio-openai-key']).toBe('sk-do-aparelho-111')
    expect(useAIStore.getState().apiKey).toBe('cofre')
    expect(useAIStore.getState().youtubeApiKey).toBe('cofre')
  })

  it('limpa a marca quando a chave sai do cofre', () => {
    mem['cio-openai-key'] = 'cofre'
    useAIStore.setState({ youtubeApiKey: 'cofre' })
    cliente.aplicarCofre({})
    expect(mem['cio-openai-key']).toBeUndefined()
    expect(useAIStore.getState().youtubeApiKey).toBe('')
  })

  it('chaveDoAparelho ignora a marca', () => {
    mem['cio-openai-key'] = 'cofre'
    useAIStore.setState({ provider: 'groq', apiKey: '' })
    expect(cliente.chaveDoAparelho('openai')).toBe('')
    mem['cio-openai-key'] = 'sk-real-123456789'
    expect(cliente.chaveDoAparelho('openai')).toBe('sk-real-123456789')
  })
})
