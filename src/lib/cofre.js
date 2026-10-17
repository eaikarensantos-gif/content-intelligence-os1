// Cofre de chaves no Content: a chave é salva uma vez no servidor e vale em qualquer aparelho.
// O navegador nunca recebe a chave de volta. No lugar dela guarda a marca "cofre", e o
// /api/ai troca a marca pela chave real (src/lib/cofreServidor.js).
import useAIStore from '../store/useAIStore'

export const MARCA = 'cofre'

// onde: 'ls' = localStorage da tela; 'loja' = campo do useAIStore; 'provedor' = useAIStore.apiKey
// quando o provedor escolhido for esse.
export const CHAVES = [
  { nome: 'openai', rotulo: 'OpenAI', ajuda: 'Studio de Arte, textos, carrosséis e quase todas as telas de IA.', onde: [['ls', 'cio-openai-key'], ['provedor', 'openai']] },
  { nome: 'groq', rotulo: 'Groq', ajuda: 'Quando o provedor de IA escolhido é o Groq.', onde: [['provedor', 'groq']] },
  { nome: 'gemini', rotulo: 'Google Gemini', ajuda: 'Quando o provedor de IA escolhido é o Gemini.', onde: [['provedor', 'gemini']] },
  { nome: 'openrouter', rotulo: 'OpenRouter', ajuda: 'Quando o provedor de IA escolhido é o OpenRouter.', onde: [['provedor', 'openrouter']] },
  { nome: 'youtube', rotulo: 'YouTube Data API', ajuda: 'Busca de vídeos de referência.', onde: [['loja', 'youtubeApiKey']] },
  { nome: 'vimeo', rotulo: 'Vimeo', ajuda: 'Busca de vídeos no Vimeo.', onde: [['loja', 'vimeoToken']] },
  { nome: 'rapidapi', rotulo: 'RapidAPI (TikTok)', ajuda: 'Busca de vídeos no TikTok.', onde: [['loja', 'rapidApiKey']] },
  { nome: 'apify', rotulo: 'Apify (Instagram)', ajuda: 'Busca de posts no Instagram.', onde: [['loja', 'apifyToken']] },
]

const lerLS = (k) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const gravarLS = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* sem armazenamento */ } }

async function chamar(action, extra = {}) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || `Erro ${res.status} no cofre`)
  return data.chaves ?? {}
}

export const listarCofre = () => chamar('chaves-listar')
export const salvarNoCofre = (nome, valor) => chamar('chaves-salvar', { nome, valor })
export const apagarDoCofre = (nome) => chamar('chaves-apagar', { nome })

/** Chave de verdade guardada neste aparelho (ignora a marca do cofre). */
export function chaveDoAparelho(nome) {
  const c = CHAVES.find((x) => x.nome === nome)
  const loja = useAIStore.getState()
  for (const [tipo, alvo] of c?.onde ?? []) {
    const v = tipo === 'ls' ? lerLS(alvo) : tipo === 'loja' ? loja[alvo] : loja.provider === alvo ? loja.apiKey : ''
    if (v && v !== MARCA) return v
  }
  return ''
}

/**
 * Deixa este aparelho apontando para o cofre: onde não há chave própria, grava a marca;
 * onde a marca sobrou de uma chave que saiu do cofre, limpa. Chave real do aparelho fica.
 */
export function aplicarCofre(noCofre) {
  const loja = useAIStore.getState()
  const mudancas = {}
  for (const c of CHAVES) {
    const tem = !!noCofre[c.nome]
    for (const [tipo, alvo] of c.onde) {
      if (tipo === 'ls') {
        const atual = lerLS(alvo)
        if (tem && !atual) gravarLS(alvo, MARCA)
        if (!tem && atual === MARCA) gravarLS(alvo, '')
      } else if (tipo === 'loja') {
        const atual = loja[alvo]
        if (tem && !atual) mudancas[alvo] = MARCA
        if (!tem && atual === MARCA) mudancas[alvo] = ''
      } else if (loja.provider === alvo) {
        if (tem && !loja.apiKey) mudancas.apiKey = MARCA
        if (!tem && loja.apiKey === MARCA) mudancas.apiKey = ''
      }
    }
  }
  if (Object.keys(mudancas).length) useAIStore.setState(mudancas)
}

/** Ao abrir o app: busca o que está no cofre e marca este aparelho. Falha em silêncio. */
export async function sincronizarCofre() {
  try {
    aplicarCofre(await listarCofre())
  } catch { /* sem servidor ou sem Supabase: cada tela segue com as chaves do aparelho */ }
}
