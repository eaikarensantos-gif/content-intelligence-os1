import { useState, useEffect } from 'react'
import {
  Users, Sparkles, Copy, Check, RefreshCw, AlertCircle, Trash2, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import useAIStore from '../../store/useAIStore'
import { callAI } from '../../lib/aiService'
import { withAntiAIFilter } from '../../lib/antiAIFilter'

// ── Opções de tom ─────────────────────────────────────────────────────────────
const TONES = [
  { id: 'apoio', label: 'Apoio genuíno', hint: 'Concorda e reforça o ponto do autor' },
  { id: 'experiencia', label: 'Experiência própria', hint: 'Complementa com uma vivência sua' },
  { id: 'pergunta', label: 'Pergunta curiosa', hint: 'Puxa conversa com uma pergunta real' },
  { id: 'complemento', label: 'Complemento', hint: 'Adiciona um ângulo que faltou no post' },
  { id: 'celebracao', label: 'Celebração', hint: 'Comemora uma conquista do autor' },
  { id: 'descontraido', label: 'Descontraído', hint: 'Leve, com humor sutil' },
]

const LENGTHS = [
  { id: 'curto', label: 'Curto (1-2 frases)' },
  { id: 'medio', label: 'Médio (2-4 frases)' },
  { id: 'longo', label: 'Mais elaborado' },
]

const RELATIONSHIPS = [
  { id: 'membro', label: 'Membro da comunidade' },
  { id: 'host', label: 'Host / co-criador' },
  { id: 'amigo', label: 'Amigo(a) próximo(a)' },
  { id: 'novo', label: 'Pessoa que conheço pouco' },
]

const HISTORY_KEY = 'cio-community-comments-history'

function buildPrompt({ post, author, relationship, tone, length, context }) {
  const toneDef = TONES.find((t) => t.id === tone)
  const relDef = RELATIONSHIPS.find((r) => r.id === relationship)

  return `Você vai escrever comentários para um post de outra pessoa em uma comunidade de criadores de conteúdo.

QUEM COMENTA: a criadora de conteúdo da comunidade. Ela conhece o autor do post como: ${relDef?.label || 'membro da comunidade'}.
${author ? `AUTOR DO POST: ${author}` : ''}
${context ? `CONTEXTO EXTRA: ${context}` : ''}

POST ORIGINAL:
"""
${post}
"""

TAREFA: escreva 3 comentários diferentes para esse post.
- Tom desejado: ${toneDef?.label} — ${toneDef?.hint}
- Tamanho: ${LENGTHS.find((l) => l.id === length)?.label}
- Em português brasileiro, informal de internet (como a pessoa realmente digitaria num comentário)
- Reaja a algo ESPECÍFICO do post (cite um detalhe, retome uma frase, responda ao ponto central) — nunca um elogio genérico que serviria para qualquer post
- Pode usar no máximo 1 emoji por comentário, e só se fizer sentido (alguns comentários sem emoji)
- Sem hashtags, sem "Parabéns pelo conteúdo!", sem "Muito bom!", sem repetir o post com outras palavras
- Os 3 comentários devem ser bem diferentes entre si (ângulos distintos)

Responda APENAS com um array JSON válido, sem markdown:
[
  { "comment": "...", "angle": "descrição curta do ângulo usado" },
  { "comment": "...", "angle": "..." },
  { "comment": "...", "angle": "..." }
]`
}

function parseJSON(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned)
}

export default function CommunityEngager() {
  const getSettings = useAIStore((s) => s.getSettings)
  const isConfigured = useAIStore((s) => s.isConfigured)

  const [post, setPost] = useState('')
  const [author, setAuthor] = useState('')
  const [context, setContext] = useState('')
  const [relationship, setRelationship] = useState('membro')
  const [tone, setTone] = useState('apoio')
  const [length, setLength] = useState('curto')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState([])
  const [copiedIdx, setCopiedIdx] = useState(null)

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
  }, [history])

  const generate = async () => {
    if (!post.trim()) return
    setLoading(true)
    setError(null)
    try {
      const messages = [
        {
          role: 'system',
          content: withAntiAIFilter(
            'Você escreve comentários de redes sociais que soam 100% humanos — como uma pessoa real digitando no celular. Nunca soe como assistente, marketing ou IA. Responda apenas com JSON válido.'
          ),
        },
        { role: 'user', content: buildPrompt({ post, author, relationship, tone, length, context }) },
      ]
      const text = await callAI(getSettings(), messages, { temperature: 0.95, maxTokens: 1200 })
      const parsed = parseJSON(text)
      setResults(parsed)
      setHistory((h) => [
        {
          id: Date.now(),
          postPreview: post.slice(0, 120),
          author,
          tone,
          comments: parsed,
          at: new Date().toISOString(),
        },
        ...h,
      ])
    } catch (e) {
      setError(e.message || 'Erro ao gerar comentários')
    } finally {
      setLoading(false)
    }
  }

  const copy = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Comunidade — Comentários</h1>
          <p className="text-sm text-gray-500">
            Cole o post de outro membro ou host e gere um comentário natural, com a sua voz
          </p>
        </div>
      </div>

      {!isConfigured() && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          Configure sua chave de IA em <strong>Configurações</strong> para gerar comentários.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Input ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Post original *
            </label>
            <textarea
              value={post}
              onChange={(e) => setPost(e.target.value)}
              rows={8}
              placeholder="Cole aqui o post da outra pessoa..."
              className="mt-1.5 w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Autor (opcional)
              </label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nome de quem postou"
                className="mt-1.5 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Relação com o autor
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="mt-1.5 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Tom do comentário
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={clsx(
                    'text-left px-3 py-2 rounded-xl border text-sm transition-all',
                    tone === t.id
                      ? 'border-orange-400 bg-orange-50 text-orange-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[11px] text-gray-400">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tamanho
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="mt-1.5 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {LENGTHS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contexto extra (opcional)
              </label>
              <input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder='Ex: "ela acabou de lançar um curso"'
                className="mt-1.5 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !post.trim() || !isConfigured()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3 transition-all shadow-lg shadow-orange-200"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Gerando...' : 'Gerar comentários'}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* ── Results ── */}
        <div className="space-y-4">
          {results.length === 0 && !loading && (
            <div className="bg-orange-50/50 border border-dashed border-orange-200 rounded-2xl p-10 text-center text-sm text-gray-400">
              Os comentários gerados aparecem aqui. <br />
              Escolha o que soar mais como você, copie e cole na comunidade.
            </div>
          )}

          {results.map((r, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 group">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-0.5">
                  {r.angle || `Opção ${i + 1}`}
                </span>
                <button
                  onClick={() => copy(r.comment, i)}
                  className={clsx(
                    'flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2.5 py-1.5 border transition-all',
                    copiedIdx === i
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-700'
                  )}
                >
                  {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                  {copiedIdx === i ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="mt-2.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {r.comment}
              </p>
            </div>
          ))}

          {results.length > 0 && (
            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-xl py-2.5 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Gerar outras opções
            </button>
          )}
        </div>
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">Histórico recente</h2>
            <button
              onClick={() => setHistory([])}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} /> Limpar
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 8).map((h) => (
              <details key={h.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <summary className="cursor-pointer text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-[11px] text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 shrink-0">
                    {TONES.find((t) => t.id === h.tone)?.label || h.tone}
                  </span>
                  <span className="truncate flex-1">
                    {h.author ? `${h.author}: ` : ''}{h.postPreview}…
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(h.at).toLocaleDateString('pt-BR')}
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  {(h.comments || []).map((c, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                      <button
                        onClick={() => copy(c.comment, `h-${h.id}-${i}`)}
                        className="text-gray-400 hover:text-orange-600 shrink-0 mt-0.5"
                        title="Copiar"
                      >
                        {copiedIdx === `h-${h.id}-${i}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
