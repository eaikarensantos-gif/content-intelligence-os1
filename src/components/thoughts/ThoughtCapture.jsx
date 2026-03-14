import { useState, useRef, useEffect } from 'react'
import {
  Brain, Sparkles, Copy, Check, Plus, Trash2,
  ChevronDown, ChevronUp, Clock, Layers,
  Video, AlignLeft, BookOpen, Zap,
  ArrowRight, RefreshCw, LayoutGrid, Mic,
} from 'lucide-react'
import useStore from '../../store/useStore'

// ─── Claude call ────────────────────────────────────────────────────────────
async function captureThought(apiKey, { thought, niche, tone }) {
  const toneInstruction = {
    reflexivo:   'Tom suave, introspectivo e pessoal.',
    provocador:  'Tom que questiona o status quo, que incomoda no bom sentido.',
    íntimo:      'Tom de confissão, diário, como se fosse escrito às 2 da manhã.',
    analítico:   'Tom racional e perspicaz, mas ainda humano e não acadêmico.',
  }[tone] || ''

  const prompt = `Você é um ghostwriter especialista em conteúdo autêntico para criadores digitais brasileiros.

O criador teve este pensamento bruto:
"${thought}"

${niche ? `Contexto / nicho: ${niche}` : ''}
${toneInstruction}

Transforme este pensamento em 4 formatos distintos de conteúdo.

PRINCÍPIOS ABSOLUTOS:
- Conteúdo humano, conversacional e reflexivo
- PROIBIDO: listas genéricas, "X dicas para...", "Como fazer em 5 passos", linguagem corporativa
- Cada formato deve girar em torno de UMA ideia central bem desenvolvida
- Tom: como se fosse escrito para um amigo próximo e inteligente
- Idioma: português brasileiro coloquial mas cuidadoso

FORMATO 1 — POST REFLEXIVO CURTO
- 200-400 palavras
- Sem bullets, sem tópicos numerados
- Uma ideia que se desenvolve naturalmente em parágrafos
- A última frase deve deixar algo ecoando na mente do leitor
- Tom: como um diário ou uma carta aberta

FORMATO 2 — PONTO DE FALA PARA VÍDEO
- Hook: 1 frase que para o scroll nos primeiros 3 segundos
- 3 pontos de desenvolvimento em linguagem falada (não lida)
- Encerramento que convida à reflexão, não à compra
- Estimativa de duração: 3-6 min

FORMATO 3 — ESTRUTURA DE CARROSSEL
- Slide 1: Afirmação ou pergunta que causa pausa (NUNCA "X dicas...")
- 4 slides de desenvolvimento: cada um com um headline provocativo e 1-2 frases
- Slide final: O insight central que o leitor vai querer salvar

FORMATO 4 — NARRATIVA (STORYTELLING)
- Situação: o cenário, o que todo mundo conhece
- Tensão: o conflito que existe mas quase ninguém nomeia
- Virada: o ponto de insight que muda a perspectiva
- Resolução: o que fica, o que muda, o que importa

Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "core_insight": "a essência do pensamento em 1 frase poderosa — a frase que o criador vai querer citar",
  "emotional_angle": "qual emoção central este conteúdo ativa (ex: alívio, reconhecimento, curiosidade, tensão saudável)",
  "reflection_post": {
    "text": "o post completo com parágrafos naturais, sem bullets",
    "opening_line": "a primeira frase exata do post",
    "closing_line": "a última frase/pergunta exata",
    "suggested_platform": "LinkedIn ou Instagram"
  },
  "video_talking_point": {
    "hook": "a frase exata de abertura para o vídeo",
    "talking_points": [
      "primeiro ponto em linguagem falada natural",
      "segundo ponto em linguagem falada natural",
      "terceiro ponto em linguagem falada natural"
    ],
    "closing": "encerramento natural do vídeo",
    "estimated_duration": "4-5 min",
    "suggested_platform": "YouTube ou TikTok"
  },
  "carousel": {
    "slide_1": "afirmação ou pergunta do primeiro slide",
    "slides": [
      { "headline": "headline provocativo", "body": "1-2 frases de desenvolvimento" },
      { "headline": "headline provocativo", "body": "1-2 frases de desenvolvimento" },
      { "headline": "headline provocativo", "body": "1-2 frases de desenvolvimento" },
      { "headline": "headline provocativo", "body": "1-2 frases de desenvolvimento" }
    ],
    "final_slide": "o insight central que o leitor vai salvar"
  },
  "storytelling": {
    "situation": "o cenário que todo mundo reconhece",
    "tension": "o conflito ou questionamento que raramente é nomeado",
    "turning_point": "o momento de insight ou mudança de perspectiva",
    "resolution": "o que fica — a conclusão que ressoa"
  },
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "save_as_idea": {
    "title": "título para salvar no Hub de Ideias",
    "description": "descrição do conceito em 1-2 frases",
    "platform": "plataforma principal",
    "format": "formato principal"
  }
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da API')
  return JSON.parse(match[0])
}

// ─── Loading phases ──────────────────────────────────────────────────────────
const PHASES = [
  { label: 'Capturando a essência...', icon: Brain, color: 'text-indigo-500' },
  { label: 'Estruturando os formatos...', icon: Layers, color: 'text-violet-500' },
  { label: 'Refinando o tom...', icon: Sparkles, color: 'text-purple-500' },
]

// ─── Format meta ─────────────────────────────────────────────────────────────
const FORMATS = [
  {
    key: 'reflection_post',
    label: 'Post Reflexivo',
    icon: AlignLeft,
    color: 'indigo',
    description: 'Texto corrido, pessoal, sem bullets',
    platform_field: 'suggested_platform',
  },
  {
    key: 'video_talking_point',
    label: 'Roteiro de Vídeo',
    icon: Video,
    color: 'violet',
    description: 'Hook + pontos de fala + encerramento',
    platform_field: 'suggested_platform',
  },
  {
    key: 'carousel',
    label: 'Estrutura de Carrossel',
    icon: LayoutGrid,
    color: 'purple',
    description: 'Slides com headline e desenvolvimento',
    platform_field: null,
  },
  {
    key: 'storytelling',
    label: 'Arco Narrativo',
    icon: BookOpen,
    color: 'fuchsia',
    description: 'Situação → Tensão → Virada → Resolução',
    platform_field: null,
  },
]

const COLOR_MAP = {
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'text-indigo-500',
    border: 'border-indigo-100',
    header: 'bg-indigo-50/60',
    dot: 'bg-indigo-400',
    btn: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: 'text-violet-500',
    border: 'border-violet-100',
    header: 'bg-violet-50/60',
    dot: 'bg-violet-400',
    btn: 'bg-violet-500 hover:bg-violet-600 text-white',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'text-purple-500',
    border: 'border-purple-100',
    header: 'bg-purple-50/60',
    dot: 'bg-purple-400',
    btn: 'bg-purple-500 hover:bg-purple-600 text-white',
  },
  fuchsia: {
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    icon: 'text-fuchsia-500',
    border: 'border-fuchsia-100',
    header: 'bg-fuchsia-50/60',
    dot: 'bg-fuchsia-400',
    btn: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white',
  },
}

// ─── Clipboard hook ──────────────────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ─── Format: Reflection Post ─────────────────────────────────────────────────
function ReflectionCard({ data, onSaveIdea, saved, apiKey }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.indigo
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-4 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <AlignLeft size={15} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Post Reflexivo</span>
          {data.suggested_platform && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{data.suggested_platform}</span>
          )}
        </div>
        <button
          onClick={() => copy(data.text, 'post')}
          className="btn-secondary text-xs py-1 px-2.5"
        >
          {copiedKey === 'post' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
        </button>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Opening line highlight */}
        <div className={`rounded-xl p-3 border ${c.border} bg-indigo-50/30`}>
          <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide mb-1">Primeira frase</p>
          <p className="text-xs text-gray-700 italic">"{data.opening_line}"</p>
        </div>
        {/* Full text */}
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.text}</p>
        {/* Closing line */}
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Encerramento</p>
          <p className="text-xs text-gray-600 italic">"{data.closing_line}"</p>
        </div>
        <button
          onClick={onSaveIdea}
          disabled={saved}
          className={`w-full text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
            saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : `${c.btn}`
          }`}
        >
          {saved ? <><Check size={12} /> Salvo no Hub</> : <><Plus size={12} /> Salvar no Hub de Ideias</>}
        </button>
      </div>
    </div>
  )
}

// ─── Format: Video Talking Point ─────────────────────────────────────────────
function VideoCard({ data, onSaveIdea, saved }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.violet
  const fullScript = [
    `HOOK: ${data.hook}`,
    '',
    data.talking_points?.map((p, i) => `${i + 1}. ${p}`).join('\n'),
    '',
    `ENCERRAMENTO: ${data.closing}`,
  ].join('\n')

  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-4 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <Video size={15} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Roteiro de Vídeo</span>
          {data.suggested_platform && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{data.suggested_platform}</span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{data.estimated_duration}</span>
        </div>
        <button onClick={() => copy(fullScript, 'video')} className="btn-secondary text-xs py-1 px-2.5">
          {copiedKey === 'video' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Hook */}
        <div className="rounded-xl p-3.5 bg-violet-50 border border-violet-200">
          <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wide mb-1.5">🎙 Hook de abertura</p>
          <p className="text-sm font-semibold text-gray-800">"{data.hook}"</p>
        </div>
        {/* Talking points */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Pontos de fala</p>
          {(data.talking_points || []).map((p, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-600 shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-xs text-gray-700 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
        {/* Closing */}
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Encerramento</p>
          <p className="text-xs text-gray-600 italic">{data.closing}</p>
        </div>
        <button
          onClick={onSaveIdea}
          disabled={saved}
          className={`w-full text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
            saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : `${c.btn}`
          }`}
        >
          {saved ? <><Check size={12} /> Salvo no Hub</> : <><Plus size={12} /> Salvar no Hub de Ideias</>}
        </button>
      </div>
    </div>
  )
}

// ─── Format: Carousel ────────────────────────────────────────────────────────
function CarouselCard({ data, onSaveIdea, saved }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.purple
  const allSlides = [
    `SLIDE 1 (CAPA): ${data.slide_1}`,
    ...(data.slides || []).map((s, i) => `\nSLIDE ${i + 2}:\n${s.headline}\n${s.body}`),
    `\nSLIDE FINAL:\n${data.final_slide}`,
  ].join('\n')

  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-4 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <LayoutGrid size={15} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Estrutura de Carrossel</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{(data.slides?.length || 0) + 2} slides</span>
        </div>
        <button onClick={() => copy(allSlides, 'carousel')} className="btn-secondary text-xs py-1 px-2.5">
          {copiedKey === 'carousel' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
        </button>
      </div>
      <div className="px-5 py-4 space-y-2">
        {/* Slide 1 */}
        <div className="rounded-xl p-3.5 bg-purple-50 border border-purple-200">
          <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wide mb-1">Slide 1 — Capa</p>
          <p className="text-sm font-bold text-gray-800">"{data.slide_1}"</p>
        </div>
        {/* Development slides */}
        <div className="grid grid-cols-2 gap-2">
          {(data.slides || []).map((s, i) => (
            <div key={i} className="rounded-xl p-3 border border-gray-100 bg-gray-50/80 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-600 shrink-0">{i + 2}</div>
                <p className="text-[11px] font-semibold text-gray-800 leading-tight">{s.headline}</p>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        {/* Final slide */}
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200">
          <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wide mb-1">Slide Final — Insight Central</p>
          <p className="text-xs font-semibold text-gray-800">"{data.final_slide}"</p>
        </div>
        <button
          onClick={onSaveIdea}
          disabled={saved}
          className={`w-full text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
            saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : `${c.btn}`
          }`}
        >
          {saved ? <><Check size={12} /> Salvo no Hub</> : <><Plus size={12} /> Salvar no Hub de Ideias</>}
        </button>
      </div>
    </div>
  )
}

// ─── Format: Storytelling ────────────────────────────────────────────────────
function StorytellingCard({ data, onSaveIdea, saved }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.fuchsia
  const STEPS = [
    { key: 'situation', label: 'Situação', color: 'bg-blue-50 border-blue-200', labelColor: 'text-blue-500', num: '01' },
    { key: 'tension', label: 'Tensão', color: 'bg-orange-50 border-orange-200', labelColor: 'text-orange-500', num: '02' },
    { key: 'turning_point', label: 'Virada', color: 'bg-fuchsia-50 border-fuchsia-200', labelColor: 'text-fuchsia-500', num: '03' },
    { key: 'resolution', label: 'Resolução', color: 'bg-emerald-50 border-emerald-200', labelColor: 'text-emerald-600', num: '04' },
  ]
  const fullStory = STEPS.map(s => `${s.label.toUpperCase()}:\n${data[s.key]}`).join('\n\n')

  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-4 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <BookOpen size={15} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Arco Narrativo</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>4 partes</span>
        </div>
        <button onClick={() => copy(fullStory, 'story')} className="btn-secondary text-xs py-1 px-2.5">
          {copiedKey === 'story' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
        </button>
      </div>
      <div className="px-5 py-4 space-y-2.5">
        {STEPS.map((step, i) => (
          <div key={step.key} className={`rounded-xl p-3.5 border ${step.color} space-y-1`}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-300">{step.num}</span>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${step.labelColor}`}>{step.label}</p>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{data[step.key]}</p>
          </div>
        ))}
        <button
          onClick={onSaveIdea}
          disabled={saved}
          className={`w-full text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
            saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : `${c.btn}`
          }`}
        >
          {saved ? <><Check size={12} /> Salvo no Hub</> : <><Plus size={12} /> Salvar no Hub de Ideias</>}
        </button>
      </div>
    </div>
  )
}

// ─── Thought history item ────────────────────────────────────────────────────
function HistoryItem({ capture, onLoad, onDelete }) {
  return (
    <div className="group flex items-start gap-2.5 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
      onClick={() => onLoad(capture)}>
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

// ─── Loading animation ───────────────────────────────────────────────────────
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
        <p className="text-xs text-gray-400">Transformando seu pensamento em conteúdo...</p>
      </div>
      {/* Phase dots */}
      <div className="flex items-center gap-3">
        {PHASES.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              i < phase ? 'bg-indigo-500' : i === phase ? 'bg-indigo-400 scale-125 animate-pulse' : 'bg-gray-200'
            }`} />
            {i < PHASES.length - 1 && (
              <div className={`h-0.5 w-8 transition-all duration-700 ${i < phase ? 'bg-indigo-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 justify-center opacity-60">
        {PHASES.map((p, i) => (
          <span key={i} className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-300 ${
            i === phase ? 'bg-indigo-50 text-indigo-600 border-indigo-200 opacity-100' : 'bg-gray-50 text-gray-400 border-gray-100'
          }`}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const TONE_OPTIONS = [
  { value: 'reflexivo', label: 'Reflexivo', emoji: '🌿' },
  { value: 'provocador', label: 'Provocador', emoji: '⚡' },
  { value: 'íntimo', label: 'Íntimo', emoji: '🌙' },
  { value: 'analítico', label: 'Analítico', emoji: '🔍' },
]

export default function ThoughtCapture() {
  const { thoughtCaptures, addThoughtCapture, deleteThoughtCapture, addIdea } = useStore()

  const [thought, setThought] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('reflexivo')
  const [loading, setLoading] = useState(false)
  const [loadPhase, setLoadPhase] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [currentThought, setCurrentThought] = useState('')
  const [savedFormats, setSavedFormats] = useState(new Set())

  const phaseRef = useRef(null)
  const resultsRef = useRef(null)

  const apiKey = localStorage.getItem('cio-anthropic-key')

  // Phase animation
  const startPhases = () => {
    setLoadPhase(0)
    let p = 0
    phaseRef.current = setInterval(() => {
      p += 1
      if (p >= PHASES.length) {
        clearInterval(phaseRef.current)
      } else {
        setLoadPhase(p)
      }
    }, 1800)
  }
  useEffect(() => () => clearInterval(phaseRef.current), [])

  const handleCapture = async () => {
    if (!thought.trim() || thought.trim().length < 10) {
      setError('Escreva ao menos 10 caracteres para capturar.')
      return
    }
    if (!apiKey) {
      setError('Chave da API Anthropic não configurada. Vá em Configurações.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    setSavedFormats(new Set())
    setCurrentThought(thought)
    startPhases()
    try {
      const data = await captureThought(apiKey, { thought: thought.trim(), niche, tone })
      setResult(data)
      addThoughtCapture({ thought: thought.trim(), niche, tone, result: data })
      // Scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(phaseRef.current)
      setLoading(false)
    }
  }

  const handleLoadCapture = (capture) => {
    setThought(capture.thought)
    setNiche(capture.niche || '')
    setTone(capture.tone || 'reflexivo')
    setResult(capture.result)
    setCurrentThought(capture.thought)
    setSavedFormats(new Set())
  }

  const handleSaveFormat = (formatKey) => {
    if (!result?.save_as_idea) return
    const formatLabels = {
      reflection_post: 'post reflexivo',
      video_talking_point: 'roteiro de vídeo',
      carousel: 'carrossel',
      storytelling: 'arco narrativo',
    }
    addIdea({
      title: result.save_as_idea.title,
      description: `${result.save_as_idea.description} [${formatLabels[formatKey]}]`,
      platform: result.save_as_idea.platform || 'Instagram',
      format: formatKey === 'carousel' ? 'carrossel' : formatKey === 'video_talking_point' ? 'video' : 'post',
      status: 'idea',
      tags: ['thought-capture', formatLabels[formatKey], ...(result.hashtags || []).slice(0, 2)],
      hook_type: 'reflexivo',
    })
    setSavedFormats(prev => new Set([...prev, formatKey]))
  }

  const charCount = thought.length
  const isReady = charCount >= 10

  return (
    <div className="flex h-full">
      {/* ── Left: Input + History ─────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-gray-100 bg-white flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Thought Capture</h1>
              <p className="text-[10px] text-gray-400">Pensamentos → Conteúdo real</p>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-b border-gray-100 space-y-3">
          {/* Textarea */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Seu pensamento</label>
            <div className="relative">
              <textarea
                value={thought}
                onChange={e => setThought(e.target.value)}
                placeholder={"Tenho visto muita gente cansada de produzir conteúdo perfeito..."}
                className="w-full h-36 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300 leading-relaxed"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) handleCapture()
                }}
              />
              <span className={`absolute bottom-2 right-2.5 text-[10px] font-medium ${
                charCount === 0 ? 'text-gray-300' : isReady ? 'text-indigo-400' : 'text-amber-400'
              }`}>{charCount}</span>
            </div>
          </div>

          {/* Niche */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nicho / contexto <span className="text-gray-300">(opcional)</span></label>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="ex: marketing digital, saúde mental, empreendedorismo..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300"
            />
          </div>

          {/* Tone */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tom</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    tone === t.value
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleCapture}
            disabled={loading || !isReady}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              loading
                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed shadow-none'
                : isReady
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-indigo-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> Capturando...</>
              : <><Sparkles size={14} /> Capturar Pensamento</>
            }
          </button>
          <p className="text-[10px] text-gray-400 text-center">Ctrl+Enter para enviar</p>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {thoughtCaptures.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 pb-1">
                Pensamentos capturados ({thoughtCaptures.length})
              </p>
              {thoughtCaptures.map(c => (
                <HistoryItem
                  key={c.id}
                  capture={c}
                  onLoad={handleLoadCapture}
                  onDelete={deleteThoughtCapture}
                />
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

      {/* ── Right: Results ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingView phase={loadPhase} />
        ) : result ? (
          <div className="p-6 space-y-6" ref={resultsRef}>
            {/* Core insight banner */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-indigo-500 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Essência capturada</p>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 font-medium">
                  {result.emotional_angle}
                </span>
              </div>
              <p className="text-base font-semibold text-gray-900 leading-snug">"{result.core_insight}"</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <Brain size={11} className="text-indigo-400" />
                <span>Pensamento original:</span>
                <span className="text-gray-400 italic truncate max-w-xs">{currentThought}</span>
              </div>
              {/* Hashtags */}
              {result.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.hashtags.map((h, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-indigo-500 font-medium">#{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* 4 format cards in 2x2 grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ReflectionCard
                data={result.reflection_post}
                onSaveIdea={() => handleSaveFormat('reflection_post')}
                saved={savedFormats.has('reflection_post')}
              />
              <VideoCard
                data={result.video_talking_point}
                onSaveIdea={() => handleSaveFormat('video_talking_point')}
                saved={savedFormats.has('video_talking_point')}
              />
              <CarouselCard
                data={result.carousel}
                onSaveIdea={() => handleSaveFormat('carousel')}
                saved={savedFormats.has('carousel')}
              />
              <StorytellingCard
                data={result.storytelling}
                onSaveIdea={() => handleSaveFormat('storytelling')}
                saved={savedFormats.has('storytelling')}
              />
            </div>

            {/* Save all banner */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Plus size={15} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">Salvar todos os formatos no Hub</p>
                  <p className="text-[10px] text-gray-400">Cada formato vira uma ideia separada para produzir</p>
                </div>
              </div>
              <button
                onClick={() => ['reflection_post','video_talking_point','carousel','storytelling'].forEach(k => {
                  if (!savedFormats.has(k)) handleSaveFormat(k)
                })}
                disabled={savedFormats.size === 4}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0 ${
                  savedFormats.size === 4
                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100'
                }`}
              >
                {savedFormats.size === 4 ? <><Check size={12} /> Todos salvos</> : <><Sparkles size={12} /> Salvar todos</>}
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
                Escreva qualquer reflexão bruta — uma observação, uma frustração, algo que você notou hoje.
                O sistema transforma em 4 formatos de conteúdo prontos para produzir.
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
            <div className="flex items-center gap-6 text-center">
              {[
                { icon: AlignLeft, label: 'Post reflexivo', color: 'text-indigo-500' },
                { icon: Video, label: 'Roteiro de vídeo', color: 'text-violet-500' },
                { icon: LayoutGrid, label: 'Carrossel', color: 'text-purple-500' },
                { icon: BookOpen, label: 'Arco narrativo', color: 'text-fuchsia-500' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 opacity-70">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
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
