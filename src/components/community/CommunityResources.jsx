import { useState } from 'react'
import {
  BookOpen, Play, FileText, Sparkles, Search, Loader2,
  AlertCircle, ExternalLink, Mic, GraduationCap, Wrench, Users,
} from 'lucide-react'
import useAIStore from '../../store/useAIStore'

const LS_KEY = 'cio-anthropic-key'

const CATEGORIES = [
  {
    key: 'livros',
    label: 'Livros',
    icon: BookOpen,
    color: 'violet',
    linkFn: (item) => `https://www.amazon.com.br/s?k=${encodeURIComponent(item.titulo + ' ' + (item.autor || ''))}&i=stripbooks`,
    linkLabel: 'Amazon',
  },
  {
    key: 'videos',
    label: 'Vídeos',
    icon: Play,
    color: 'red',
    linkFn: (item) => `https://www.youtube.com/results?search_query=${encodeURIComponent(item.titulo + ' ' + (item.canal || ''))}`,
    linkLabel: 'YouTube',
  },
  {
    key: 'podcasts',
    label: 'Podcasts',
    icon: Mic,
    color: 'pink',
    linkFn: (item) => `https://open.spotify.com/search/${encodeURIComponent(item.titulo + ' podcast')}`,
    linkLabel: 'Spotify',
  },
  {
    key: 'cursos',
    label: 'Cursos',
    icon: GraduationCap,
    color: 'amber',
    linkFn: (item) => `https://www.google.com/search?q=${encodeURIComponent(item.titulo + ' ' + (item.plataforma || '') + ' curso')}`,
    linkLabel: 'Buscar',
  },
  {
    key: 'artigos',
    label: 'Artigos',
    icon: FileText,
    color: 'blue',
    linkFn: (item) => `https://www.google.com/search?q=${encodeURIComponent('"' + item.titulo + '" ' + (item.fonte || ''))}`,
    linkLabel: 'Google',
  },
  {
    key: 'ferramentas',
    label: 'Ferramentas',
    icon: Wrench,
    color: 'emerald',
    linkFn: (item) => `https://www.google.com/search?q=${encodeURIComponent(item.titulo)}`,
    linkLabel: 'Buscar',
  },
]

const COLOR = {
  violet:  { header: 'bg-violet-50 border-violet-200',  icon: 'text-violet-600 bg-violet-100',  badge: 'bg-violet-100 text-violet-700'  },
  red:     { header: 'bg-red-50 border-red-200',         icon: 'text-red-600 bg-red-100',         badge: 'bg-red-100 text-red-700'         },
  pink:    { header: 'bg-pink-50 border-pink-200',       icon: 'text-pink-600 bg-pink-100',       badge: 'bg-pink-100 text-pink-700'       },
  amber:   { header: 'bg-amber-50 border-amber-200',     icon: 'text-amber-600 bg-amber-100',     badge: 'bg-amber-100 text-amber-700'     },
  blue:    { header: 'bg-blue-50 border-blue-200',       icon: 'text-blue-600 bg-blue-100',       badge: 'bg-blue-100 text-blue-700'       },
  emerald: { header: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600 bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da API')
  return JSON.parse(match[0])
}

async function enrichBooks(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const q = encodeURIComponent(`${item.titulo} ${item.autor || ''}`)
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
      const data = await res.json()
      const vol = data.items?.[0]
      if (!vol) return item
      return {
        ...item,
        capa: vol.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        autorReal: vol.volumeInfo?.authors?.join(', ') || item.autor,
        tituloReal: vol.volumeInfo?.title || item.titulo,
        verified: true,
      }
    } catch {
      return item
    }
  }))
}

async function enrichVideos(items, youtubeApiKey) {
  if (!youtubeApiKey) return items
  return Promise.all(items.map(async (item) => {
    try {
      const q = encodeURIComponent(`${item.titulo} ${item.canal || ''}`)
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&maxResults=1&type=video&key=${youtubeApiKey}`)
      const data = await res.json()
      const vid = data.items?.[0]
      if (!vid) return item
      return {
        ...item,
        url: `https://www.youtube.com/watch?v=${vid.id.videoId}`,
        thumb: vid.snippet?.thumbnails?.default?.url || null,
        tituloReal: vid.snippet?.title || item.titulo,
        canalReal: vid.snippet?.channelTitle || item.canal,
        verified: true,
      }
    } catch {
      return item
    }
  }))
}

const PROMPT = (t, depth) => `Você é um curador de conteúdo educacional com foco em profundidade real.

Tema: "${t}"
Nível de profundidade: ${depth === 'avancado' ? 'avançado — a pessoa já conhece o básico e quer ir além' : 'intermediário — conhece o tema mas quer aprofundar'}

REGRAS OBRIGATÓRIAS:
1. PROIBIDO incluir os títulos mais citados/famosos do tema. Se a pessoa já pesquisou o assunto, ela provavelmente conhece.
2. Prefira conteúdo publicado nos últimos 3 anos ou clássicos pouco divulgados no Brasil.
3. Para vídeos: prefira canais com menos de 500k inscritos mas alta densidade técnica.
4. Para podcasts: indique episódios específicos, não só o nome do podcast.
5. Para artigos: prefira fontes como MIT Sloan, HBR, First Round Review, Substack de especialistas, newsletters setoriais.
6. Só inclua o que você tem certeza que existe.
7. 5 itens por categoria.

Retorne APENAS JSON válido:
{
  "livros": [
    { "titulo": "título exato", "autor": "nome completo", "descricao": "por que é uma escolha não-óbvia para quem já conhece o tema" }
  ],
  "videos": [
    { "titulo": "título do vídeo ou playlist", "canal": "nome exato do canal", "descricao": "por que vale a pena" }
  ],
  "podcasts": [
    { "titulo": "nome do episódio ou série", "programa": "nome do podcast", "descricao": "o que esse episódio traz de específico" }
  ],
  "cursos": [
    { "titulo": "nome do curso", "plataforma": "Coursera | Udemy | Maven | Reforge | outro", "descricao": "por que esse curso e não outros" }
  ],
  "artigos": [
    { "titulo": "título do artigo", "fonte": "veículo", "descricao": "argumento central do artigo" }
  ],
  "ferramentas": [
    { "titulo": "nome da ferramenta", "tipo": "SaaS | open-source | framework | template", "descricao": "caso de uso específico para esse tema" }
  ]
}`

export default function CommunityResources() {
  const apiKey = localStorage.getItem(LS_KEY) || ''
  const youtubeApiKey = useAIStore((s) => s.youtubeApiKey)

  const [topic, setTopic]   = useState('')
  const [depth, setDepth]   = useState('avancado')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [results, setResults] = useState(null)
  const [lastTopic, setLastTopic] = useState('')

  async function buscar() {
    const t = topic.trim()
    if (!t || loading) return
    if (!apiKey) { setError('Configure sua API key da Anthropic em Configurações'); return }
    setLoading(true)
    setError(null)
    setResults(null)

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
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          messages: [{ role: 'user', content: PROMPT(t, depth) }],
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

      setResults({ ...parsed, livros, videos })
      setLastTopic(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Ex: Empreender na era da IA, Precificação como PJ..."
              className="input w-full pl-9 text-sm"
            />
          </div>
          <button
            onClick={buscar}
            disabled={!topic.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Nível */}
        <div className="flex gap-2">
          {[{ id: 'intermediario', label: 'Intermediário' }, { id: 'avancado', label: 'Avançado' }].map((d) => (
            <button
              key={d.id}
              onClick={() => setDepth(d.id)}
              className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                depth === d.id
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {d.label}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 self-center ml-1">
            {depth === 'avancado' ? 'Exclui os títulos mais óbvios do tema' : 'Inclui boas introduções aprofundadas'}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-pulse">
              <div className="h-11 bg-gray-100" />
              <div className="p-3 space-y-3">
                {[1,2,3,4,5].map((j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-50 rounded w-full" />
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
            Indicações não-óbvias sobre <strong className="text-gray-600">"{lastTopic}"</strong>
            {!youtubeApiKey && (
              <span className="ml-2 text-amber-500">· vídeos sem YouTube API key (links de busca)</span>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label, icon: Icon, color, linkFn, linkLabel }) => {
              const items = results[key] ?? []
              if (items.length === 0) return null
              const c = COLOR[color]
              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 border-b ${c.header}`}>
                    <span className={`p-1.5 rounded-lg ${c.icon}`}><Icon size={13} /></span>
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{items.length}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {items.map((item, i) => {
                      const href = item.url || linkFn(item)
                      const subtitle = item.autorReal || item.canalReal || item.autor || item.canal || item.programa || item.plataforma || item.fonte || item.tipo
                      return (
                        <li key={i}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                          >
                            {(item.capa || item.thumb) && (
                              <img src={item.capa || item.thumb} alt="" className="w-7 h-9 object-cover rounded shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-orange-700 transition-colors">
                                {item.tituloReal || item.titulo}
                              </p>
                              {subtitle && (
                                <p className="text-xs text-orange-600 font-medium mt-0.5">{subtitle}</p>
                              )}
                              {item.descricao && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.descricao}</p>
                              )}
                              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 group-hover:text-orange-500 transition-colors">
                                {item.verified
                                  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {linkLabel}</>
                                  : <><ExternalLink size={9} /> {linkLabel}</>
                                }
                              </span>
                            </div>
                          </a>
                        </li>
                      )
                    })}
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
          <p className="text-sm font-medium">O que você quer aprender?</p>
          <p className="text-xs mt-1 opacity-70">Livros, vídeos, podcasts, cursos, artigos e ferramentas — sem os óbvios</p>
        </div>
      )}
    </div>
  )
}
