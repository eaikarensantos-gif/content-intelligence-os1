import { useState } from 'react'
import { BookOpen, Play, FileText, Sparkles, Search, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import useAIStore from '../../store/useAIStore'

const LS_KEY = 'cio-anthropic-key'

const COLOR = {
  violet: { header: 'bg-violet-50 border-violet-200', icon: 'text-violet-600 bg-violet-100', badge: 'bg-violet-100 text-violet-700' },
  red:    { header: 'bg-red-50 border-red-200',       icon: 'text-red-600 bg-red-100',       badge: 'bg-red-100 text-red-700'       },
  blue:   { header: 'bg-blue-50 border-blue-200',     icon: 'text-blue-600 bg-blue-100',     badge: 'bg-blue-100 text-blue-700'     },
  amber:  { header: 'bg-amber-50 border-amber-200',   icon: 'text-amber-600 bg-amber-100',   badge: 'bg-amber-100 text-amber-700'   },
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da API')
  return JSON.parse(match[0])
}

// Verifica existência via Google Books (pega capa), link vai pra Amazon Brasil
async function enrichBooks(items) {
  return Promise.all(items.map(async (item) => {
    const amazonUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(item.titulo + ' ' + (item.autor || ''))}&i=stripbooks`
    try {
      const q = encodeURIComponent(`${item.titulo} ${item.autor || ''}`)
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
      const data = await res.json()
      const vol = data.items?.[0]
      if (!vol) throw new Error('not found')
      return {
        ...item,
        url: amazonUrl,
        capa: vol.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        autorReal: vol.volumeInfo?.authors?.join(', ') || item.autor,
        tituloReal: vol.volumeInfo?.title || item.titulo,
        verified: true,
      }
    } catch {
      return { ...item, url: amazonUrl, verified: false }
    }
  }))
}

// Busca real no YouTube
async function enrichVideos(items, youtubeApiKey) {
  if (!youtubeApiKey) {
    return items.map(item => ({
      ...item,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.titulo + ' ' + (item.canal || ''))}`,
      verified: false,
    }))
  }
  return Promise.all(items.map(async (item) => {
    try {
      const q = encodeURIComponent(`${item.titulo} ${item.canal || ''}`)
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&maxResults=1&type=video&key=${youtubeApiKey}`)
      const data = await res.json()
      const vid = data.items?.[0]
      if (!vid) throw new Error('not found')
      return {
        ...item,
        url: `https://www.youtube.com/watch?v=${vid.id.videoId}`,
        thumb: vid.snippet?.thumbnails?.default?.url || null,
        tituloReal: vid.snippet?.title || item.titulo,
        canalReal: vid.snippet?.channelTitle || item.canal,
        verified: true,
      }
    } catch {
      return {
        ...item,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.titulo + ' ' + (item.canal || ''))}`,
        verified: false,
      }
    }
  }))
}

export default function CommunityResources() {
  const apiKey = localStorage.getItem(LS_KEY) || ''
  const youtubeApiKey = useAIStore((s) => s.youtubeApiKey)

  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [lastTopic, setLastTopic] = useState('')

  async function buscar() {
    const t = topic.trim()
    if (!t || loading) return
    if (!apiKey) { setError('Configure sua API key da Anthropic em Configurações'); return }
    setLoading(true)
    setError(null)
    setResults(null)

    const prompt = `Você é um especialista em curadoria de conteúdo educacional em português.
O usuário quer aprender mais sobre: "${t}"

RETORNE APENAS conteúdo 100% real e verificável que realmente existe — sem inventar títulos, autores ou canais.

Retorne EXATAMENTE um JSON válido:
{
  "livros": [
    { "titulo": "título exato do livro", "autor": "nome completo do autor", "descricao": "1 frase" }
  ],
  "videos": [
    { "titulo": "título próximo ao vídeo ou playlist real", "canal": "nome exato do canal no YouTube", "descricao": "1 frase" }
  ],
  "artigos": [
    { "titulo": "título do artigo ou reportagem", "fonte": "nome do veículo (ex: Harvard Business Review, Exame, MIT Sloan)", "descricao": "1 frase" }
  ],
  "outros": [
    { "titulo": "nome do recurso", "tipo": "podcast | newsletter | ferramenta | curso online | comunidade", "descricao": "1 frase" }
  ]
}

Regras obrigatórias:
- 3 a 4 itens por categoria
- Só inclua o que você tem certeza que existe
- Priorize português, inclua inglês só se for referência clássica imprescindível
- Autores e canais com nome completo e correto`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1800,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const parsed = parseJSON(raw)

      const [livros, videos] = await Promise.all([
        enrichBooks(parsed.livros || []),
        enrichVideos(parsed.videos || [], youtubeApiKey),
      ])

      setResults({
        ...parsed,
        livros,
        videos,
        artigos: (parsed.artigos || []).map(a => ({
          ...a,
          url: `https://www.google.com/search?q=${encodeURIComponent(a.titulo + ' ' + (a.fonte || ''))}`,
          verified: false,
        })),
        outros: (parsed.outros || []).map(o => ({
          ...o,
          url: `https://www.google.com/search?q=${encodeURIComponent(o.titulo)}`,
          verified: false,
        })),
      })
      setLastTopic(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const CATEGORIES = [
    { key: 'livros',  label: 'Livros',         icon: BookOpen, color: 'violet', linkLabel: 'Amazon Brasil' },
    { key: 'videos',  label: 'Vídeos & Cursos', icon: Play,     color: 'red',    linkLabel: youtubeApiKey ? 'YouTube' : 'Buscar no YouTube' },
    { key: 'artigos', label: 'Artigos',          icon: FileText, color: 'blue',   linkLabel: 'Buscar no Google' },
    { key: 'outros',  label: 'Outros',           icon: Sparkles, color: 'amber',  linkLabel: 'Buscar no Google' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="Ex: Eficiência Operacional, Precificação, Gestão de Clientes..."
            className="input w-full pl-9 text-sm"
          />
        </div>
        <button
          onClick={buscar}
          disabled={!topic.trim() || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {!youtubeApiKey && (
        <p className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <strong>Dica:</strong> configure sua YouTube API key em Configurações para obter links diretos para vídeos reais.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0,1,2,3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-pulse">
              <div className="h-11 bg-gray-100" />
              <div className="p-3 space-y-3">
                {[1,2,3].map((j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-50 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {results && !loading && (
        <>
          <p className="text-xs text-gray-400">
            Indicações sobre <strong className="text-gray-600">"{lastTopic}"</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label, icon: Icon, color, linkLabel }) => {
              const items = results[key] ?? []
              const c = COLOR[color]
              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 border-b ${c.header}`}>
                    <span className={`p-1.5 rounded-lg ${c.icon}`}><Icon size={13} /></span>
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{items.length}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <li className="px-3 py-2.5 text-xs text-gray-400 italic">Nenhuma indicação encontrada.</li>
                    ) : items.map((item, i) => (
                      <li key={i}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                        >
                          {(item.capa || item.thumb) && (
                            <img
                              src={item.capa || item.thumb}
                              alt=""
                              className="w-8 h-10 object-cover rounded shrink-0 mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-orange-700 transition-colors">
                              {item.tituloReal || item.titulo}
                            </p>
                            {(item.autorReal || item.canalReal || item.autor || item.canal || item.fonte || item.tipo) && (
                              <p className="text-xs text-orange-600 font-medium mt-0.5">
                                {item.autorReal || item.canalReal || item.autor || item.canal || item.fonte || item.tipo}
                              </p>
                            )}
                            {item.descricao && (
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.descricao}</p>
                            )}
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-gray-400 group-hover:text-orange-500 transition-colors">
                              {item.verified
                                ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {linkLabel}</>
                                : <><ExternalLink size={9} /> {linkLabel}</>
                              }
                            </span>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!results && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <BookOpen size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Digite um tema e clique em <strong>Buscar</strong></p>
          <p className="text-xs mt-1 opacity-70">Livros com capa e link direto para Amazon Brasil</p>
        </div>
      )}
    </div>
  )
}
