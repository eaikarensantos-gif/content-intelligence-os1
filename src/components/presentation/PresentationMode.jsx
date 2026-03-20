import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Copy, Check, Loader2, ChevronDown, ChevronUp,
  Sparkles, MessageCircle, Zap, Target, BookOpen,
  Users, ArrowRight, RefreshCw, Save, Plus, ExternalLink,
  Play, Pause, X, Minus as MinusIcon, PlusCircle, Monitor,
} from 'lucide-react'
import useStore from '../../store/useStore'

const LS_KEY = 'cio-anthropic-key'

const AUDIENCES = [
  { id: 'general', label: 'Público geral' },
  { id: 'professionals', label: 'Profissionais / Corporativo' },
  { id: 'students', label: 'Estudantes / Universitários' },
  { id: 'entrepreneurs', label: 'Empreendedores' },
  { id: 'creators', label: 'Criadores de conteúdo' },
  { id: 'tech', label: 'Público técnico' },
  { id: 'community', label: 'Comunidade / Evento local' },
]

const GOALS = [
  { id: 'inspire', label: 'Inspirar e motivar', icon: Sparkles },
  { id: 'educate', label: 'Ensinar algo novo', icon: BookOpen },
  { id: 'persuade', label: 'Convencer / Vender uma ideia', icon: Target },
  { id: 'share', label: 'Compartilhar experiência', icon: MessageCircle },
  { id: 'activate', label: 'Provocar ação', icon: Zap },
]

const DURATIONS = [
  { id: '5', label: '5 min', desc: 'Lightning talk' },
  { id: '10', label: '10 min', desc: 'Talk curta' },
  { id: '20', label: '20 min', desc: 'Apresentação padrão' },
  { id: '30', label: '30+ min', desc: 'Palestra completa' },
]

async function generatePresentation(apiKey, { topic, audience, goal, duration, context }) {
  const goalLabel = GOALS.find(g => g.id === goal)?.label || goal
  const audienceLabel = AUDIENCES.find(a => a.id === audience)?.label || audience
  const durationLabel = DURATIONS.find(d => d.id === duration)?.label || duration

  const prompt = `Você é um preparador de apresentações e talks para criadores brasileiros. Sua especialidade é transformar ideias em falas envolventes que soam NATURAIS — como uma pessoa de verdade falando, não lendo um texto.

DADOS DA APRESENTAÇÃO:
- Tema: ${topic}
- Audiência: ${audienceLabel}
- Objetivo: ${goalLabel}
- Duração: ${durationLabel}
${context ? `- Contexto adicional: ${context}` : ''}

REGRAS DE ESTILO (CRÍTICO):
- Escreva TUDO em linguagem FALADA, não escrita
- Frases curtas, como alguém realmente fala no palco
- Ritmo natural com pausas implícitas
- Use "você" direto, como se estivesse conversando
- Inclua momentos de respiração, pausa dramática
- PROIBIDO: "isso vai mudar tudo", "o erro que 90% cometem", "ninguém te conta isso", linguagem de autoajuda genérica, frases motivacionais vazias
- PREFERIDO: "Tenho notado uma coisa curiosa...", "Deixa eu contar uma coisa...", "Talvez o problema não seja...", "Sabe o que é engraçado?"

GERE a apresentação completa com esta estrutura JSON:

{
  "title": "título da apresentação",
  "duration_estimate": "estimativa em minutos",
  "overview": "resumo em 1-2 frases do que a pessoa vai entregar",

  "opening": {
    "type": "pergunta | história | dado surpreendente | afirmação provocativa",
    "hook": "a frase/pergunta de abertura exata",
    "script": "roteiro falado dos primeiros 1-2 minutos (linguagem natural, como se estivesse falando)",
    "tip": "dica de como entregar esse momento"
  },

  "context": {
    "why_now": "por que esse tema importa AGORA",
    "script": "roteiro falado de 1-2 minutos contextualizando o tema",
    "bridge": "frase de transição para o conteúdo principal"
  },

  "main_blocks": [
    {
      "title": "título do bloco",
      "key_idea": "a ideia central em 1 frase",
      "script": "roteiro falado de 2-4 minutos para este bloco",
      "example_or_story": "exemplo concreto ou mini-história para ilustrar",
      "impact_moment": "a frase mais forte deste bloco — o momento que fica na memória",
      "audience_question": "pergunta para engajar a audiência neste momento"
    }
  ],

  "conclusion": {
    "recap": "recapitulação em 2-3 frases curtas",
    "closing_phrase": "frase de fechamento memorável",
    "script": "roteiro falado do fechamento (1-2 minutos)",
    "call_to_action": "o que você quer que a audiência faça depois"
  },

  "key_phrases": ["lista de 5-8 frases de impacto para enfatizar durante a fala"],
  "audience_questions": ["lista de 4-6 perguntas para engajar a audiência ao longo da apresentação"],

  "delivery_tips": [
    "3-5 dicas práticas de como entregar essa apresentação (postura, tom, pausas, etc.)"
  ]
}

Responda SOMENTE com JSON válido. Sem markdown, sem código, sem explicações.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      system: 'You are a Brazilian presentation coach who writes in natural spoken Portuguese. Everything you write must sound like someone TALKING, not writing. Respond ONLY with valid JSON — no markdown, no explanations.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }

  const data = await res.json()
  const raw = data.content[0].text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ─── Section Components ──────────────────────────────────────────────────────

function ScriptBlock({ label, icon: Icon, color, script, children }) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(script || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 hover:bg-gray-50 transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-semibold text-gray-800 flex-1 text-left">{label}</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 border-t border-gray-100 pt-4">
          {children}
          {script && (
            <div className="relative">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Roteiro falado</span>
                  <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{script}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PillList({ items, color = 'bg-orange-50 text-orange-700 border-orange-200' }) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${color}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

// ─── Loading Phases ──────────────────────────────────────────────────────────

const LOADING_PHASES = [
  'Analisando o tema...',
  'Criando a abertura perfeita...',
  'Estruturando os blocos principais...',
  'Escrevendo roteiro em linguagem falada...',
  'Criando momentos de impacto...',
  'Preparando frases de efeito...',
  'Finalizando a apresentação...',
]

// ─── Teleprompter ───────────────────────────────────────────────────────────
function Teleprompter({ result, onClose }) {
  const scrollRef = useRef(null)
  const animRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.5) // px per frame at 60fps
  const [fontSize, setFontSize] = useState(28)

  // Build full script text
  const scripts = []
  if (result.opening?.script) scripts.push({ label: 'ABERTURA', text: result.opening.script })
  if (result.context?.script) scripts.push({ label: 'CONTEXTO', text: result.context.script })
  ;(result.main_blocks || []).forEach((b, i) => {
    if (b.script) scripts.push({ label: `BLOCO ${i + 1}: ${b.title}`, text: b.script })
  })
  if (result.conclusion?.script) scripts.push({ label: 'FECHAMENTO', text: result.conclusion.script })

  const scroll = useCallback(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop += speed
    animRef.current = requestAnimationFrame(scroll)
  }, [speed])

  useEffect(() => {
    if (playing) {
      animRef.current = requestAnimationFrame(scroll)
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing, scroll])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p) }
      if (e.code === 'ArrowUp') { e.preventDefault(); setSpeed(s => Math.min(s + 0.3, 5)) }
      if (e.code === 'ArrowDown') { e.preventDefault(); setSpeed(s => Math.max(s - 0.3, 0.3)) }
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Control bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/80 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setPlaying(p => !p)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase font-semibold w-20">Velocidade</span>
            <button onClick={() => setSpeed(s => Math.max(s - 0.3, 0.3))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <MinusIcon size={12} />
            </button>
            <span className="text-sm text-white font-mono w-10 text-center">{speed.toFixed(1)}x</span>
            <button onClick={() => setSpeed(s => Math.min(s + 0.3, 5))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <PlusCircle size={12} />
            </button>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-gray-400 uppercase font-semibold w-14">Fonte</span>
            <button onClick={() => setFontSize(s => Math.max(s - 2, 16))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold">A-</button>
            <span className="text-sm text-white font-mono w-8 text-center">{fontSize}</span>
            <button onClick={() => setFontSize(s => Math.min(s + 2, 48))}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold">A+</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">Espaço = play/pause · Setas = velocidade · Esc = sair</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-500/50 flex items-center justify-center text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Script area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 sm:px-16 md:px-32 py-16"
        style={{ scrollBehavior: 'auto' }}>
        {/* Top padding for reading position */}
        <div className="h-[40vh]" />
        {scripts.map((s, i) => (
          <div key={i} className="mb-16">
            <div className="text-rose-400 font-bold uppercase tracking-widest mb-4" style={{ fontSize: fontSize * 0.5 }}>
              {s.label}
            </div>
            <p className="text-white leading-[1.8] whitespace-pre-wrap" style={{ fontSize }}>
              {s.text}
            </p>
          </div>
        ))}
        {/* Bottom padding */}
        <div className="h-[60vh]" />
      </div>

      {/* Reading guide line */}
      <div className="fixed left-0 right-0 top-1/3 pointer-events-none">
        <div className="h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PresentationMode() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('general')
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState('20')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadPhase, setLoadPhase] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [showTeleprompter, setShowTeleprompter] = useState(false)

  const { addIdea } = useStore()
  const navigate = useNavigate()
  const [savedToHub, setSavedToHub] = useState(false)

  const resultRef = useRef(null)

  const handleGenerate = async () => {
    if (!topic.trim() || !goal) return
    setLoading(true)
    setError(null)
    setResult(null)
    setLoadPhase(0)
    setSavedToHub(false)

    const phaseInterval = setInterval(() => {
      setLoadPhase((p) => (p < LOADING_PHASES.length - 1 ? p + 1 : p))
    }, 2500)

    try {
      const apiKey = localStorage.getItem(LS_KEY)
      if (!apiKey) throw new Error('Configure sua chave Anthropic no Analisador de Vídeo primeiro.')
      const data = await generatePresentation(apiKey, { topic, audience, goal, duration, context })
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    } catch (e) {
      setError(e.message || 'Erro ao gerar apresentação')
    } finally {
      clearInterval(phaseInterval)
      setLoading(false)
    }
  }

  const handleCopyAll = () => {
    if (!result) return
    const sections = [
      `# ${result.title}`,
      `Duração: ${result.duration_estimate}`,
      result.overview,
      '\n## ABERTURA',
      `Tipo: ${result.opening?.type}`,
      `Hook: ${result.opening?.hook}`,
      result.opening?.script,
      '\n## CONTEXTO',
      result.context?.why_now,
      result.context?.script,
      ...(result.main_blocks || []).flatMap((b, i) => [
        `\n## BLOCO ${i + 1}: ${b.title}`,
        `Ideia central: ${b.key_idea}`,
        b.script,
        b.example_or_story ? `Exemplo: ${b.example_or_story}` : '',
        b.impact_moment ? `Momento de impacto: "${b.impact_moment}"` : '',
      ]),
      '\n## FECHAMENTO',
      result.conclusion?.script,
      result.conclusion?.closing_phrase ? `Frase final: "${result.conclusion.closing_phrase}"` : '',
      '\n## FRASES-CHAVE',
      ...(result.key_phrases || []).map(p => `- "${p}"`),
    ].filter(Boolean)
    navigator.clipboard.writeText(sections.join('\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  const handleSaveToHub = () => {
    if (!result) return
    addIdea({
      title: result.title || topic,
      status: 'draft',
      priority: 'high',
      format: 'Apresentação',
      platforms: [],
      tags: ['apresentação', 'talk'],
      source: 'Presentation Mode',
      notes: `Duração: ${result.duration_estimate}\n\n${result.overview || ''}\n\nAbertura: ${result.opening?.hook || ''}\n\nBlocos: ${(result.main_blocks || []).map(b => b.title).join(' → ')}`,
    })
    setSavedToHub(true)
  }

  return (
    <div className="p-3 sm:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium mb-3">
          <Mic size={12} />
          Presentation Mode
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Modo Apresentação</h2>
        <p className="text-sm text-gray-500 mt-1">Transforme ideias em talks envolventes com roteiro em linguagem falada</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── INPUT PANEL ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 sm:p-5 space-y-4">
            {/* Topic */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Mic size={11} /> Tema da apresentação *
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Como a IA está mudando a criação de conteúdo"
                className="input"
              />
            </div>

            {/* Audience */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Users size={11} /> Audiência
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="input"
              >
                {AUDIENCES.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Goal */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Target size={11} /> Objetivo *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {GOALS.map(g => {
                  const GIcon = g.icon
                  const active = goal === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                        active
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <GIcon size={13} className={active ? 'text-rose-500' : 'text-gray-400'} />
                      {g.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Zap size={11} /> Duração
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDuration(d.id)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border text-xs transition-all ${
                      duration === d.id
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-bold">{d.label}</span>
                    <span className="text-[9px] text-gray-400">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Context */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <BookOpen size={11} /> Contexto adicional
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: Palestra para evento de marketing digital, 200 pessoas, quero falar sobre minha experiência..."
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim() || !goal}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {LOADING_PHASES[loadPhase]}
                </>
              ) : (
                <>
                  <Mic size={14} /> Gerar Apresentação
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <p className="text-[10px] text-gray-400 text-center">
              Configure sua chave Anthropic nas configurações do Analisador de Vídeo.
            </p>
          </div>
        </div>

        {/* ── RESULT PANEL ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4" ref={resultRef}>
          {!result && !loading && (
            <div className="card p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Mic size={32} className="text-gray-200 mb-4" />
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Configure e gere</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                Defina o tema, audiência e objetivo. O sistema vai gerar uma apresentação completa com roteiro em linguagem falada, pronta para você ensaiar.
              </p>
            </div>
          )}

          {loading && (
            <div className="card p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Loader2 size={28} className="text-rose-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">{LOADING_PHASES[loadPhase]}</p>
              <div className="w-48 h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((loadPhase + 1) / LOADING_PHASES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Title & actions */}
              <div className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">{result.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{result.overview}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-medium">
                        {result.duration_estimate}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                        {(result.main_blocks || []).length} blocos
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button onClick={() => setShowTeleprompter(true)}
                      className="text-xs px-3 py-2 rounded-lg bg-gray-900 text-white font-medium flex items-center gap-1.5 hover:bg-gray-800 transition-colors">
                      <Monitor size={12} /> Teleprompter
                    </button>
                    <button onClick={handleCopyAll} className="btn-secondary text-xs px-3 py-2">
                      {copiedAll ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedAll ? 'Copiado' : 'Copiar tudo'}
                    </button>
                    {savedToHub ? (
                      <button
                        onClick={() => navigate('/ideas')}
                        className="text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium flex items-center gap-1.5"
                      >
                        <Check size={12} /> Salvo <ExternalLink size={9} className="text-orange-500" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveToHub}
                        className="btn-primary text-xs px-3 py-2"
                      >
                        <Save size={12} /> Salvar no Hub
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Opening */}
              {result.opening && (
                <ScriptBlock label="Abertura" icon={Sparkles} color="bg-amber-100 text-amber-700" script={result.opening.script}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                        {result.opening.type}
                      </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Hook</p>
                      <p className="text-sm text-gray-800 font-medium italic">"{result.opening.hook}"</p>
                    </div>
                    {result.opening.tip && (
                      <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                        <Zap size={10} className="text-amber-500 mt-0.5 shrink-0" />
                        {result.opening.tip}
                      </p>
                    )}
                  </div>
                </ScriptBlock>
              )}

              {/* Context */}
              {result.context && (
                <ScriptBlock label="Contexto" icon={BookOpen} color="bg-blue-100 text-blue-700" script={result.context.script}>
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-1">Por que agora</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{result.context.why_now}</p>
                    </div>
                    {result.context.bridge && (
                      <p className="text-xs text-gray-500 italic flex items-start gap-1.5">
                        <ArrowRight size={10} className="text-blue-400 mt-0.5 shrink-0" />
                        Transição: "{result.context.bridge}"
                      </p>
                    )}
                  </div>
                </ScriptBlock>
              )}

              {/* Main blocks */}
              {(result.main_blocks || []).map((block, i) => (
                <ScriptBlock
                  key={i}
                  label={`Bloco ${i + 1}: ${block.title}`}
                  icon={Target}
                  color="bg-rose-100 text-rose-700"
                  script={block.script}
                >
                  <div className="space-y-3">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <p className="text-[10px] text-rose-600 font-semibold uppercase tracking-wide mb-1">Ideia central</p>
                      <p className="text-xs text-gray-800 font-medium">{block.key_idea}</p>
                    </div>

                    {block.example_or_story && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">Exemplo / História</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{block.example_or_story}</p>
                      </div>
                    )}

                    {block.impact_moment && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Momento de impacto</p>
                        <p className="text-sm text-gray-800 font-semibold italic">"{block.impact_moment}"</p>
                      </div>
                    )}

                    {block.audience_question && (
                      <p className="text-xs text-gray-500 flex items-start gap-1.5">
                        <MessageCircle size={10} className="text-rose-400 mt-0.5 shrink-0" />
                        Pergunta: "{block.audience_question}"
                      </p>
                    )}
                  </div>
                </ScriptBlock>
              ))}

              {/* Conclusion */}
              {result.conclusion && (
                <ScriptBlock label="Fechamento" icon={Zap} color="bg-emerald-100 text-emerald-700" script={result.conclusion.script}>
                  <div className="space-y-2">
                    {result.conclusion.recap && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide mb-1">Recapitulação</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{result.conclusion.recap}</p>
                      </div>
                    )}
                    {result.conclusion.closing_phrase && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Frase final</p>
                        <p className="text-sm text-gray-800 font-semibold italic">"{result.conclusion.closing_phrase}"</p>
                      </div>
                    )}
                    {result.conclusion.call_to_action && (
                      <p className="text-xs text-gray-500 flex items-start gap-1.5">
                        <ArrowRight size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                        CTA: {result.conclusion.call_to_action}
                      </p>
                    )}
                  </div>
                </ScriptBlock>
              )}

              {/* Key Phrases */}
              {result.key_phrases?.length > 0 && (
                <div className="card p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles size={11} className="text-amber-500" /> Frases-chave para enfatizar
                  </h4>
                  <div className="space-y-2">
                    {result.key_phrases.map((phrase, i) => (
                      <div key={i} className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2.5">
                        <span className="text-[10px] font-bold text-amber-500 mt-0.5 shrink-0">{i + 1}</span>
                        <p className="text-xs text-gray-700 font-medium italic">"{phrase}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audience Questions */}
              {result.audience_questions?.length > 0 && (
                <div className="card p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageCircle size={11} className="text-rose-500" /> Perguntas para engajar a audiência
                  </h4>
                  <div className="space-y-2">
                    {result.audience_questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 bg-rose-50/50 border border-rose-100 rounded-lg p-2.5">
                        <MessageCircle size={10} className="text-rose-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-700">"{q}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Tips */}
              {result.delivery_tips?.length > 0 && (
                <div className="card p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Mic size={11} className="text-violet-500" /> Dicas de entrega
                  </h4>
                  <div className="space-y-2">
                    {result.delivery_tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                        <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate */}
              <div className="flex justify-center pt-2">
                <button onClick={handleGenerate} disabled={loading} className="btn-secondary text-xs px-4 py-2">
                  <RefreshCw size={12} /> Gerar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teleprompter overlay */}
      {showTeleprompter && result && (
        <Teleprompter result={result} onClose={() => setShowTeleprompter(false)} />
      )}
    </div>
  )
}
