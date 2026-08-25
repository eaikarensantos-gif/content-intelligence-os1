import { useState, useRef, useEffect } from 'react'
import { extractJsonObject, assertNotTruncated } from '../../utils/aiJson.js'
import { useNavigate } from 'react-router-dom'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'
import {
  Brain, Sparkles, Copy, Check, Plus, Trash2,
  Clock, Layers, Video, AlignLeft, BookOpen, Zap,
  RefreshCw, LayoutGrid, Mic, Music2,
  Heart,
  Film, Smartphone, ExternalLink,
  Wand2, ArrowLeft, ThumbsDown, ChevronDown, ChevronUp, Lightbulb,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { buildVoiceContext, buildRegenerateInstruction } from '../../utils/voiceContext'
import { TEMAS_CARROSSEL, PERSONAL_TEMAS_SUGESTOES } from '../../data/temasCarrossel'

// ─── Claude call ─────────────────────────────────────────────────────────────
async function captureThought(apiKey, { thought, niche, tone, persona, voiceContext, regenInstruction }) {
  const toneInstruction = {
    reflexivo:   'Tom suave, introspectivo e pessoal.',
    provocador:  'Tom que questiona o status quo, que incomoda no bom sentido.',
    íntimo:      'Tom de confissão, diário, como se fosse escrito às 2 da manhã.',
    analítico:   'Tom racional e perspicaz, mas ainda humano e não acadêmico.',
    humor:       'Tom leve, espirituoso e com sacadas inteligentes — humor que conecta sem forçar.',
  }[tone] || ''

  const personaInstruction = persona === 'personal'
    ? `MODO PESSOAL — DO LADO DE CÁ:
- Karen escreve como pessoa física, não como consultora, mentora ou especialista.
- O objetivo é conexão, identificação, humor, afeto ou reflexão cotidiana. Não é autoridade.
- Escreva em primeira pessoa e parta de uma cena, gesto, objeto, rotina ou memória concreta.
- Não transforme o pensamento em lição profissional, exercício, conselho ou conteúdo de produtividade.
- Naomi é a bulldog francesa de Karen. Só a inclua quando o pensamento mencionar Naomi, cachorro, bulldog ou pet; nunca trate Naomi como criança ou pessoa.
- Não invente fatos pessoais. Quando faltar um detalhe indispensável, use [Karen: conte aqui o detalhe real].
- Termine com observação, imagem, humor seco ou pergunta natural, sem moral da história.`
    : `MODO PROFISSIONAL:
- Preserve a voz analítica, crítica, direta e empática de Karen.
- Desenvolva a implicação profissional ou estratégica do pensamento sem recorrer a jargão corporativo vazio.`

  const prompt = `Você é um ghostwriter especialista em conteúdo autêntico para criadores digitais brasileiros. Você conhece profundamente o que performa bem em cada plataforma. Seu estilo é observacional, reflexivo e humano — como alguém que realmente pensa antes de escrever.

O criador teve este pensamento bruto:
"${thought}"

${niche ? `Contexto / nicho: ${niche}` : ''}
${toneInstruction}
${personaInstruction}

Transforme este pensamento num post reflexivo completo e bem desenvolvido.

REGRAS DE ESTILO (CRÍTICO — SIGA EXATAMENTE):
PROIBIDO (nunca use estas frases ou variações delas):
- "isso vai mudar tudo"
- "o erro que 90% das pessoas cometem"
- "ninguém te conta isso"
- "a verdade é que"
- "o segredo de..."
- "X dicas para..."
- "Como fazer em 5 passos"
- Qualquer linguagem de palestra motivacional, clickbait ou marketing genérico

PREFERIDO (use este estilo de linguagem):
- "Tenho notado uma coisa curiosa..."
- "Depois de um tempo você percebe..."
- "Talvez o problema não seja..."
- "Existe um padrão que pouca gente observa..."
- "O que me incomoda nessa conversa é..."

PRINCÍPIOS ABSOLUTOS:
- Conteúdo humano, conversacional e reflexivo
- Cada formato deve girar em torno de UMA ideia central bem desenvolvida
- Idioma: português brasileiro coloquial mas cuidadoso
- Tom observacional — como alguém que está compartilhando uma reflexão genuína

─────────────────────────────────────────────────────
POST REFLEXIVO (LinkedIn / Instagram feed)
- 200-400 palavras em parágrafos corridos (zero bullets)
- Uma ideia que se desenvolve naturalmente
- A última frase ecoa na mente do leitor

─────────────────────────────────────────────────────
${voiceContext || ''}${regenInstruction || ''}
IMPORTANTE: não escreva nenhum texto de raciocínio, rascunho ou explicação fora do JSON. A resposta inteira deve ser o objeto JSON abaixo, sem nada antes ou depois, começando direto com "{".
Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "core_insight": "a essência do pensamento em 1 frase poderosa",
  "emotional_angle": "emoção central ativada (ex: alívio, reconhecimento, curiosidade, tensão saudável)",
  "reflection_post": {
    "text": "post completo com parágrafos naturais, sem bullets",
    "opening_line": "primeira frase exata",
    "closing_line": "última frase/pergunta exata",
    "suggested_platform": "LinkedIn ou Instagram"
  },
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "save_as_idea": {
    "title": "título para salvar no Hub de Ideias",
    "description": "descrição do conceito em 1-2 frases",
    "platform": "plataforma principal",
    "format": "formato principal"
  }
}`

  const res = await fetch('/api/ai?action=gemini', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      max_tokens: 4000,
      system: withManualOperacional(withAntiAIFilter('You are a sharp, curious Brazilian content creator. Your DEFAULT energy is curiosity, wit, and genuine enthusiasm — never melancholic, pessimistic, or defeatist. You can be reflective but always land on something constructive, interesting, or energizing. For brand content: enthusiastic and genuine. For reflective content: curious and intelligent. NEVER default to sad or heavy tone. Respond ONLY with valid JSON — no markdown, no code blocks. Your entire response must start with "{" — no reasoning, drafts, or commentary outside the JSON.')),
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }

  const data = await res.json()
  assertNotTruncated(data)
  const raw = data.content?.find(b => b.type === 'text')?.text || ''
  return extractJsonObject(raw, 'Resposta inválida da IA')
}

// ─── Loading phases ───────────────────────────────────────────────────────────
const PHASES = [
  { label: 'Capturando a essência...', icon: Brain, color: 'text-indigo-500' },
  { label: 'Estruturando o post...', icon: Layers, color: 'text-violet-500' },
  { label: 'Desenvolvendo a ideia...', icon: Smartphone, color: 'text-pink-500' },
  { label: 'Refinando o tom...', icon: Sparkles, color: 'text-purple-500' },
]

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  indigo:  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'text-indigo-500', border: 'border-indigo-100', header: 'bg-indigo-50/60', btn: 'bg-indigo-500 hover:bg-indigo-600 text-white' },
  violet:  { badge: 'bg-violet-50 text-violet-700 border-violet-200', icon: 'text-violet-500', border: 'border-violet-100', header: 'bg-violet-50/60', btn: 'bg-violet-500 hover:bg-violet-600 text-white' },
  purple:  { badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'text-purple-500', border: 'border-purple-100', header: 'bg-purple-50/60', btn: 'bg-purple-500 hover:bg-purple-600 text-white' },
  fuchsia: { badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', icon: 'text-fuchsia-500', border: 'border-fuchsia-100', header: 'bg-fuchsia-50/60', btn: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white' },
  rose:    { badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'text-rose-500', border: 'border-rose-100', header: 'bg-rose-50/60', btn: 'bg-rose-500 hover:bg-rose-600 text-white' },
  pink:    { badge: 'bg-pink-50 text-pink-700 border-pink-200', icon: 'text-pink-500', border: 'border-pink-100', header: 'bg-pink-50/60', btn: 'bg-pink-500 hover:bg-pink-600 text-white' },
  zinc:    { badge: 'bg-zinc-100 text-zinc-700 border-zinc-300', icon: 'text-zinc-600', border: 'border-zinc-200', header: 'bg-zinc-50', btn: 'bg-zinc-800 hover:bg-zinc-900 text-white' },
}

// ─── Clipboard hook ───────────────────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ─── Favorite button ─────────────────────────────────────────────────────────
function FavBtn({ isFav, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
      title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Heart size={13} className={isFav ? 'fill-current' : ''} />
    </button>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────
function SaveBtn({ saved, onClick, color, onOpenHub }) {
  const c = COLOR_MAP[color]
  return saved ? (
    <div className="flex items-center gap-2 w-full">
      <span className="flex-1 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200">
        <Check size={12} /> Salvo no Hub
      </span>
      <button
        onClick={onOpenHub}
        className="text-[10px] font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 shrink-0 px-2 py-2 rounded-lg hover:bg-orange-50 transition-colors"
      >
        Abrir no Hub <ExternalLink size={9} />
      </button>
    </div>
  ) : (
    <button
      onClick={onClick}
      className={`w-full text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${c.btn}`}
    >
      <Plus size={12} /> Salvar no Hub de Ideias
    </button>
  )
}

// ─── Format 1: Reflection Post ────────────────────────────────────────────────
function ReflectionCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav, onDislike }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.indigo
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <AlignLeft size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Post Reflexivo</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{data.suggested_platform}</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={onDislike} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Não gostei"><ThumbsDown size={13} /></button>
          <button onClick={() => copy(data.text, 'post')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'post' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className={`rounded-xl p-3 border ${c.border} bg-indigo-50/30`}>
          <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide mb-1">Abertura</p>
          <p className="text-xs text-gray-700 italic">"{data.opening_line}"</p>
        </div>
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.text}</p>
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Encerramento</p>
          <p className="text-xs text-gray-600 italic">"{data.closing_line}"</p>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="indigo" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── History item ─────────────────────────────────────────────────────────────
function HistoryItem({ capture, onLoad, onDelete }) {
  return (
    <div
      className="group flex items-start gap-2.5 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
      onClick={() => onLoad(capture)}
    >
      <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0 mt-1.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug line-clamp-2">{capture.thought}</p>
        {capture.result?.core_insight && (
          <p className="text-[10px] text-indigo-500 mt-1 line-clamp-1 italic">→ {capture.result.core_insight}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">
          {new Date(capture.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(capture.id) }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingView({ phase }) {
  const PhaseIcon = PHASES[phase]?.icon || Brain
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 space-y-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-200">
          <Brain size={36} className="text-white" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <PhaseIcon size={14} className={PHASES[phase]?.color} />
          {PHASES[phase]?.label}
        </p>
        <p className="text-xs text-gray-400">Transformando em 7 formatos + frases virais...</p>
      </div>
      <div className="flex items-center gap-2">
        {PHASES.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${i < phase ? 'bg-indigo-500' : i === phase ? 'bg-indigo-400 scale-125 animate-pulse' : 'bg-gray-200'}`} />
            {i < PHASES.length - 1 && <div className={`h-0.5 w-6 transition-all duration-700 ${i < phase ? 'bg-indigo-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tone options ─────────────────────────────────────────────────────────────
const TONE_OPTIONS = [
  { value: 'reflexivo', label: 'Reflexivo', emoji: '🌿' },
  { value: 'provocador', label: 'Provocador', emoji: '⚡' },
  { value: 'íntimo', label: 'Íntimo', emoji: '🌙' },
  { value: 'analítico', label: 'Analítico', emoji: '🔍' },
  { value: 'humor', label: 'Humor', emoji: '😄' },
]

const ALL_FORMAT_KEYS = ['reflection_post']

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ThoughtCapture() {
  const { thoughtCaptures, addThoughtCapture, deleteThoughtCapture, addIdea, addFavorite, removeFavorite, favorites, brandVoice, dislikedContent, addDislike } = useStore()
  const bannedWords = useStore(s => s.posicionamento.lista_negra) || []
  const posicionamento = useStore(s => s.posicionamento)
  const navigate = useNavigate()

  const [thought, setThought] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('reflexivo')
  const [showThemeBank, setShowThemeBank] = useState(false)
  const [themeBankPersona, setThemeBankPersona] = useState('professional')
  const [themeBankOpenCategory, setThemeBankOpenCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadPhase, setLoadPhase] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [currentThought, setCurrentThought] = useState('')
  const [savedFormats, setSavedFormats] = useState(new Set())
  const [regenAttempt, setRegenAttempt] = useState(0)

  const phaseRef = useRef(null)
  const resultsRef = useRef(null)
  const apiKey = localStorage.getItem('cio-anthropic-key')

  const startPhases = () => {
    setLoadPhase(0)
    let p = 0
    phaseRef.current = setInterval(() => {
      p += 1
      if (p >= PHASES.length) clearInterval(phaseRef.current)
      else setLoadPhase(p)
    }, 1600)
  }
  useEffect(() => () => clearInterval(phaseRef.current), [])

  const handleCapture = async () => {
    if (!thought.trim() || thought.trim().length < 10) { setError('Escreva ao menos 10 caracteres para capturar.'); return }
    if (!apiKey) { setError('Chave da API Gemini não configurada. Vá em Configurações.'); return }
    setError(''); setLoading(true); setResult(null); setSavedFormats(new Set()); setCurrentThought(thought)
    startPhases()
    try {
      const voiceCtx = buildVoiceContext(themeBankPersona === 'personal' ? null : brandVoice, dislikedContent, bannedWords, themeBankPersona === 'personal' ? null : posicionamento)
      const regenInstr = regenAttempt > 0 ? buildRegenerateInstruction(regenAttempt) : ''
      const data = await captureThought(apiKey, { thought: thought.trim(), niche, tone, persona: themeBankPersona, voiceContext: voiceCtx, regenInstruction: regenInstr })
      setResult(data)
      setRegenAttempt(c => c + 1)
      addThoughtCapture({ thought: thought.trim(), niche, tone, persona: themeBankPersona, result: data })
      // Auto-save draft to Hub
      if (data.save_as_idea) {
        addIdea({
          title: data.save_as_idea.title || thought.trim().slice(0, 60),
          description: data.save_as_idea.description || data.core_insight || '',
          status: 'draft',
          tags: ['thought-capture', 'auto-save'],
          source: 'Thought Capture',
        })
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(phaseRef.current)
      setLoading(false)
    }
  }

  const handleLoadCapture = (capture) => {
    setThought(capture.thought); setNiche(capture.niche || ''); setTone(capture.tone || 'reflexivo'); setThemeBankPersona(capture.persona || 'professional')
    setResult(capture.result); setCurrentThought(capture.thought); setSavedFormats(new Set())
  }

  const FORMAT_LABELS = { reflection_post: 'post reflexivo' }
  const FORMAT_PLATFORMS = { reflection_post: 'Instagram' }
  const FORMAT_FORMATS = { reflection_post: 'post' }

  const buildFullDescription = (key) => {
    const d = result?.[key]
    if (!d) return result?.save_as_idea?.description || ''

    switch (key) {
      case 'reflection_post':
        return [
          `ABERTURA: "${d.opening_line}"`,
          '',
          d.text,
          '',
          `ENCERRAMENTO: "${d.closing_line}"`,
        ].join('\n')

      default:
        return result?.save_as_idea?.description || ''
    }
  }

  const handleSaveFormat = (key) => {
    if (!result?.save_as_idea) return
    addIdea({
      title: result.save_as_idea.title,
      description: buildFullDescription(key),
      platform: FORMAT_PLATFORMS[key] || result.save_as_idea.platform || 'Instagram',
      format: FORMAT_FORMATS[key] || 'post',
      status: 'draft',
      tags: ['thought-capture', FORMAT_LABELS[key], ...(result.hashtags || []).slice(0, 2)],
      hook_type: 'reflexivo',
      source: 'Thought Capture',
    })
    setSavedFormats(prev => new Set([...prev, key]))
  }

  const goToHub = () => navigate('/ideas')

  const isFavorited = (title) => favorites.some(f => f.type === 'thought' && f.title === title)
  const toggleFav = (title, content) => {
    const existing = favorites.find(f => f.type === 'thought' && f.title === title)
    if (existing) {
      removeFavorite(existing.id)
    } else {
      addFavorite({ type: 'thought', title, content, source: 'Thought Capture' })
    }
  }

  const charCount = thought.length
  const isReady = charCount >= 10

  return (
    <div className="flex h-full">
      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-gray-100 bg-white flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Thought Capture</h1>
              <p className="text-[10px] text-gray-400">Pensamentos → 7 formatos + frases virais</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-b border-gray-100 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Seu pensamento</label>
            <div className="relative">
              <textarea
                value={thought}
                onChange={e => setThought(e.target.value)}
                placeholder={"Tenho visto muita gente cansada de produzir conteúdo perfeito..."}
                className="w-full h-36 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300 leading-relaxed"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleCapture() }}
              />
              <span className={`absolute bottom-2 right-2.5 text-[10px] font-medium ${charCount === 0 ? 'text-gray-300' : isReady ? 'text-indigo-400' : 'text-amber-400'}`}>{charCount}</span>
            </div>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setShowThemeBank(v => !v)}
              className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wide hover:text-indigo-600 transition-colors py-0.5"
            >
              <span className="flex items-center gap-1"><Lightbulb size={11} /> Banco de temas</span>
              {showThemeBank ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showThemeBank && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 gap-1 p-1.5 bg-gray-50 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setThemeBankPersona('professional'); setThemeBankOpenCategory(null) }}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all ${themeBankPersona === 'professional' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => { setThemeBankPersona('personal'); setThemeBankOpenCategory(null) }}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all ${themeBankPersona === 'personal' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Pessoal · Do lado de cá
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                {(themeBankPersona === 'personal' ? PERSONAL_TEMAS_SUGESTOES : TEMAS_CARROSSEL).map(({ categoria, temas }) => {
                  const isCatOpen = themeBankOpenCategory === categoria
                  let visibleThemes = temas
                  if (themeBankPersona === 'personal') {
                    try {
                      const dismissed = JSON.parse(localStorage.getItem('cio-dismissed-personal-microthemes') || '[]')
                      if (Array.isArray(dismissed)) visibleThemes = temas.filter(tema => !dismissed.includes(tema))
                    } catch { /* usa todos */ }
                  }
                  return (
                    <div key={categoria}>
                      <button
                        type="button"
                        onClick={() => setThemeBankOpenCategory(isCatOpen ? null : categoria)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50 hover:bg-indigo-50 transition-colors text-left"
                      >
                        <span className="text-[10px] font-semibold text-gray-600">{categoria}</span>
                        {isCatOpen ? <ChevronUp size={11} className="text-indigo-500" /> : <ChevronDown size={11} className="text-gray-400" />}
                      </button>
                      {isCatOpen && (
                        <div className="px-2 py-1.5 space-y-0.5 bg-white">
                          {visibleThemes.map(tema => (
                            <button
                              key={tema}
                              type="button"
                              onClick={() => { setThought(tema); setShowThemeBank(false) }}
                              className="w-full text-left text-[11px] text-gray-700 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors leading-snug"
                            >
                              {tema}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nicho / contexto <span className="text-gray-300">(opcional)</span></label>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="ex: marketing digital, saúde mental..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tom</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${tone === t.value ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleCapture}
            disabled={loading || !isReady}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${loading ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed shadow-none' : isReady ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
          >
            {loading ? <><RefreshCw size={14} className="animate-spin" /> Capturando...</> : <><Sparkles size={14} /> Capturar Pensamento</>}
          </button>
          <p className="text-[10px] text-gray-400 text-center">Ctrl+Enter para enviar · Gera 7 formatos + frases virais</p>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {thoughtCaptures.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 pb-1">
                Capturados ({thoughtCaptures.length})
              </p>
              {thoughtCaptures.map(c => (
                <HistoryItem key={c.id} capture={c} onLoad={handleLoadCapture} onDelete={deleteThoughtCapture} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 opacity-60">
              <Clock size={24} className="text-gray-300 mx-auto" />
              <p className="text-xs text-gray-400">Seus pensamentos capturados<br />aparecem aqui</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: Results ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingView phase={loadPhase} />
        ) : result ? (
          <div className="p-6 space-y-6" ref={resultsRef}>

            {/* Core insight banner */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Zap size={14} className="text-indigo-500 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Essência capturada</p>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 font-medium">{result.emotional_angle}</span>
              </div>
              <p className="text-base font-semibold text-gray-900 leading-snug">"{result.core_insight}"</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                <Brain size={11} className="text-indigo-400" />
                <span className="text-gray-400 italic truncate max-w-xs">{currentThought}</span>
              </div>
              {result.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.hashtags.map((h, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-indigo-500 font-medium">#{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Post reflexivo ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3">Post Reflexivo</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 gap-5">
                {result.reflection_post && (
                  <ReflectionCard data={result.reflection_post} onSave={() => handleSaveFormat('reflection_post')} saved={savedFormats.has('reflection_post')} onOpenHub={goToHub} isFav={isFavorited('Post Reflexivo')} onToggleFav={() => toggleFav('Post Reflexivo', result.reflection_post.text)} onDislike={() => { addDislike({ title: result.save_as_idea?.title || 'Thought Capture', hook: result.core_insight, reason: 'post reflexivo desalinhado' }); setResult(r => ({ ...r, reflection_post: null })) }} />
                )}
              </div>
            </div>

            {/* Save all */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Plus size={15} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">Salvar no Hub</p>
                  <p className="text-[10px] text-gray-400">O post reflexivo vira uma ideia pronta pra produzir</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => ALL_FORMAT_KEYS.forEach(k => { if (!savedFormats.has(k)) handleSaveFormat(k) })}
                  disabled={savedFormats.size === ALL_FORMAT_KEYS.length}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${savedFormats.size === ALL_FORMAT_KEYS.length ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100'}`}
                >
                  {savedFormats.size === ALL_FORMAT_KEYS.length ? <><Check size={12} /> Salvo</> : <><Sparkles size={12} /> Salvar</>}
                </button>
                {savedFormats.size > 0 && (
                  <button onClick={goToHub} className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-orange-50 border border-orange-200 transition-all">
                    Abrir no Hub <ExternalLink size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Next step navigation */}
            <div className="flex items-center gap-2 flex-wrap mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 mr-1">{`Pr\u00f3ximo passo:`}</span>
              <button onClick={() => navigate('/generate')} className="text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-all flex items-center gap-1">
                <Sparkles size={11} /> Explorar ideias
              </button>
              <button onClick={() => navigate('/text')} className="text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all flex items-center gap-1">
                <Wand2 size={11} /> {`Escrever conte\u00fado`}
              </button>
              <button onClick={() => navigate('/presentation')} className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all flex items-center gap-1">
                <Mic size={11} /> {`Preparar apresenta\u00e7\u00e3o`}
              </button>
              <button onClick={() => navigate('/create')} className="text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all flex items-center gap-1">
                <ArrowLeft size={11} /> Voltar
              </button>
            </div>

          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center h-full py-20 px-10 space-y-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Brain size={36} className="text-indigo-400" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-lg font-bold text-gray-800">Capture seu próximo pensamento</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Escreva qualquer reflexão bruta — uma observação, frustração, algo que você notou hoje.
                O sistema transforma em <strong>7 formatos + frases virais</strong> adaptados para cada plataforma.
              </p>
            </div>
            {/* Examples */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {[
                '"Tenho visto muita gente cansada de produzir conteúdo perfeito."',
                '"Parece que todo mundo sabe o que quer fazer da vida, menos eu."',
                '"A maioria dos cursos ensina ferramenta. Ninguém ensina a pensar."',
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setThought(ex.replace(/^"|"$/g, ''))}
                  className="text-left p-3.5 rounded-xl border border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-xs text-gray-600 italic leading-relaxed shadow-sm"
                >
                  {ex}
                </button>
              ))}
            </div>
            {/* Format preview */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: AlignLeft, label: 'Post', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { icon: Video, label: 'Vídeo', color: 'text-violet-500', bg: 'bg-violet-50' },
                { icon: LayoutGrid, label: 'Carrossel', color: 'text-purple-500', bg: 'bg-purple-50' },
                { icon: BookOpen, label: 'Narrativa', color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
                { icon: Film, label: 'Reels', color: 'text-rose-500', bg: 'bg-rose-50' },
                { icon: Smartphone, label: 'Stories', color: 'text-pink-500', bg: 'bg-pink-50' },
                { icon: Music2, label: 'TikTok', color: 'text-zinc-600', bg: 'bg-zinc-100' },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 opacity-80">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
