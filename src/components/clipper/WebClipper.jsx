import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Scissors, ExternalLink, Trash2, Tag, Search, Filter,
  BookOpen, Globe, MousePointer, Archive, Inbox, Star,
  Sparkles, Copy, ChevronDown, ChevronUp, X, Plus,
} from 'lucide-react'
import useStore from '../../store/useStore'
import useAIStore from '../../store/useAIStore'

const TYPE_LABELS = {
  article: { label: 'Artigo', icon: BookOpen, color: 'blue' },
  selection: { label: 'Seleção', icon: MousePointer, color: 'purple' },
  full_page: { label: 'Página', icon: Globe, color: 'green' },
}

const STATUS_LABELS = {
  inbox: { label: 'Inbox', icon: Inbox },
  read: { label: 'Lido', icon: Star },
  archived: { label: 'Arquivado', icon: Archive },
}

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  green: 'bg-green-50 text-green-700 border-green-200',
}

function ClipCard({ clip, onDelete, onUpdate, onSummarize, summarizing }) {
  const [expanded, setExpanded] = useState(false)
  const [editNote, setEditNote] = useState(false)
  const [noteVal, setNoteVal] = useState(clip.notes || '')
  const type = TYPE_LABELS[clip.type] || TYPE_LABELS.article
  const TypeIcon = type.icon

  const saveNote = () => {
    onUpdate(clip.id, { notes: noteVal })
    setEditNote(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
      {/* Hero image */}
      {clip.image && (
        <div className="h-36 bg-gray-100 overflow-hidden">
          <img
            src={clip.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.parentElement.style.display = 'none' }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Source row */}
        <div className="flex items-center gap-2 mb-2">
          {clip.favicon && (
            <img src={clip.favicon} alt="" className="w-4 h-4 rounded flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none' }} />
          )}
          <span className="text-xs text-gray-400 truncate flex-1">{clip.hostname || clip.url}</span>
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${COLOR_MAP[type.color]}`}>
            <TypeIcon size={10} />
            {type.label}
          </span>
        </div>

        {/* Title */}
        <a
          href={clip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-900 text-sm leading-snug hover:text-orange-600 transition-colors line-clamp-2 block mb-2"
        >
          {clip.title || 'Sem título'}
          <ExternalLink size={10} className="inline ml-1 opacity-50" />
        </a>

        {/* Description */}
        {clip.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{clip.description}</p>
        )}

        {/* AI Summary */}
        {clip.summary && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={11} className="text-orange-500" />
              <span className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide">Resumo IA</span>
            </div>
            <p className="text-xs text-orange-900 leading-relaxed">{clip.summary}</p>
          </div>
        )}

        {/* Content preview */}
        {clip.content && (
          <div className="mb-3">
            <p className={`text-xs text-gray-600 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
              {clip.content}
            </p>
            {clip.content.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] text-orange-600 font-medium mt-1 hover:text-orange-700"
              >
                {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver mais</>}
              </button>
            )}
          </div>
        )}

        {/* Note */}
        {editNote ? (
          <div className="mb-3">
            <textarea
              value={noteVal}
              onChange={(e) => setNoteVal(e.target.value)}
              className="w-full text-xs border border-orange-300 rounded-lg p-2 resize-none outline-none focus:ring-1 focus:ring-orange-400"
              rows={2}
              placeholder="Sua nota..."
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button onClick={saveNote} className="text-[11px] text-orange-600 font-semibold hover:underline">Salvar</button>
              <button onClick={() => setEditNote(false)} className="text-[11px] text-gray-400 hover:underline">Cancelar</button>
            </div>
          </div>
        ) : clip.notes ? (
          <div
            className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => setEditNote(true)}
          >
            <p className="text-xs text-yellow-800 italic">"{clip.notes}"</p>
          </div>
        ) : null}

        {/* Tags */}
        {clip.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {clip.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                <Tag size={8} />
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">
            {new Date(clip.savedAt || clip.clippedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Status cycle */}
            <select
              value={clip.status || 'inbox'}
              onChange={(e) => onUpdate(clip.id, { status: e.target.value })}
              className="text-[10px] border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-500 bg-white cursor-pointer outline-none"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Note */}
            <button
              onClick={() => setEditNote(true)}
              title="Adicionar nota"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus size={13} />
            </button>

            {/* AI Summarize */}
            <button
              onClick={() => onSummarize(clip)}
              disabled={summarizing === clip.id}
              title="Resumir com IA"
              className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-50"
            >
              <Sparkles size={13} />
            </button>

            {/* Copy URL */}
            <button
              onClick={() => navigator.clipboard.writeText(clip.url)}
              title="Copiar URL"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Copy size={13} />
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(clip.id)}
              title="Excluir clip"
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WebClipper() {
  const [searchParams, setSearchParams] = useSearchParams()
  const clips = useStore((s) => s.clips)
  const addClip = useStore((s) => s.addClip)
  const updateClip = useStore((s) => s.updateClip)
  const deleteClip = useStore((s) => s.deleteClip)
  const aiConfig = useAIStore((s) => s.config)

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTag, setFilterTag] = useState('')
  const [summarizing, setSummarizing] = useState(null)
  const [justSaved, setJustSaved] = useState(false)

  // Receive clip from extension via URL param
  useEffect(() => {
    const raw = searchParams.get('clip')
    if (!raw) return
    try {
      const clip = JSON.parse(decodeURIComponent(escape(atob(raw))))
      addClip(clip)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 4000)
      // Clean URL
      setSearchParams({}, { replace: true })
    } catch (e) {
      console.error('Failed to parse clip from URL', e)
    }
  }, [])

  // Collect all tags
  const allTags = useMemo(() => {
    const set = new Set()
    clips.forEach((c) => c.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [clips])

  const filtered = useMemo(() => {
    return clips.filter((c) => {
      if (filterType !== 'all' && c.type !== filterType) return false
      if (filterStatus !== 'all' && (c.status || 'inbox') !== filterStatus) return false
      if (filterTag && !c.tags?.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.content?.toLowerCase().includes(q) ||
          c.hostname?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.includes(q))
        )
      }
      return true
    })
  }, [clips, search, filterType, filterStatus, filterTag])

  const handleSummarize = async (clip) => {
    const provider = aiConfig?.provider
    const apiKey = aiConfig?.apiKey || localStorage.getItem('cio-openai-key') || localStorage.getItem('cio-groq-key')
    if (!apiKey) {
      alert('Configure uma chave de API em Configurações para usar resumos com IA.')
      return
    }

    setSummarizing(clip.id)
    try {
      const text = [clip.title, clip.description, clip.content].filter(Boolean).join('\n\n').slice(0, 4000)

      let response, data, summary
      if (provider === 'groq') {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: 'Você é um assistente que resume conteúdo de forma concisa. Responda em português, máximo 3 frases.' },
              { role: 'user', content: `Resuma este conteúdo:\n\n${text}` },
            ],
            max_tokens: 200,
          }),
        })
        data = await response.json()
        summary = data.choices?.[0]?.message?.content?.trim()
      } else {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: aiConfig?.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Você é um assistente que resume conteúdo de forma concisa. Responda em português, máximo 3 frases.' },
              { role: 'user', content: `Resuma este conteúdo:\n\n${text}` },
            ],
            max_tokens: 200,
          }),
        })
        data = await response.json()
        summary = data.choices?.[0]?.message?.content?.trim()
      }

      if (summary) updateClip(clip.id, { summary })
    } catch (e) {
      console.error('Summarize failed', e)
    } finally {
      setSummarizing(null)
    }
  }

  const stats = useMemo(() => ({
    total: clips.length,
    inbox: clips.filter((c) => (c.status || 'inbox') === 'inbox').length,
    read: clips.filter((c) => c.status === 'read').length,
    articles: clips.filter((c) => c.type === 'article').length,
  }), [clips])

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200">
            <Scissors size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Web Clipper</h1>
            <p className="text-sm text-gray-500">Seu segundo cérebro — conteúdo salvo da internet</p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {justSaved && (
        <div className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm font-medium animate-fade-in">
          <Scissors size={16} className="text-emerald-600 flex-shrink-0" />
          Clip salvo com sucesso no seu segundo cérebro!
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de clips', value: stats.total, color: 'orange' },
          { label: 'No inbox', value: stats.inbox, color: 'blue' },
          { label: 'Lidos', value: stats.read, color: 'green' },
          { label: 'Artigos', value: stats.articles, color: 'purple' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Install hint */}
      {clips.length === 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-5 flex gap-4">
          <div className="text-3xl flex-shrink-0">✂️</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Instale a extensão Chrome</h3>
            <p className="text-sm text-gray-600 mb-3">
              Para começar a salvar conteúdo da internet, instale a extensão Web Clipper no seu navegador.
            </p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Abra <strong>chrome://extensions</strong> no Chrome</li>
              <li>Ative o <strong>Modo do desenvolvedor</strong></li>
              <li>Clique em <strong>Carregar sem compactação</strong></li>
              <li>Selecione a pasta <code className="bg-orange-100 px-1 rounded">chrome-plugin/</code> deste projeto</li>
              <li>Clique no ícone ✂️ em qualquer página para recortar!</li>
            </ol>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clips..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 outline-none cursor-pointer"
        >
          <option value="all">Todos os tipos</option>
          <option value="article">Artigo</option>
          <option value="selection">Seleção</option>
          <option value="full_page">Página</option>
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 outline-none cursor-pointer"
        >
          <option value="all">Todos os status</option>
          <option value="inbox">Inbox</option>
          <option value="read">Lidos</option>
          <option value="archived">Arquivados</option>
        </select>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 outline-none cursor-pointer"
          >
            <option value="">Todas as tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} de {clips.length} clips
        </span>
      </div>

      {/* Clips grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Scissors size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {clips.length === 0 ? 'Nenhum clip ainda' : 'Nenhum clip encontrado'}
          </p>
          <p className="text-xs mt-1">
            {clips.length === 0
              ? 'Use a extensão Chrome para salvar conteúdos da internet'
              : 'Tente ajustar os filtros de busca'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onDelete={deleteClip}
              onUpdate={updateClip}
              onSummarize={handleSummarize}
              summarizing={summarizing}
            />
          ))}
        </div>
      )}
    </div>
  )
}
