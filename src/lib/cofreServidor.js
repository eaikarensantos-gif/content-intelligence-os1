// Cofre de chaves de API no servidor (tabela chaves_api, só service role).
// O valor nunca sai daqui: listar() devolve só os 4 últimos caracteres.
import { getSupabaseServer } from './dmServer.js'

export const NOMES_COFRE = ['openai', 'groq', 'gemini', 'openrouter', 'youtube', 'vimeo', 'rapidapi', 'apify']

// Valor que os aparelhos guardam no lugar da chave: "use a do cofre".
export const MARCA_COFRE = 'cofre'

const final = (v) => `…${v.slice(-4)}`

export async function listarCofre() {
  const { data, error } = await getSupabaseServer().from('chaves_api').select('nome, valor, atualizado_em')
  if (error) throw new Error(error.message)
  return Object.fromEntries((data ?? []).map((r) => [r.nome, { final: final(r.valor), atualizadoEm: r.atualizado_em }]))
}

export async function salvarNoCofre(nome, valor) {
  const v = String(valor ?? '').trim()
  if (!NOMES_COFRE.includes(nome)) throw new Error('Nome de chave desconhecido.')
  if (v.length < 10 || v.length > 400 || v === MARCA_COFRE) throw new Error('Essa chave não parece válida.')
  const { error } = await getSupabaseServer().from('chaves_api').upsert({ nome, valor: v, atualizado_em: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function apagarDoCofre(nome) {
  if (!NOMES_COFRE.includes(nome)) throw new Error('Nome de chave desconhecido.')
  const { error } = await getSupabaseServer().from('chaves_api').delete().eq('nome', nome)
  if (error) throw new Error(error.message)
}

async function lerCofre() {
  const { data, error } = await getSupabaseServer().from('chaves_api').select('nome, valor')
  if (error) throw new Error(error.message)
  return Object.fromEntries((data ?? []).map((r) => [r.nome, r.valor]))
}

const falta = (v) => !v || (typeof v === 'string' && (!v.trim() || v.trim() === MARCA_COFRE))

/**
 * Completa as chaves que o aparelho não mandou (ou mandou como "cofre") com as do cofre.
 * Ordem: variável de ambiente da Vercel > chave real do aparelho > cofre. Só consulta o
 * banco quando falta alguma; se o cofre não estiver configurado, segue como antes.
 */
export async function completarComCofre(req) {
  const body = req.body ?? (req.body = {})
  const precisa = []
  // Header sem chave: completa se a Vercel não tem OPENAI_API_KEY; com a marca "cofre", troca
  // sempre, porque transcribe-url lê o header mesmo com a variável de ambiente presente.
  const header = req.headers['x-api-key']
  if (falta(header) && (header || !process.env.OPENAI_API_KEY)) precisa.push(['header', 'x-api-key', 'openai'])
  for (const [campo, nome] of [['openaiApiKey', 'openai'], ['youtubeApiKey', 'youtube'], ['vimeoToken', 'vimeo'], ['rapidApiKey', 'rapidapi'], ['apifyToken', 'apify']]) {
    if (campo in body && falta(body[campo])) precisa.push(['body', campo, nome])
  }
  if ('provider' in body && NOMES_COFRE.includes(body.provider) && falta(body.apiKey)) precisa.push(['body', 'apiKey', body.provider])
  if (!precisa.length) return

  let cofre = {}
  try {
    cofre = await lerCofre()
  } catch { /* sem Supabase no servidor: cada tela mostra o erro de chave de sempre */ }
  // Sem chave no cofre, a marca "cofre" vira vazio para cair na mensagem de chave faltando.
  for (const [onde, campo, nome] of precisa) {
    const valor = cofre[nome] ?? ''
    if (onde === 'header') {
      if (valor) req.headers[campo] = valor
      else delete req.headers[campo]
    } else body[campo] = valor
  }
}
