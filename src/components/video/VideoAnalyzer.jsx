import { useState, useEffect } from 'react'
import {
  Video, Link2, ChevronRight, BookOpen,
  Lightbulb, Layers, Clock, Eye, Copy, Check,
  Sparkles, Trash2, RotateCcw, ExternalLink,
  Mic, Film, Zap, Target, TrendingUp, Star,
  Plus, FileVideo, AlertCircle, Key, X, ShieldCheck,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { analyzeVideo, extractYouTubeId, getYouTubeThumbnail } from '../../utils/videoAnalyzer'

const LS_KEY = 'cio-anthropic-key'

const TABS = [
  { id: 'estrutura', label: 'Estrutura', icon: Layers },
  { id: 'tom', label: 'Tom & PadrÃµes', icon: Mic },
  { id: 'retencao', label: 'RetenÃ§Ã£o', icon: Eye },
  { id: 'template', label: 'Template', icon: BookOpen },
  { id: 'ideias', label: 'Ideias', icon: Lightbulb },
]

const TYPE_OPTIONS = [
  { value: 'auto', label: 'Detectar automaticamente' },
  { value: 'educational', label: 'Educacional / Tutorial' },
  { value: 'storytelling', label: 'Storytelling / Pessoal' },
  { value: 'contrarian', label: 'ContrÃ¡rio / OpiniÃ£o' },
  { value: 'listicle', label: 'Lista / Breakdown' },
]

const ARCHETYPE_COLORS = {
  educational: 'bg-blue-100 text-blue-700 border-blue-200',
  storytelling: 'bg-purple-100 text-purple-700 border-purple-200',
  contrarian: 'bg-red-100 text-red-700 border-red-200',
  listicle: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const ARCHETYPE_LABELS = {
  educational: 'Educacional', storytelling: 'Storytelling',
  contrarian: 'ContrÃ¡rio', listicle: 'Lista',
}

// â”€â”€ Fetches YouTube oEmbed metadata (no API key needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchYouTubeMeta(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
    if (!res.ok) return null
    const data = await res.json()
    return { title: data.title, channel: data.author_name }
  } catch {
    return null
  }
}

// â”€â”€ Calls Claude API directly from browser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function callClaudeAPI(apiKey, prompt) {
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
      max_tokens: 4000,
      system: 'You are a video content analysis API for content creators. You ALWAYS respond with a valid JSON object only â€” no text before, no text after, no markdown, no apologies, no refusals. You cannot watch videos but you analyze them based on titles, channel names, and your training knowledge. You NEVER say you cannot do something â€” you always produce the analysis JSON. Your entire response must start with { and end with } and be parseable by JSON.parse().',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Erro ${res.status}`)
  }
  const data = await res.json()
  return data.content[0].text
}

// â”€â”€ Builds the Claude analysis prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildPrompt({ url, title, channel, topic, videoType }) {
  return `You are a professional video content analyst helping content creators deconstruct videos to learn from them.

Video info provided:
- URL: ${url || '(not provided)'}
- Title: ${title || '(not provided)'}
- Channel/Creator: ${channel || '(not provided)'}
- Topic: ${topic || '(not provided)'}
- Type: ${videoType !== 'auto' ? videoType : 'auto-detect'}

IMPORTANT INSTRUCTIONS:
- You cannot access or watch the video URL. That is fine and expected.
- Use the title, channel name, and your training knowledge about this creator/video to build the analysis.
- If you recognize this creator or video from your training data, describe their real style, tone, and typical structure.
- If you don't recognize the video, build a realistic and specific analysis based on the title, channel name, and topic â€” make it feel like it was written specifically for this content, not a generic template.
- You MUST always return an analysis â€” never refuse, never apologize, never say you cannot access the URL.
- The analysis should feel tailored: reference the title, the creator's name, the topic.
- Respond with ONLY the JSON object below. No text before it, no text after it, no markdown fences.

{
  "archetype": "educational|storytelling|contrarian|listicle",
  "structure": {
    "hook": {
      "type": "Hook type name specific to this video",
      "description": "How this specific video opens and hooks the viewer in the first seconds",
      "example": "Faithful reconstruction of what this creator likely says/does in the hook",
      "duration": "0:00â€“0:XX",
      "effectiveness": "Why this specific hook works for this content and audience"
    },
    "context": {
      "description": "How this video establishes credibility or context before the main content",
      "example": "Reconstruction of how the creator positions themselves in this video"
    },
    "main_points": [
      { "point": "Point name", "description": "What this specific video covers at this point", "duration": "X:XXâ€“X:XX" },
      { "point": "Point name", "description": "What this specific video covers at this point", "duration": "X:XXâ€“X:XX" },
      { "point": "Point name", "description": "What this specific video covers at this point", "duration": "X:XXâ€“X:XX" },
      { "point": "Point name", "description": "What this specific video covers at this point", "duration": "X:XXâ€“X:XX" }
    ],
    "closing": {
      "description": "How this video specifically wraps up",
      "example": "Reconstruction of this video's closing",
      "duration": "Last X min"
    },
    "cta": {
      "description": "The specific call-to-action in this video",
      "example": "Reconstruction of the CTA",
      "type": "CTA type (subscribe/next video/product/comment)"
    }
  },
  "tone": {
    "primary": "Primary tone of this video",
    "secondary": "Secondary tone of this video",
    "description": "Specific description of the communication style in this video",
    "markers": ["Tone marker specific to this video", "Tone marker", "Tone marker", "Tone marker"],
    "voice_characteristics": "Specific voice/persona characteristics of this creator in this video"
  },
  "patterns": [
    { "name": "Pattern name", "description": "How it appears in this specific video", "why_effective": "Why it works in this context" },
    { "name": "Pattern name", "description": "How it appears in this specific video", "why_effective": "Why it works in this context" },
    { "name": "Pattern name", "description": "How it appears in this specific video", "why_effective": "Why it works in this context" },
    { "name": "Pattern name", "description": "How it appears in this specific video", "why_effective": "Why it works in this context" }
  ],
  "retention": [
    { "technique": "Technique name", "description": "How it is used in this specific video", "example": "Specific moment or excerpt from this video" },
    { "technique": "Technique name", "description": "How it is used in this specific video", "example": "Specific moment or excerpt from this video" },
    { "technique": "Technique name", "description": "How it is used in this specific video", "example": "Specific moment or excerpt from this video" },
    { "technique": "Technique name", "description": "How it is used in this specific video", "example": "Specific moment or excerpt from this video" },
    { "technique": "Technique name", "description": "How it is used in this specific video", "example": "Specific moment or excerpt from this video" }
  ],
  "visual": {
    "text_style": "On-screen text style specific to this video/creator",
    "editing_style": "Editing style specific to this video",
    "pacing": "Pacing specific to this video",
    "key_techniques": ["visual technique 1", "visual technique 2", "visual technique 3", "visual technique 4"]
  },
  "why_it_works": [
    { "reason": "Specific reason for this video", "impact": "Impact on this video's performance" },
    { "reason": "Specific reason for this video", "impact": "Impact on this video's performance" },
    { "reason": "Specific reason for this video", "impact": "Impact on this video's performance" },
    { "reason": "Specific reason for this video", "impact": "Impact on this video's performance" }
  ],
  "template": {
    "name": "Template name derived from this specific video",
    "hook_formula": "Hook formula based on this video's actual hook",
    "hook_example": "Example of applying this template to a different topic",
    "opening_formula": "Opening formula based on this video",
    "sections": [
      { "name": "Section 1", "duration": "Xâ€“X min", "goal": "What this section achieves in this video" },
      { "name": "Section 2", "duration": "Xâ€“X min", "goal": "What this section achieves in this video" },
      { "name": "Section 3", "duration": "Xâ€“X min", "goal": "What this section achieves in this video" },
      { "name": "Section 4", "duration": "Xâ€“X min", "goal": "What this section achieves in this video" }
    ],
    "closing_formula": "Closing formula based on this video",
    "tips": ["Tip derived from this video", "Tip derived from this video", "Tip derived from this video", "Tip derived from this video"]
  },
  "content_ideas": [
    { "title": "Idea inspired by this specific video", "format": "carrossel|video|reel|thread|image", "platform": "linkedin|instagram|youtube|twitter|tiktok", "hook_type": "hook type", "angle": "Specific angle inspired by this video" },
    { "title": "Idea inspired by this specific video", "format": "carrossel|video|reel|thread|image", "platform": "linkedin|instagram|youtube|twitter|tiktok", "hook_type": "hook type", "angle": "Specific angle inspired by this video" },
    { "title": "Idea inspired by this specific video", "format": "carrossel|video|reel|thread|image", "platform": "linkedin|instagram|youtube|twitter|tiktok", "hook_type": "hook type", "angle": "Specific angle inspired by this video" },
    { "title": "Idea inspired by this specific video", "format": "carrossel|video|reel|thread|image", "platform": "linkedin|instagram|youtube|twitter|tiktok", "hook_type": "hook type", "angle": "Specific angle inspired by this video" },
    { "title": "Idea inspired by this specific video", "format": "carrossel|video|reel|thread|image", "platform": "linkedin|instagram|youtube|twitter|tiktok", "hook_type": "hook type", "angle": "Specific angle inspired by this video" },
    { "title": "Idea inspired by this specific video", "format": "carrossel|video|reel|thread|image", "platform": "linkedin|instagram|youtube|twitter|tiktok", "hook_type": "hook type", "angle": "Specific angle inspired by this video" }
  ]
}`
}
// â”€â”€ API Key Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ApiKeyModal({ onClose, onSave }) {
  const [val, setVal] = useState('')
  const [show, setShow] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-violet-500" />
            <h2 className="text-sm font-bold text-gray-900">API Key da Anthropic</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-start gap-2">
          <ShieldCheck size={14} className="text-violet-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">
            Sua chave fica salva <strong>apenas no seu navegador</strong> (localStorage). Ela nunca Ã© enviada para nenhum servidor alÃ©m da API da Anthropic.
          </p>
        </div>

        <div>
          <label className="label">Cole sua API Key</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-16"
              placeholder="sk-ant-api03-..."
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button
              onClick={() => setShow((x) => !x)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Obtenha sua chave em{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
              console.anthropic.com
            </a>
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { if (val.trim()) { onSave(val.trim()); onClose() } }}
            disabled={!val.trim()}
            className="btn-primary flex-1"
            style={{ background: val.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : undefined }}
          >
            <Key size={13} /> Salvar Chave
          </button>
        </div>
      </div>
    </div>
  )
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function VideoAnalyzer() {
  const addVideoAnalysis = useStore((s) => s.addVideoAnalysis)
  const deleteVideoAnalysis = useStore((s) => s.deleteVideoAnalysis)
  const videoAnalyses = useStore((s) => s.videoAnalyses)
  const addIdea = useStore((s) => s.addIdea)

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [showKeyModal, setShowKeyModal] = useState(false)

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [videoType, setVideoType] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [analysis, setAnalysis] = useState(null)
  const [analysisSource, setAnalysisSource] = useState('') // 'ai' | 'simulation'
  const [activeTab, setActiveTab] = useState('estrutura')
  const [copied, setCopied] = useState(false)
  const [savedIdeas, setSavedIdeas] = useState(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [savedAnalysis, setSavedAnalysis] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const ytId = extractYouTubeId(url)
  const thumbnail = ytId ? getYouTubeThumbnail(ytId) : null

  const handleSaveKey = (key) => {
    localStorage.setItem(LS_KEY, key)
    setApiKey(key)
  }

  const handleRemoveKey = () => {
    localStorage.removeItem(LS_KEY)
    setApiKey('')
  }

  const STEPS = [
    'Buscando metadados do vÃ­deo...',
    'Enviando para anÃ¡lise com IA...',
    'Identificando estrutura narrativa...',
    'Detectando tom, padrÃµes e retenÃ§Ã£o...',
    'Gerando template e ideias...',
  ]

  const handleAnalyze = async () => {
    if (!url.trim() && !title.trim()) return
    setLoading(true)
    setAnalysis(null)
    setError('')
    setSavedIdeas(new Set())
    setSavedAnalysis(false)
    setLoadingStep(0)

    try {
      // Step 1 â€” fetch YouTube metadata
      setLoadingStep(0)
      let metaTitle = title
      let channel = ''
      if (url.trim()) {
        const meta = await fetchYouTubeMeta(url)
        if (meta) {
          if (!title.trim()) metaTitle = meta.title
          channel = meta.channel
        }
      }

      if (apiKey) {
        // â”€â”€ REAL AI ANALYSIS â”€â”€
        setLoadingStep(1)
        const prompt = buildPrompt({ url, title: metaTitle, channel, topic, videoType })
        setLoadingStep(2)
        const raw = await callClaudeAPI(apiKey, prompt)
        setLoadingStep(3)
        // Extract JSON â€” find the first { ... } block even if Claude adds text around it
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('A IA nÃ£o retornou uma anÃ¡lise estruturada. Tente novamente.')
        const result = JSON.parse(jsonMatch[0])
        setLoadingStep(4)
        await new Promise((r) => setTimeout(r, 400))
        setAnalysis(result)
        setAnalysisSource('ai')
        if (metaTitle && !title) setTitle(metaTitle)
      } else {
        // â”€â”€ SIMULATION FALLBACK â”€â”€
        setLoadingStep(2)
        await new Promise((r) => setTimeout(r, 800))
        setLoadingStep(3)
        await new Promise((r) => setTimeout(r, 600))
        const result = analyzeVideo({ url, title: metaTitle || title, topic, videoType })
        setLoadingStep(4)
        await new Promise((r) => setTimeout(r, 400))
        setAnalysis(result)
        setAnalysisSource('simulation')
        if (metaTitle && !title) setTitle(metaTitle)
      }
    } catch (e) {
      setError(e.message || 'Erro inesperado. Verifique sua API key e tente novamente.')
    } finally {
      setActiveTab('estrutura')
      setLoading(false)
    }
  }

  const handleReset = () => {
    setUrl(''); setTitle(''); setTopic(''); setVideoType('auto')
    setAnalysis(null); setSavedIdeas(new Set()); setSavedAnalysis(false); setError('')
  }

  const handleSaveAnalysis = () => {
    if (!analysis) return
    addVideoAnalysis({ url, title, topic, videoType, result: analysis, source: analysisSource, analyzed_at: new Date().toISOString() })
    setSavedAnalysis(true)
  }

  const handleSaveIdea = (idea) => {
    addIdea({
      title: idea.title,
      description: `Inspirado em anÃ¡lise de vÃ­deo de referÃªncia${topic ? ` sobre "${topic}"` : ''}.`,
      format: idea.format, platform: idea.platform,
      hook_type: idea.hook_type, topic: topic || '',
      priority: 'medium', status: 'idea',
      tags: ['video-referencia', idea.angle?.toLowerCase().split(' ')[0]].filter(Boolean),
    })
    setSavedIdeas((s) => new Set([...s, idea.title]))
  }

  const handleCopyTemplate = () => {
    if (!analysis?.template) return
    const t = analysis.template
    const text = [
      `# ${t.name}`, '',
      `## FÃ³rmula do Gancho`, t.hook_formula, `Exemplo: ${t.hook_example}`, '',
      `## Abertura`, t.opening_formula, '',
      `## Estrutura de SeÃ§Ãµes`,
      ...t.sections.map((s) => `- **${s.name}** (${s.duration}): ${s.goal}`), '',
      `## Fechamento`, t.closing_formula, '',
      `## Dicas`, ...t.tips.map((tip) => `â€¢ ${tip}`),
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const loadSavedAnalysis = (saved) => {
    setUrl(saved.url || ''); setTitle(saved.title || ''); setTopic(saved.topic || '')
    setVideoType(saved.videoType || 'auto'); setAnalysis(saved.result)
    setAnalysisSource(saved.source || 'simulation')
    setActiveTab('estrutura'); setSavedIdeas(new Set()); setSavedAnalysis(true); setShowHistory(false)
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} onSave={handleSaveKey} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-200">
            <Video size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Analisador de VÃ­deos de ReferÃªncia</h1>
            <p className="text-xs text-gray-400">Desconstrua qualquer vÃ­deo com IA real â€” estrutura, tom, padrÃµes, template e ideias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* API Key status */}
          {apiKey ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <ShieldCheck size={12} />
              <span>IA ativa</span>
              <button onClick={handleRemoveKey} className="ml-1 text-emerald-400 hover:text-red-400 transition-colors" title="Remover chave">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowKeyModal(true)} className="btn-secondary text-xs border-violet-200 text-violet-600 hover:bg-violet-50">
              <Key size={12} /> Adicionar API Key
            </button>
          )}
          {videoAnalyses.length > 0 && (
            <button onClick={() => setShowHistory((x) => !x)} className="btn-secondary text-xs">
              <Clock size={13} /> HistÃ³rico ({videoAnalyses.length})
            </button>
          )}
          {analysis && (
            <button onClick={handleReset} className="btn-secondary text-xs">
              <RotateCcw size={13} /> Nova AnÃ¡lise
            </button>
          )}
        </div>
      </div>

      {/* No API key banner */}
      {!apiKey && !analysis && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-800 mb-0.5">Modo simulaÃ§Ã£o ativo</p>
            <p className="text-xs text-gray-500">
              Sem API Key, a anÃ¡lise Ã© gerada por templates â€” nÃ£o lÃª o vÃ­deo de verdade.{' '}
              <button onClick={() => setShowKeyModal(true)} className="text-violet-600 hover:underline font-medium">
                Adicione sua chave da Anthropic
              </button>{' '}
              para anÃ¡lise real com IA (grÃ¡tis com crÃ©ditos do plano).
            </p>
          </div>
        </div>
      )}

      {/* History panel */}
      {showHistory && videoAnalyses.length > 0 && (
        <div className="card p-4 space-y-2 animate-slide-up border border-violet-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AnÃ¡lises Salvas</h3>
          {videoAnalyses.map((saved) => (
            <div key={saved.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-violet-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Video size={14} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{saved.title || saved.url || 'AnÃ¡lise sem tÃ­tulo'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400">{new Date(saved.analyzed_at).toLocaleDateString('pt-BR')}</p>
                  <span className={`text-[10px] font-medium ${saved.source === 'ai' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {saved.source === 'ai' ? 'âœ¦ IA real' : 'â—Œ SimulaÃ§Ã£o'}
                  </span>
                </div>
              </div>
              <button onClick={() => loadSavedAnalysis(saved)} className="text-xs text-violet-600 hover:text-violet-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Abrir</button>
              <button onClick={() => deleteVideoAnalysis(saved.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input card */}
      {!analysis && !loading && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: URL + thumbnail + file */}
            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <Link2 size={12} className="text-gray-400" /> URL do VÃ­deo
                </label>
                <input
                  className="input"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
              </div>

              {thumbnail && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                  <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white ml-1" />
                    </div>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setTitle(f.name.replace(/\.[^/.]+$/, '')) }}
                onClick={() => document.getElementById('video-file-input').click()}
              >
                <input id="video-file-input" type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setTitle(f.name.replace(/\.[^/.]+$/, '')) }} />
                <FileVideo size={22} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-medium">Arraste um vÃ­deo ou clique para selecionar</p>
                <p className="text-[10px] text-gray-300 mt-0.5">O nome do arquivo serÃ¡ usado como tÃ­tulo</p>
              </div>
            </div>

            {/* Right: context fields */}
            <div className="space-y-4">
              <div>
                <label className="label">TÃ­tulo do VÃ­deo <span className="text-gray-400 font-normal">(preenchido automaticamente para YouTube)</span></label>
                <input className="input" placeholder="Ex: Como Construir uma AudiÃªncia do Zero" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="label">TÃ³pico Principal</label>
                <input className="input" placeholder="Ex: marca pessoal, produtividade, vendas..." value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div>
                <label className="label">Tipo de VÃ­deo</label>
                <select className="select" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                  <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!url.trim() && !title.trim()}
                className="btn-primary w-full"
                style={{ background: (!url.trim() && !title.trim()) ? undefined : apiKey ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : undefined }}
              >
                {apiKey ? <><Sparkles size={14} /> Analisar com IA</> : <><Video size={14} /> Analisar (simulaÃ§Ã£o)</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-16 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-violet-500" />
          </div>
          <div className="text-center space-y-1.5">
            {STEPS.map((step, i) => (
              <p key={i} className={`text-sm transition-all duration-300 ${i === loadingStep ? 'font-semibold text-gray-800' : i < loadingStep ? 'text-gray-300 line-through' : 'text-gray-300'}`}>
                {i < loadingStep ? 'âœ“ ' : i === loadingStep ? 'âŸ³ ' : ''}{step}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Analysis result */}
      {analysis && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Result header */}
          <div className="card p-4 flex items-center gap-4 flex-wrap border border-violet-100">
            {thumbnail && <img src={thumbnail} alt="thumb" className="w-20 h-12 object-cover rounded-lg shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`chip border text-[10px] ${ARCHETYPE_COLORS[analysis.archetype] || ''}`}>
                  {ARCHETYPE_LABELS[analysis.archetype]}
                </span>
                {analysisSource === 'ai' ? (
                  <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px] flex items-center gap-1">
                    <Sparkles size={9} /> Analisado por IA
                  </span>
                ) : (
                  <span className="chip bg-amber-100 text-amber-600 border border-amber-200 text-[10px]">
                    â—Œ SimulaÃ§Ã£o â€” adicione API Key para anÃ¡lise real
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{title || url || 'VÃ­deo analisado'}</p>
              {topic && <p className="text-xs text-gray-400">TÃ³pico: {topic}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!savedAnalysis ? (
                <button onClick={handleSaveAnalysis} className="btn-secondary text-xs"><Star size={12} /> Salvar</button>
              ) : (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check size={12} /> Salvo</span>
              )}
              <button onClick={handleReset} className="btn-secondary text-xs"><RotateCcw size={12} /> Nova</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* â”€â”€ ESTRUTURA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'estrutura' && (
            <div className="space-y-4">
              <div className="card p-5 border border-orange-200 bg-orange-50/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Gancho â€” {analysis.structure.hook.type}</h3>
                  <span className="chip bg-orange-100 text-orange-700 border border-orange-200 text-[10px] ml-auto">{analysis.structure.hook.duration}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{analysis.structure.hook.description}</p>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] text-orange-500 font-medium mb-1">EXEMPLO / RECONSTITUIÃ‡ÃƒO:</p>
                  <p className="text-xs text-gray-700 italic">"{analysis.structure.hook.example}"</p>
                </div>
                <p className="text-[11px] text-emerald-600 font-medium">âœ“ {analysis.structure.hook.effectiveness}</p>
              </div>

              <div className="card p-4 space-y-2 border border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">C</div>
                  <h3 className="text-xs font-semibold text-gray-800">Contexto / Credencial</h3>
                </div>
                <p className="text-xs text-gray-500">{analysis.structure.context.description}</p>
                <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.context.example}"</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pontos Principais</h3>
                {analysis.structure.main_points.map((pt, i) => (
                  <div key={i} className="card p-4 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-800">{pt.point}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{pt.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500">{pt.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card p-4 space-y-2 border border-emerald-100 bg-emerald-50/30">
                  <div className="flex items-center gap-2">
                    <Target size={13} className="text-emerald-500" />
                    <h3 className="text-xs font-semibold text-gray-800">Fechamento</h3>
                    <span className="text-[10px] text-gray-400 ml-auto">{analysis.structure.closing.duration}</span>
                  </div>
                  <p className="text-xs text-gray-500">{analysis.structure.closing.description}</p>
                  <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.closing.example}"</p>
                </div>
                <div className="card p-4 space-y-2 border border-violet-100 bg-violet-50/30">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={13} className="text-violet-500" />
                    <h3 className="text-xs font-semibold text-gray-800">CTA</h3>
                    <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px] ml-auto">{analysis.structure.cta.type}</span>
                  </div>
                  <p className="text-xs text-gray-500">{analysis.structure.cta.description}</p>
                  <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.cta.example}"</p>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ TOM & PADRÃ•ES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'tom' && (
            <div className="space-y-5">
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mic size={15} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-gray-900">AnÃ¡lise de Tom de Voz</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <p className="text-[10px] text-purple-400 font-medium mb-1 uppercase tracking-wide">Tom PrimÃ¡rio</p>
                    <p className="text-sm font-bold text-purple-700">{analysis.tone.primary}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[10px] text-indigo-400 font-medium mb-1 uppercase tracking-wide">Tom SecundÃ¡rio</p>
                    <p className="text-sm font-bold text-indigo-700">{analysis.tone.secondary}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{analysis.tone.description}</p>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">CaracterÃ­sticas da Voz</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">{analysis.tone.voice_characteristics}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Marcadores de Tom</p>
                  <div className="space-y-1.5">
                    {analysis.tone.markers.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-purple-400 mt-0.5 shrink-0">â€¢</span>{m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={15} className="text-amber-500" /> PadrÃµes de ConteÃºdo Identificados
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {analysis.patterns.map((p, i) => (
                    <div key={i} className="card p-4 space-y-2 border border-amber-100 bg-amber-50/30">
                      <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.description}</p>
                      <div className="flex items-start gap-1.5 bg-white/70 rounded-lg p-2.5 border border-amber-100/50">
                        <Sparkles size={11} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-gray-600">{p.why_effective}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Star size={15} className="text-orange-500" /> Por Que Esse VÃ­deo Funciona
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {analysis.why_it_works.map((w, i) => (
                    <div key={i} className="card p-4 space-y-1.5 border border-orange-100 bg-orange-50/20">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{w.reason}</p>
                      </div>
                      <p className="text-xs text-gray-500 pl-7">{w.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ RETENÃ‡ÃƒO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'retencao' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Eye size={15} className="text-sky-500" /> TÃ©cnicas de RetenÃ§Ã£o de AudiÃªncia
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {analysis.retention.map((r, i) => (
                    <div key={i} className="card p-4 space-y-2 border border-sky-100 bg-sky-50/30">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600 shrink-0">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{r.technique}</p>
                      </div>
                      <p className="text-xs text-gray-500">{r.description}</p>
                      <div className="bg-white/70 rounded-lg p-2.5 border border-sky-100/50">
                        <p className="text-[11px] text-gray-600 italic">{r.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5 space-y-4 border border-gray-200">
                <div className="flex items-center gap-2">
                  <Film size={15} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Elementos Visuais e Estilo de EdiÃ§Ã£o</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Texto na Tela', val: analysis.visual.text_style },
                    { label: 'Estilo de EdiÃ§Ã£o', val: analysis.visual.editing_style },
                    { label: 'Ritmo (Pacing)', val: analysis.visual.pacing },
                  ].map((v) => (
                    <div key={v.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wide">{v.label}</p>
                      <p className="text-xs text-gray-600">{v.val}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">TÃ©cnicas Visuais</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.visual.key_techniques.map((t, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ TEMPLATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'template' && analysis.template && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{analysis.template.name}</h3>
                <button onClick={handleCopyTemplate} className="btn-secondary text-xs">
                  {copied ? <><Check size={12} className="text-emerald-500" /> Copiado!</> : <><Copy size={12} /> Copiar Template</>}
                </button>
              </div>
              <div className="card p-4 space-y-3 border border-orange-200 bg-orange-50/30">
                <p className="text-[11px] text-orange-500 font-semibold uppercase tracking-wide">FÃ³rmula do Gancho</p>
                <p className="text-sm font-medium text-gray-800">{analysis.template.hook_formula}</p>
                <div className="bg-white/70 rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] text-gray-400 mb-1">EXEMPLO:</p>
                  <p className="text-xs text-gray-700 italic">{analysis.template.hook_example}</p>
                </div>
              </div>
              <div className="card p-4 space-y-2 border border-blue-100 bg-blue-50/30">
                <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wide">Estrutura de Abertura</p>
                <p className="text-xs text-gray-700">{analysis.template.opening_formula}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SeÃ§Ãµes do VÃ­deo</p>
                {analysis.template.sections.map((s, i) => (
                  <div key={i} className="card p-4 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{s.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{s.goal}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card p-4 space-y-2 border border-emerald-100 bg-emerald-50/30">
                <p className="text-[11px] text-emerald-500 font-semibold uppercase tracking-wide">FÃ³rmula de Fechamento</p>
                <p className="text-xs text-gray-700">{analysis.template.closing_formula}</p>
              </div>
              <div className="card p-4 space-y-3">
                <p className="text-[11px] text-amber-500 font-semibold uppercase tracking-wide">Dicas para Replicar</p>
                {analysis.template.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* â”€â”€ IDEIAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'ideias' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">6 ideias de conteÃºdo inspiradas neste vÃ­deo â€” salve direto no Hub de Ideias.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {analysis.content_ideas.map((idea, i) => (
                  <div key={i} className="card p-4 space-y-3 hover:border-orange-300 transition-colors relative overflow-hidden">
                    {savedIdeas.has(idea.title) && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-600/90 rounded-xl backdrop-blur-sm">
                        <span className="text-white font-semibold text-sm flex items-center gap-2"><Check size={16} /> Salvo no Hub</span>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-800 leading-snug">{idea.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="chip bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">{idea.platform}</span>
                      <span className="chip bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px]">{idea.format}</span>
                      <span className="chip bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">{idea.hook_type}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 italic">{idea.angle}</p>
                    <button onClick={() => handleSaveIdea(idea)} className="btn-primary text-xs py-1.5 w-full">
                      <Plus size={12} /> Salvar no Hub de Ideias
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
