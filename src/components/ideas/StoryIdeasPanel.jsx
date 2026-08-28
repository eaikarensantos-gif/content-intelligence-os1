import { useState } from 'react'
import { Film, Plus, Check, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { STORY_IDEA_PROMPTS } from '../../data/storyIdeaPrompts'
import { generateMoreStoryPrompts } from '../../utils/storyIdeaGenerator'

const LS_KEY = 'cio-openai-key'

export default function StoryIdeasPanel({ onAddIdea }) {
  const [apiKey] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [extra, setExtra] = useState([])
  const [addedIdx, setAddedIdx] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allPrompts = [...STORY_IDEA_PROMPTS, ...extra]

  const handleAdd = (text, idx) => {
    onAddIdea({
      title: text,
      format: 'stories',
      priority: 'medium',
      status: 'idea',
      tags: ['ideia-stories'],
      source: 'Ideias para Stories',
    })
    setAddedIdx((prev) => new Set(prev).add(idx))
  }

  const handleGenerate = async () => {
    if (!apiKey) { setError('Configure sua chave OpenAI nas configurações do Analisador de Vídeo.'); return }
    setLoading(true)
    setError('')
    try {
      const more = await generateMoreStoryPrompts(apiKey, { existing: allPrompts })
      setExtra((prev) => [...prev, ...more.filter(Boolean)])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 sm:p-5 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <Film size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Ideias para Stories</p>
            <p className="text-[11px] text-gray-400">Prompts prontos pra gravar agora — clique em + pra levar direto pro Hub</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-secondary text-xs px-3 py-2 shrink-0"
        >
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Gerando...</> : <><Sparkles size={13} /> Gerar com IA</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px]">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {allPrompts.map((text, idx) => {
          const added = addedIdx.has(idx)
          const isExtra = idx >= STORY_IDEA_PROMPTS.length
          return (
            <li
              key={`${idx}-${text}`}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:border-amber-200 transition-colors"
            >
              <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="text-xs text-gray-700 flex-1 leading-snug">{text}</span>
              {isExtra && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 font-medium shrink-0">IA</span>
              )}
              <button
                onClick={() => handleAdd(text, idx)}
                disabled={added}
                title={added ? 'Adicionada ao Hub' : 'Adicionar ao Hub'}
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  added
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
                }`}
              >
                {added ? <Check size={12} /> : <Plus size={12} />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
