import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Lightbulb, X, Check, Copy, RefreshCw,
  AlertCircle, Plus, Zap, AlignLeft, Mic, TrendingUp, Wand2,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { buildPositioningBlock } from '../../utils/voiceContext'

const LS_KEY = 'cio-anthropic-key'

const FORMATS = [
  { value: 'reels', label: 'Reels' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'stories', label: 'Stories' },
  { value: 'texto', label: 'Texto / Thread' },
  { value: 'livre', label: 'Livre' },
]

function ScoreRing({ score }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{score}</span>
    </div>
  )
}

function RevisorPanel() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [rewrittenText, setRewrittenText] = useState('')
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [applied, setApplied] = useState(null)
  const bannedPhrases = useStore((s) => s.posicionamento.lista_negra) || []
  const posicionamento = useStore((s) => s.posicionamento)

  const DIMS = [
    { key: 'clareza', label: 'Clareza', icon: AlignLeft, color: 'text-blue-500' },
    { key: 'tom', label: 'Tom', icon: Mic, color: 'text-violet-500' },
    { key: 'impacto', label: 'Impacto', icon: Zap, color: 'text-amber-500' },
    { key: 'autenticidade', label: 'Autenticidade', icon: TrendingUp, color: 'text-emerald-500' },
  ]

  function applySuggestion(problema, melhoria, idx) {
    setText((prev) => {
      if (prev.includes(problema)) return prev.replace(problema, melhoria)
      // fuzzy: try trimmed match
      const trimmed = problema.trim()
      if (prev.includes(trimmed)) return prev.replace(trimmed, melhoria)
      return prev
    })
    setApplied(idx)
    setTimeout(() => setApplied(null), 1500)
  }

  async function rewriteFull() {
    if (!result?.sugestoes?.length || !text.trim()) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { return }
    setRewriteLoading(true)
    setRewrittenText('')
    const suggestionsList = result.sugestoes
      .map((s, i) => `${i + 1}. Substituir: "${s.problema}" → Por: "${s.melhoria}"`)
      .join('\n')
    const bannedList = bannedPhrases.length ? `\nEvite estas frases banidas: ${bannedPhrases.join(', ')}` : ''
    const positioningBlock = buildPositioningBlock(posicionamento)
    const prompt = `Reescreva o texto abaixo incorporando as melhorias listadas. Preserve o estilo, voz e estrutura do texto original. Retorne APENAS o texto reescrito, sem introduções, títulos ou explicações.${bannedList}${positioningBlock}

TEXTO ORIGINAL:
${text.trim()}

MELHORIAS A INCORPORAR:
${suggestionsList}`
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
          thinking: { type: 'disabled' },
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      setRewrittenText(data.content?.[0]?.text?.trim() || '')
    } catch {
      // silent fail
    } finally {
      setRewriteLoading(false)
    }
  }

  const analyze = async () => {
    if (!text.trim()) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key da Anthropic primeiro'); return }
    setLoading(true)
    setResult(null)
    setError('')

    const bannedList = bannedPhrases.length ? `\nFrases banidas para evitar: ${bannedPhrases.join(', ')}` : ''
    const positioningBlock = buildPositioningBlock(posicionamento)
    const prompt = `Você é um revisor especialista em conteúdo para criadores digitais brasileiros. Analise o texto abaixo e retorne APENAS um JSON válido com esta estrutura:

{
  "score": <número 0-100>,
  "dimensoes": {
    "clareza": <0-100>,
    "tom": <0-100>,
    "impacto": <0-100>,
    "autenticidade": <0-100>
  },
  "parecer": "<uma frase resumindo a qualidade geral>",
  "linguagem_robotica": ["<trecho exato do texto que soa artificial ou genérico>"],
  "sugestoes": [
    { "problema": "<trecho original>", "melhoria": "<versão melhorada>" }
  ],
  "pontos_fortes": ["<ponto 1>", "<ponto 2>"]
}
${bannedList}${positioningBlock}

TEXTO PARA REVISAR:
${text.trim()}`

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
          thinking: { type: 'disabled' },
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) setResult(JSON.parse(match[0]))
      else throw new Error('Resposta inválida')
    } catch {
      setError('Erro ao analisar. Verifique sua API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Cole o texto para revisar
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Cole aqui o roteiro, legenda ou qualquer texto gerado..."
          className="w-full text-xs border border-gray-200 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300 leading-relaxed"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-300">{text.length} caracteres</span>
          {text && <button onClick={() => { setText(''); setResult(null) }} className="text-[10px] text-gray-400 hover:text-gray-600">Limpar</button>}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle size={12} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={analyze}
        disabled={loading || !text.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{ background: loading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
      >
        {loading ? <><RefreshCw size={13} className="animate-spin" /> Analisando...</> : <><Sparkles size={13} /> Revisar Texto</>}
      </button>

      {result && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <ScoreRing score={result.score} />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Score Geral</p>
              <p className="text-xs text-gray-700 leading-snug">{result.parecer}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DIMS.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="p-3 rounded-xl border border-gray-100 bg-white space-y-1.5">
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
                  <Icon size={10} /> {label}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${result.dimensoes?.[key] || 0}%`,
                        background: (result.dimensoes?.[key] || 0) >= 75 ? '#10b981' : (result.dimensoes?.[key] || 0) >= 50 ? '#f59e0b' : '#ef4444',
                      }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 w-6 text-right">{result.dimensoes?.[key]}</span>
                </div>
              </div>
            ))}
          </div>

          {result.linguagem_robotica?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Soa artificial</p>
              {result.linguagem_robotica.map((t, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs text-red-700 italic">"{t}"</p>
                </div>
              ))}
            </div>
          )}

          {result.sugestoes?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Sugestões de melhoria</p>
              {result.sugestoes.map((s, i) => (
                <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-3 py-2 bg-red-50/60 border-b border-gray-100">
                    <p className="text-[10px] text-red-500 font-medium">Antes</p>
                    <p className="text-xs text-gray-700 italic">"{s.problema}"</p>
                  </div>
                  <div className="px-3 py-2 bg-emerald-50/60">
                    <p className="text-[10px] text-emerald-600 font-medium">Sugestão</p>
                    <p className="text-xs text-gray-800 font-medium mb-2">"{s.melhoria}"</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => applySuggestion(s.problema, s.melhoria, i)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          applied === i
                            ? 'bg-emerald-500 text-white'
                            : 'bg-violet-600 hover:bg-violet-700 text-white'
                        }`}
                      >
                        {applied === i ? <><Check size={10} /> Aplicado!</> : <><Wand2 size={10} /> Aplicar no texto</>}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(s.melhoria); setCopied(i); setTimeout(() => setCopied(false), 1500) }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        {copied === i ? <Check size={10} /> : <Copy size={10} />} Copiar
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={rewriteFull}
                disabled={rewriteLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all mt-1"
                style={{ background: rewriteLoading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {rewriteLoading
                  ? <><RefreshCw size={13} className="animate-spin" /> Reescrevendo...</>
                  : <><Wand2 size={13} /> Reescrever Roteiro Completo</>}
              </button>

              {rewrittenText && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Roteiro Reescrito</p>
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                    <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{rewrittenText}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(rewrittenText); setCopied('rewrite'); setTimeout(() => setCopied(false), 1500) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      {copied === 'rewrite' ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar</>}
                    </button>
                    <button
                      onClick={() => { setText(rewrittenText); setRewrittenText(''); setResult(null) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                    >
                      <Check size={11} /> Usar este texto
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {result.pontos_fortes?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Pontos fortes</p>
              {result.pontos_fortes.map((p, i) => (
                <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{p}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IdeiaPanel() {
  const addIdea = useStore((s) => s.addIdea)
  const [text, setText] = useState('')
  const [format, setFormat] = useState('livre')
  const [saved, setSaved] = useState(false)
  const textRef = useRef(null)

  useEffect(() => { textRef.current?.focus() }, [])

  const save = () => {
    if (!text.trim()) return
    addIdea({ title: text.trim().slice(0, 80), hook: text.trim(), format, status: 'idea', source: 'Captura Rápida' })
    setSaved(true)
    setTimeout(() => { setText(''); setFormat('livre'); setSaved(false) }, 1500)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Qual é a ideia?</label>
        <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) save() }}
          rows={4}
          placeholder="Descreva a ideia brevemente — gancho, tema, ângulo, o que vier à cabeça agora..."
          className="w-full text-xs border border-gray-200 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 placeholder:text-gray-300 leading-relaxed"
        />
        <p className="text-[10px] text-gray-300 mt-1">Ctrl+Enter para salvar</p>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Formato</label>
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((f) => (
            <button key={f.value} onClick={() => setFormat(f.value)}
              className={`text-[11px] px-3 py-1 rounded-full font-medium transition-all border ${
                format === f.value ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={!text.trim() || saved}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
        style={{ background: saved ? '#10b981' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        {saved ? <><Check size={13} /> Salvo no Hub de Ideias!</> : <><Lightbulb size={13} /> Salvar Ideia</>}
      </button>
    </div>
  )
}

function BanidasPanel() {
  const bannedPhrases = useStore((s) => s.posicionamento.lista_negra) || []
  const addBannedPhrase = useStore((s) => s.addBannedPhrase)
  const removeBannedPhrase = useStore((s) => s.removeBannedPhrase)
  const [input, setInput] = useState('')

  const add = () => { if (!input.trim()) return; addBannedPhrase(input.trim()); setInput('') }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Frases banidas são bloqueadas em todos os geradores do app — Reels, Carrossel, Stories e VideoAnalyzer.
      </p>

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder='Ex: "Você já sentiu que..."'
          className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 placeholder:text-gray-300"
          autoFocus />
        <button onClick={add} disabled={!input.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors flex items-center gap-1">
          <Plus size={12} /> Banir
        </button>
      </div>

      {bannedPhrases.length === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <X size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">Nenhuma frase banida ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            {bannedPhrases.length} frase{bannedPhrases.length !== 1 ? 's' : ''} banida{bannedPhrases.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {bannedPhrases.map((phrase) => (
              <div key={phrase} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                <X size={10} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-700 flex-1 leading-snug">"{phrase}"</p>
                <button onClick={() => removeBannedPhrase(phrase)} className="text-red-300 hover:text-red-600 shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ACTIONS = [
  { id: 'revisor', label: 'Revisor de Texto', icon: Sparkles, btnClass: 'bg-violet-600 hover:bg-violet-700', activeClass: 'bg-violet-700', panelBorder: 'border-violet-100', headerBg: 'bg-violet-50', headerText: 'text-violet-700', Panel: RevisorPanel },
  { id: 'ideia', label: 'Capturar Ideia', icon: Lightbulb, btnClass: 'bg-amber-500 hover:bg-amber-600', activeClass: 'bg-amber-600', panelBorder: 'border-amber-100', headerBg: 'bg-amber-50', headerText: 'text-amber-700', Panel: IdeiaPanel },
  { id: 'banidas', label: 'Frases Banidas', icon: X, btnClass: 'bg-red-500 hover:bg-red-600', activeClass: 'bg-red-600', panelBorder: 'border-red-100', headerBg: 'bg-red-50', headerText: 'text-red-700', Panel: BanidasPanel },
]

export default function FloatingActions() {
  const [activePanel, setActivePanel] = useState(null)
  const panelRef = useRef(null)
  const active = ACTIONS.find((a) => a.id === activePanel)

  const toggle = (id) => setActivePanel((prev) => (prev === id ? null : id))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setActivePanel(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!activePanel) return
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[data-fab]'))
        setActivePanel(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [activePanel])

  return (
    <>
      {activePanel && <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setActivePanel(null)} />}

      {active && (
        <div ref={panelRef}
          className={`fixed bottom-20 right-4 z-50 w-[360px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-2xl border ${active.panelBorder} overflow-hidden animate-slide-up`}>
          <div className={`flex items-center justify-between px-5 py-3.5 border-b ${active.panelBorder} ${active.headerBg} shrink-0`}>
            <div className="flex items-center gap-2">
              <active.icon size={14} className={active.headerText} />
              <p className={`text-sm font-semibold ${active.headerText}`}>{active.label}</p>
            </div>
            <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <active.Panel />
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-center">
        {ACTIONS.map(({ id, label, icon: Icon, btnClass, activeClass }) => (
          <button key={id} data-fab onClick={() => toggle(id)} title={label}
            className={`w-11 h-11 rounded-2xl text-white shadow-lg transition-all duration-150 flex items-center justify-center ${
              activePanel === id ? activeClass + ' scale-95' : btnClass + ' hover:scale-105 hover:shadow-xl'
            }`}>
            {activePanel === id ? <X size={16} /> : <Icon size={16} />}
          </button>
        ))}
      </div>
    </>
  )
}
