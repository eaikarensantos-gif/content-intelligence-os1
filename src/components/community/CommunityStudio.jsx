import { useState } from 'react'
import { BookOpen, Play, FileText, Sparkles, Search, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import useAIStore from '../../store/useAIStore'
import { callAI } from '../../lib/aiService'

const CATEGORIES = [
  { key: 'livros',   label: 'Livros',          icon: BookOpen, color: 'violet' },
  { key: 'videos',   label: 'Vídeos & Cursos',  icon: Play,     color: 'red'    },
  { key: 'artigos',  label: 'Artigos',           icon: FileText, color: 'blue'   },
  { key: 'outros',   label: 'Outros',            icon: Sparkles, color: 'amber'  },
]

const COLOR = {
  violet: { header: 'bg-violet-50 border-violet-200', icon: 'text-violet-600 bg-violet-100', badge: 'bg-violet-100 text-violet-700' },
  red:    { header: 'bg-red-50 border-red-200',       icon: 'text-red-600 bg-red-100',       badge: 'bg-red-100 text-red-700'       },
  blue:   { header: 'bg-blue-50 border-blue-200',     icon: 'text-blue-600 bg-blue-100',     badge: 'bg-blue-100 text-blue-700'     },
  amber:  { header: 'bg-amber-50 border-amber-200',   icon: 'text-amber-600 bg-amber-100',   badge: 'bg-amber-100 text-amber-700'   },
}

function parseJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  return JSON.parse(cleaned)
}

export default function CommunityStudio() {
  const aiSettings = useAIStore((s) => s.getSettings())
  const isConfigured = useAIStore((s) => s.isConfigured())

  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [lastTopic, setLastTopic] = useState('')

  async function buscar() {
    const t = topic.trim()
    if (!t || loading) return
    setLoading(true)
    setError(null)
    setResults(null)

    const prompt = `Você é um especialista em curadoria de conteúdo educacional em português.
O usuário quer aprender mais sobre: "${t}"

Retorne EXATAMENTE um JSON válido com este formato (sem texto adicional, sem markdown):
{
  "livros": [
    { "titulo": "...", "autor": "...", "descricao": "..." }
  ],
  "videos": [
    { "titulo": "...", "canal": "...", "descricao": "..." }
  ],
  "artigos": [
    { "titulo": "...", "fonte": "...", "descricao": "..." }
  ],
  "outros": [
    { "titulo": "...", "tipo": "podcast | newsletter | ferramenta | comunidade | outro", "descricao": "..." }
  ]
}

Regras:
- Dê 3 a 5 itens por categoria
- Priorize conteúdo em português, mas inclua inglês quando for referência indispensável
- Descrições curtas e diretas (1 frase)
- Apenas conteúdo real e relevante`

    try {
      const text = await callAI(aiSettings, [{ role: 'user', content: prompt }], { maxTokens: 1800, temperature: 0.5 })
      const data = parseJSON(text)
      setResults(data)
      setLastTopic(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') buscar()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Community Studio</h1>
        <p className="text-sm text-gray-500 mt-1">Digite um tema e receba indicações de livros, vídeos, artigos e mais.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ex: Eficiência Operacional, Marketing de Conteúdo, Liderança..."
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-sm"
          />
        </div>
        <button
          onClick={buscar}
          disabled={!topic.trim() || loading || !isConfigured}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* API not configured */}
      {!isConfigured && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertCircle size={15} />
          Configure sua chave de API em <strong>Configurações</strong> para usar esta funcionalidade.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-pulse">
              <div className="h-12 bg-gray-100" />
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          <p className="text-xs text-gray-400">
            Indicações sobre <strong className="text-gray-600">"{lastTopic}"</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
              const items = results[key] ?? []
              const c = COLOR[color]
              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  {/* Category header */}
                  <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${c.header}`}>
                    <span className={`p-1.5 rounded-lg ${c.icon}`}>
                      <Icon size={14} />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  {/* Items */}
                  <ul className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-400 italic">Nenhuma indicação encontrada.</li>
                    ) : (
                      items.map((item, i) => (
                        <li key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{item.titulo}</p>
                              {(item.autor || item.canal || item.fonte || item.tipo) && (
                                <p className="text-xs text-orange-600 font-medium mt-0.5">
                                  {item.autor || item.canal || item.fonte || item.tipo}
                                </p>
                              )}
                              {item.descricao && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.descricao}</p>
                              )}
                            </div>
                            <ExternalLink size={13} className="shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <BookOpen size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Digite um tema acima e clique em <strong>Buscar</strong></p>
          <p className="text-xs mt-1 opacity-70">Você receberá livros, vídeos, artigos e outros recursos curados por IA</p>
        </div>
      )}
    </div>
  )
}
