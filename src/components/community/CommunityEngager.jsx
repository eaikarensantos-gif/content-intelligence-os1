import { useState, useEffect } from 'react'
import {
  Sparkles, Copy, Check, RefreshCw, AlertCircle, Trash2, Loader2, MessageCircle,
} from 'lucide-react'
import clsx from 'clsx'

const LS_KEY = 'cio-anthropic-key'
const HISTORY_KEY = 'cio-community-comments-history'

// ─── System prompt — mesma voz da Karen usada no Community Studio ─────────────

const COMMENT_SYSTEM = `Você escreve comentários para a Karen Santos deixar em posts de OUTROS membros e hosts da comunidade Contabilizei Mais.

QUEM É A KAREN:
- Gestora da comunidade Contabilizei Mais (3.000 profissionais criativos em transição CLT→PJ)
- Designer sênior, 10+ anos, especialista em IA para negócios
- Técnica e direta. Sem linguagem de coach ou motivacional

TOM OBRIGATÓRIO DOS COMENTÁRIOS:
- Como a Karen realmente digitaria no celular: informal de internet, pt-BR, oralidade real
- Proibido: "mindset", "propósito", "transformação", "jornada", elogios genéricos
- Proibido: "Parabéns pelo conteúdo!", "Muito bom!", "Excelente post!", repetir o post com outras palavras
- O comentário SEMPRE reage a algo específico do post: cita um detalhe, retoma uma frase, responde ao ponto central
- Pode admitir dúvida ou raciocínio aberto — soa mais real do que resposta pronta
- No máximo 1 emoji por comentário, e só se fizer sentido; alguns comentários sem emoji
- Sem hashtags, sem travessões dramáticos, sem frases picotadas estilo coach
- Comentário bom levanta a moral do autor E agrega para quem lê depois

Responda EXCLUSIVAMENTE com JSON válido.`

// ─── Opções ────────────────────────────────────────────────────────────────────

const TONES = [
  { id: 'apoio', label: 'Apoio genuíno', hint: 'Concorda e reforça o ponto do autor' },
  { id: 'experiencia', label: 'Experiência própria', hint: 'Complementa com uma vivência da Karen' },
  { id: 'pergunta', label: 'Pergunta curiosa', hint: 'Puxa conversa com uma pergunta real' },
  { id: 'complemento', label: 'Complemento técnico', hint: 'Adiciona um ângulo que faltou no post' },
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
  { id: 'proximo', label: 'Pessoa próxima' },
  { id: 'novo', label: 'Pessoa que conhece pouco' },
]

const buildPrompt = ({ post, author, relationship, tone, length, context }) => {
  const toneDef = TONES.find((t) => t.id === tone)
  const relDef = RELATIONSHIPS.find((r) => r.id === relationship)

  return `POST DE OUTRO MEMBRO DA COMUNIDADE:
"""
${post}
"""
${author ? `\nAUTOR DO POST: ${author}` : ''}
RELAÇÃO DA KAREN COM O AUTOR: ${relDef?.label}
${context?.trim() ? `CONTEXTO EXTRA: ${context.trim()}` : ''}

TAREFA: escreva 3 comentários diferentes que a Karen deixaria nesse post.
- Tom: ${toneDef?.label} — ${toneDef?.hint}
- Tamanho: ${LENGTHS.find((l) => l.id === length)?.label}
- Os 3 devem usar ângulos bem diferentes entre si

Responda com JSON:
{
  "comentarios": [
    { "comment": "texto do comentário", "angle": "descrição curta do ângulo usado" },
    { "comment": "...", "angle": "..." },
    { "comment": "...", "angle": "..." }
  ]
}`
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CommunityEngager() {
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
  const [reducing, setReducing] = useState({})
  const [reducePicker, setReducePicker] = useState({})

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

  const apiKey = localStorage.getItem(LS_KEY) || ''

  const reduceComment = async (idx, target = null) => {
    const apiKey = localStorage.getItem(LS_KEY) || ''
    if (!apiKey) return
    setReducing(r => ({ ...r, [idx]: true }))
    setReducePicker(p => ({ ...p, [idx]: null }))
    const instruction = target
      ? target.type === 'paragrafos'
        ? `Reescreva o comentário abaixo em exatamente ${target.qty} parágrafo${target.qty > 1 ? 's' : ''}, mantendo o tom e a voz originais. Retorne apenas o comentário, sem explicações.`
        : `Reescreva o comentário abaixo em no máximo ${target.qty} linha${target.qty > 1 ? 's' : ''}, mantendo o tom e voz originais. Retorne apenas o comentário, sem explicações.`
      : `Reduza o comentário abaixo em até 40%, mantendo o tom e a voz originais. Retorne apenas o comentário reduzido, sem explicações.`
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `${instruction}\n\n${results[idx].comment}`,
          }],
        }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      const reduced = data.content?.[0]?.text?.trim()
      if (reduced) setResults(prev => prev.map((r, i) => i === idx ? { ...r, comment: reduced } : r))
    } catch { /* mantém original */ }
    finally { setReducing(r => ({ ...r, [idx]: false })) }
  }

  const generate = async () => {
    if (!post.trim()) return
    if (!apiKey) {
      setError('Configure sua API key da Anthropic em Configurações')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai?action=anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1200,
          system: COMMENT_SYSTEM,
          messages: [{ role: 'user', content: buildPrompt({ post, author, relationship, tone, length, context }) }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da API')
      const parsed = JSON.parse(match[0]).comentarios || []
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
    <div className="space-y-5">
      {/* Input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={15} className="text-sky-500" />
          <p className="text-sm font-semibold text-gray-800">Comentar post de outra pessoa</p>
        </div>
        <p className="text-[10px] text-gray-400 -mt-1.5">
          Cola o post de um membro ou host, escolhe o tom, e gera 3 opções de comentário com a sua voz — prontas para copiar.
        </p>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Post original *
          </label>
          <textarea
            value={post}
            onChange={(e) => setPost(e.target.value)}
            rows={6}
            placeholder="Cole aqui o post da outra pessoa..."
            className="input w-full text-sm resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Autor (opcional)
            </label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Nome de quem postou"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Relação com o autor
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="input w-full text-sm bg-white"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Tom do comentário
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={clsx(
                  'text-left px-3 py-2 rounded-xl border text-xs transition-all',
                  tone === t.id
                    ? 'border-sky-400 bg-sky-50 text-sky-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Tamanho
            </label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="input w-full text-sm bg-white"
            >
              {LENGTHS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Contexto extra (opcional)
            </label>
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder='Ex: "ela acabou de fechar o primeiro cliente PJ"'
              className="input w-full text-sm"
            />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !post.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Gerando comentários...</>
            : <><Sparkles size={14} /> Gerar 3 comentários</>
          }
        </button>

        {error && (
          <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-2.5 py-0.5">
                  {r.angle || `Opção ${i + 1}`}
                </span>
                <button
                  onClick={() => copy(r.comment, i)}
                  className={clsx(
                    'flex items-center gap-1.5 text-[10px] font-semibold rounded-lg px-2.5 py-1.5 border transition-all shrink-0',
                    copiedIdx === i
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-sky-300 hover:text-sky-700'
                  )}
                >
                  {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
                  {copiedIdx === i ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="mt-2.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {r.comment}
              </p>
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => setReducePicker(p => ({ ...p, [i]: p[i] ? null : { type: 'paragrafos', qty: 2 } }))}
                  disabled={reducing[i]}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-40"
                >
                  {reducing[i] ? <Loader2 size={10} className="animate-spin" /> : <span>↙</span>}
                  Reduzir texto
                </button>
                {reducePicker[i] && (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                    <select
                      value={reducePicker[i].type}
                      onChange={e => setReducePicker(p => ({ ...p, [i]: { ...p[i], type: e.target.value } }))}
                      className="text-[11px] bg-transparent border-none outline-none text-violet-700 font-semibold cursor-pointer"
                    >
                      <option value="paragrafos">Parágrafos</option>
                      <option value="linhas">Linhas</option>
                    </select>
                    <input
                      type="number" min={1} max={20}
                      value={reducePicker[i].qty}
                      onChange={e => setReducePicker(p => ({ ...p, [i]: { ...p[i], qty: Math.max(1, Number(e.target.value)) } }))}
                      className="w-10 text-center text-[11px] bg-white border border-violet-200 rounded px-1 py-0.5 text-violet-700 font-bold"
                    />
                    <button
                      onClick={() => reduceComment(i, reducePicker[i])}
                      className="text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1 rounded-lg transition-all"
                    >
                      Confirmar
                    </button>
                    <button onClick={() => setReducePicker(p => ({ ...p, [i]: null }))} className="text-gray-400 hover:text-gray-600 text-[10px]">✕</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-sky-700 bg-white hover:bg-sky-50 border border-gray-200 hover:border-sky-200 rounded-xl py-2.5 transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Gerar outras opções
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Histórico recente</h2>
            <button
              onClick={() => setHistory([])}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={11} /> Limpar
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 8).map((h) => (
              <details key={h.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <summary className="cursor-pointer text-xs text-gray-600 flex items-center gap-2">
                  <span className="text-[9px] font-bold text-sky-700 bg-sky-50 rounded-full px-2 py-0.5 shrink-0">
                    {TONES.find((t) => t.id === h.tone)?.label || h.tone}
                  </span>
                  <span className="truncate flex-1">
                    {h.author ? `${h.author}: ` : ''}{h.postPreview}…
                  </span>
                  <span className="text-[9px] text-gray-400 shrink-0">
                    {new Date(h.at).toLocaleDateString('pt-BR')}
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  {(h.comments || []).map((c, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{c.comment}</p>
                      <button
                        onClick={() => copy(c.comment, `h-${h.id}-${i}`)}
                        className="text-gray-400 hover:text-sky-600 shrink-0 mt-0.5"
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
