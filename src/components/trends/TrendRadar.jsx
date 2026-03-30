import { useState } from 'react'
import {
  Search, Radar, Users, TrendingUp, Lightbulb, Plus, ExternalLink,
  ChevronDown, ChevronUp, Loader2, Brain, Zap, BarChart2,
  MessageSquare, Layout, BookOpen, Target, AlertCircle,
  Flame, Sparkles, Globe, Check, ArrowUpRight, Hash,
  FileText, Eye, Filter, KeyRound, Layers,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { PlatformBadge, FormatBadge } from '../common/Badge'
// CarouselStudio moved to /carousel route (Studio de Criação)

// ─── Suggested topics ─────────────────────────────────────────────────────────
const SUGGESTED = [
  'IA nos negócios', 'economia de criadores', 'carreira em tecnologia',
  'marketing digital', 'marca pessoal', 'vida como solopreneur',
  'finanças pessoais', 'produtividade com IA',
]

// ─── Signal visual maps ────────────────────────────────────────────────────────
const SIGNAL_COLORS = {
  'Fraco':         'bg-gray-100 text-gray-500 border-gray-200',
  'Emergente':     'bg-blue-100 text-blue-700 border-blue-200',
  'Forte':         'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Alto Momentum': 'bg-orange-100 text-orange-700 border-orange-200',
  'Saturado':      'bg-red-100 text-red-500 border-red-200',
  'Crescendo':     'bg-teal-100 text-teal-700 border-teal-200',
}
const SIGNAL_DOTS = {
  'Fraco':         'bg-gray-400',
  'Emergente':     'bg-blue-500',
  'Forte':         'bg-emerald-500',
  'Alto Momentum': 'bg-orange-500',
  'Saturado':      'bg-red-400',
  'Crescendo':     'bg-teal-500',
}
const PLATFORM_META = {
  tiktok:    { emoji: '🎵', color: 'from-black to-gray-800', text: 'text-white', label: 'TikTok' },
  instagram: { emoji: '📸', color: 'from-purple-600 to-pink-500', text: 'text-white', label: 'Instagram' },
  youtube:   { emoji: '🎬', color: 'from-red-600 to-red-700', text: 'text-white', label: 'YouTube' },
  linkedin:  { emoji: '💼', color: 'from-blue-700 to-blue-800', text: 'text-white', label: 'LinkedIn' },
  twitter:   { emoji: '𝕏', color: 'from-gray-900 to-black', text: 'text-white', label: 'X / Twitter' },
}
const POTENTIAL_COLORS = {
  'Very High': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'High':      'bg-blue-100 text-blue-700 border-blue-200',
  'Medium':    'bg-gray-100 text-gray-500 border-gray-200',
  'Low':       'bg-gray-100 text-gray-400 border-gray-200',
}
const POTENTIAL_LABELS = { 'Very High': 'Muito Alto', 'High': 'Alto', 'Medium': 'Médio', 'Low': 'Baixo' }
const GAP_COLORS = { 'Alta': 'bg-orange-100 text-orange-700 border-orange-200', 'Média': 'bg-blue-100 text-blue-700 border-blue-200', 'Baixa': 'bg-gray-100 text-gray-500 border-gray-200' }

const LOADING_PHASES = [
  'Escaneando plataformas...',
  'Mapeando criadores relevantes...',
  'Detectando padrões de conteúdo...',
  'Identificando lacunas e oportunidades...',
  'Gerando insights estratégicos...',
]

// ─── Claude API call ───────────────────────────────────────────────────────────
async function callClaudeForTrends(apiKey, topic, insights = []) {
  const insightsContext = insights?.length
    ? `\nCREATOR PERSONAL ANALYTICS (use to personalize recommendations):\n${insights.slice(0, 8).map((ins) => `- ${ins.title}: ${ins.description || ''}`).join('\n')}`
    : ''

  const prompt = `You are a social media trend intelligence analyst specializing in Brazilian content creators. Analyze the topic "${topic}" and generate a comprehensive, SPECIFIC trend intelligence report.

${insightsContext}

CRITICAL RULES:
- ALL descriptive text, hook examples, narratives, insights MUST be in Brazilian Portuguese
- Generate REALISTIC and SPECIFIC data tailored to the exact topic "${topic}"
- Include 15+ creators that ACTUALLY exist and create content about "${topic}". Use REAL names and handles of known Brazilian and international creators. Do NOT invent fictional creators.
- For each creator, provide their REAL handle/username and a search URL so the user can find them
- For profile_url use search URLs: LinkedIn=https://www.linkedin.com/search/results/people/?keywords=NAME, Instagram=https://www.instagram.com/explore/search/keyword/?q=HANDLE, TikTok=https://www.tiktok.com/search?q=HANDLE, YouTube=https://www.youtube.com/results?search_query=NAME, Twitter=https://x.com/search?q=HANDLE&f=user
- Prioritize creators who are actively posting about "${topic}" in the last 6 months
- Include a MIX of: mega creators (100K+), mid-tier (10K-100K), and micro creators (1K-10K) for diverse perspectives
- Hook examples must be SPECIFIC to topic "${topic}", not generic
- Content gaps must be REAL underexplored angles about "${topic}"

Respond with ONLY a valid JSON object, no markdown, no code blocks:
{
  "topic": "${topic}",
  "overall_signal": "Emergente|Crescendo|Alto Momentum|Saturado",
  "signal_score": 0-100,
  "platform_signals": [
    {
      "platform": "tiktok",
      "signal": "Fraco|Emergente|Forte|Alto Momentum",
      "posts_per_week": "~XK posts/semana",
      "growth_rate": "+X%",
      "dominant_format": "formato dominante",
      "key_insight": "insight específico sobre como o tópico performa nessa plataforma"
    }
  ],
  "trends": [
    {
      "id": "t1",
      "name": "nome específico da subtendência",
      "classification": "Emergente|Crescendo|Alto Momentum|Saturado",
      "description": "descrição detalhada em português",
      "growth_rate": "+XX% em 30 dias",
      "why_trending": "motivo específico pelo qual está crescendo",
      "platforms": ["tiktok", "instagram"]
    }
  ],
  "creators": [
    {
      "id": "c1",
      "name": "Nome do Criador",
      "handle": "@handle",
      "platform": "instagram",
      "followers": "XXK",
      "profile_url": "URL de busca",
      "niche": "nicho específico",
      "avg_engagement": "X.X%",
      "recent_topics": ["tópico1", "tópico2"],
      "why_relevant": "por que é relevante especificamente para o tópico"
    }
  ],
  "example_posts": [
    {
      "id": "p1",
      "title": "título ou caption do post",
      "creator": "nome do criador",
      "platform": "platform",
      "format": "carrossel|reel|thread|video|artigo",
      "engagement": "X.XK curtidas · XK comentários",
      "url": "URL de busca relacionada",
      "hook": "gancho usado no post"
    }
  ],
  "patterns": {
    "recurring_hooks": [
      {
        "hook": "tipo do gancho",
        "type": "lista|contrário|história|dados|problema|pergunta|curiosidade",
        "frequency": "X% dos posts virais",
        "example": "frase gancho exata e específica para '${topic}' em português",
        "platforms": ["platform1"]
      }
    ],
    "dominant_formats": [
      {
        "platform": "platform",
        "formats": [
          { "format": "formato", "dominance": "XX%", "trend": "+X%" }
        ]
      }
    ],
    "narrative_styles": [
      {
        "style": "nome do estilo narrativo",
        "frequency": "XX%",
        "description": "como esse estilo se manifesta no tópico",
        "why_works": "por que funciona para essa audiência"
      }
    ],
    "retention_techniques": [
      {
        "technique": "nome da técnica",
        "description": "descrição da técnica",
        "example": "exemplo de aplicação específica para o tópico"
      }
    ],
    "emerging_topics": ["subtópico1", "subtópico2", "subtópico3", "subtópico4", "subtópico5", "subtópico6"]
  },
  "content_gaps": [
    {
      "id": "g1",
      "gap": "lacuna de conteúdo específica",
      "description": "por que essa perspectiva está faltando e qual a oportunidade",
      "opportunity_level": "Alta|Média|Baixa",
      "platforms": ["platform1", "platform2"]
    }
  ],
  "opportunities": [
    {
      "id": "o1",
      "title": "título específico de conteúdo",
      "description": "descrição detalhada do ângulo e proposta de valor",
      "hook": "tipo de gancho",
      "hook_example": "frase exata de abertura em português",
      "format": "carrossel|reel|thread|video|artigo",
      "platform": "platform",
      "potential": "Very High|High|Medium|Low",
      "content_gap": "qual lacuna preenche",
      "why_now": "por que criar isso agora"
    }
  ],
  "ideas": [
    {
      "id": "i1",
      "title": "título da ideia de conteúdo",
      "hook": "tipo",
      "hook_suggestion": "frase exata de abertura irresistível em português",
      "format": "carrossel|reel|thread|video|artigo",
      "platform": "platform",
      "priority": "high|medium|low",
      "angle": "ângulo único que diferencia do conteúdo comum"
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'You are a trend intelligence analyst. Respond ONLY with a valid JSON object. No markdown, no code blocks, no explanations.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(response)
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta da IA não contém JSON válido')
  // Sanitize common AI JSON mistakes: trailing commas before ] or }
  const sanitized = match[0]
    .replace(/,\s*]/g, ']')
    .replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SignalBadge({ signal, size = 'sm' }) {
  const color = SIGNAL_COLORS[signal] || SIGNAL_COLORS['Fraco']
  const dot = SIGNAL_DOTS[signal] || 'bg-gray-400'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {signal}
    </span>
  )
}

function PlatformSignalCard({ ps }) {
  const meta = PLATFORM_META[ps.platform] || { emoji: '🌐', color: 'from-gray-600 to-gray-700', text: 'text-white', label: ps.platform }
  return (
    <div className="card overflow-hidden">
      <div className={`bg-gradient-to-br ${meta.color} p-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.emoji}</span>
            <span className={`text-xs font-bold ${meta.text}`}>{meta.label}</span>
          </div>
          <SignalBadge signal={ps.signal} />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">Posts/semana</span>
          <span className="font-semibold text-gray-700">{ps.posts_per_week}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">Crescimento</span>
          <span className="font-semibold text-emerald-600">{ps.growth_rate}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">Formato líder</span>
          <span className="font-semibold text-gray-700">{ps.dominant_format}</span>
        </div>
        <div className="pt-1 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 leading-relaxed">{ps.key_insight}</p>
        </div>
      </div>
    </div>
  )
}

function TrendCard({ trend }) {
  const [expanded, setExpanded] = useState(false)
  const color = SIGNAL_COLORS[trend.classification] || SIGNAL_COLORS['Emergente']
  return (
    <div className="card p-4 space-y-2 hover:border-orange-200 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900 flex-1 leading-snug">{trend.name}</h4>
        <SignalBadge signal={trend.classification} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-emerald-600">{trend.growth_rate}</span>
        {trend.platforms?.map((p) => <PlatformBadge key={p} platform={p} />)}
      </div>
      {expanded && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-gray-500 leading-relaxed">{trend.description}</p>
          <div className="bg-orange-50 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold text-orange-600 mb-0.5">Por que está crescendo</p>
            <p className="text-xs text-gray-700">{trend.why_trending}</p>
          </div>
        </div>
      )}
      <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-500 font-medium transition-colors">
        {expanded ? <><ChevronUp size={11} /> Menos</> : <><ChevronDown size={11} /> Ver análise</>}
      </button>
    </div>
  )
}

function CreatorCard({ creator }) {
  const meta = PLATFORM_META[creator.platform]
  return (
    <div className="card p-4 flex items-start gap-3 hover:border-orange-300 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
        {creator.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{creator.name}</span>
          <span className="text-sm" title={creator.platform}>{meta?.emoji || '🌐'}</span>
          {creator.profile_url && (
            <a href={creator.profile_url} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-gray-300 hover:text-orange-500 transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()} title="Ver perfil">
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mb-1">{creator.handle} · {creator.followers} seguidores · {creator.avg_engagement} eng.</p>
        <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">{creator.niche}</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {(creator.recent_topics || []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
          ))}
        </div>
        {creator.why_relevant && (
          <div className="bg-orange-50 rounded-lg p-2 border border-orange-100">
            <p className="text-[10px] text-orange-700 leading-relaxed">💡 {creator.why_relevant}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ExamplePostCard({ post }) {
  const meta = PLATFORM_META[post.platform]
  return (
    <div className="card p-4 space-y-2.5 hover:border-orange-300 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm">{meta?.emoji || '🌐'}</span>
        <span className="text-[11px] font-medium text-gray-600">{meta?.label || post.platform}</span>
        <FormatBadge format={post.format} />
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-500 transition-colors"
          >
            <ExternalLink size={11} /> Ver
          </a>
        )}
      </div>
      <h4 className="text-sm font-semibold text-gray-900 leading-snug">{post.title}</h4>
      <p className="text-[11px] text-gray-500">por <span className="font-medium">{post.creator}</span></p>
      {post.hook && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2">
          <p className="text-[10px] text-orange-600 font-semibold mb-0.5">Gancho usado</p>
          <p className="text-xs text-gray-700 italic">"{post.hook}"</p>
        </div>
      )}
      {post.engagement && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <Eye size={10} /> {post.engagement}
        </p>
      )}
    </div>
  )
}

function HookCard({ hook }) {
  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-gray-800">{hook.hook}</span>
        <span className={`chip border text-[10px] ${SIGNAL_COLORS['Emergente']}`}>{hook.frequency}</span>
      </div>
      <div className="flex gap-1">
        {(hook.platforms || []).map((p) => <PlatformBadge key={p} platform={p} />)}
      </div>
      <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
        <p className="text-[10px] text-orange-600 font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
          <Zap size={9} /> Exemplo exato
        </p>
        <p className="text-xs text-gray-700 italic leading-relaxed">"{hook.example}"</p>
      </div>
    </div>
  )
}

function OpportunityCard({ opp, onSave, saved }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`card p-4 space-y-3 hover:border-orange-300 transition-all ${saved ? 'opacity-60' : ''}`}>
      {saved && (
        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
          <Check size={12} /> Salvo no Hub
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 flex-1 leading-snug">{opp.title}</h4>
        <span className={`chip border shrink-0 text-[10px] ${POTENTIAL_COLORS[opp.potential] || POTENTIAL_COLORS['Medium']}`}>
          {POTENTIAL_LABELS[opp.potential] || opp.potential}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <PlatformBadge platform={opp.platform} />
        <FormatBadge format={opp.format} />
        {opp.hook && <span className="chip bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">{opp.hook}</span>}
      </div>
      {opp.hook_example && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold text-orange-600 mb-1 flex items-center gap-1"><Zap size={9} /> Gancho sugerido</p>
          <p className="text-xs text-gray-700 italic">"{opp.hook_example}"</p>
        </div>
      )}
      {expanded && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-gray-500 leading-relaxed">{opp.description}</p>
          {opp.content_gap && (
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Lacuna preenchida</p>
              <p className="text-xs text-gray-600">{opp.content_gap}</p>
            </div>
          )}
          {opp.why_now && (
            <div className="bg-blue-50 rounded-lg p-2.5">
              <p className="text-[10px] font-semibold text-blue-600 mb-0.5">Por que agora</p>
              <p className="text-xs text-gray-700">{opp.why_now}</p>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <button onClick={() => setExpanded((x) => !x)} className="btn-ghost text-xs py-1 px-2">
          {expanded ? <><ChevronUp size={11} /> Menos</> : <><ChevronDown size={11} /> Detalhes</>}
        </button>
        <button
          onClick={() => onSave(opp)}
          disabled={saved}
          className={saved ? 'flex items-center gap-1 text-xs text-emerald-600 font-medium' : 'btn-primary text-xs py-1.5 px-3'}
        >
          {saved ? <><Check size={11} /> Salvo</> : <><Plus size={11} /> Salvar Ideia</>}
        </button>
      </div>
    </div>
  )
}

function IdeaCard({ idea, onSave, saved }) {
  return (
    <div className={`card p-4 space-y-3 hover:border-orange-300 transition-all ${saved ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span className="chip border text-[10px] bg-orange-100 text-orange-700 border-orange-200 capitalize">{idea.hook}</span>
        <span className={`chip border text-[10px] ${idea.priority === 'high' ? 'bg-red-100 text-red-600 border-red-200' : idea.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {idea.priority === 'high' ? 'Alta' : idea.priority === 'medium' ? 'Média' : 'Baixa'}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-gray-900 leading-snug">{idea.title}</h4>
      {idea.hook_suggestion && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold text-orange-600 mb-1 flex items-center gap-1"><Zap size={9} /> Hook de abertura</p>
          <p className="text-xs text-gray-700 italic">"{idea.hook_suggestion}"</p>
        </div>
      )}
      {idea.angle && (
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-600">Ângulo: </span>{idea.angle}
        </p>
      )}
      <div className="flex gap-1.5 flex-wrap">
        <PlatformBadge platform={idea.platform} />
        <FormatBadge format={idea.format} />
      </div>
      <div className="pt-1 border-t border-gray-100">
        <button
          onClick={() => onSave(idea)}
          disabled={saved}
          className={saved ? 'flex items-center gap-1.5 text-xs text-emerald-600 font-medium' : 'btn-primary text-xs w-full justify-center py-2'}
        >
          {saved ? <><Check size={12} /> Salvo no Hub</> : <><Plus size={12} /> Salvar no Hub</>}
        </button>
      </div>
    </div>
  )
}

// ─── Tabs config ───────────────────────────────────────────────────────────────
const RESULT_TABS = [
  { id: 'overview',      label: 'Visão Geral',         icon: BarChart2 },
  { id: 'creators',      label: 'Criadores',           icon: Users },
  { id: 'posts',         label: 'Posts',               icon: FileText },
  { id: 'patterns',      label: 'Padrões',             icon: TrendingUp },
  { id: 'gaps',          label: 'Lacunas',             icon: Filter },
  { id: 'opportunities', label: 'Oportunidades',       icon: Lightbulb },
  { id: 'ideas',         label: 'Ideias',              icon: Sparkles },
]

// ─── Main component ────────────────────────────────────────────────────────────
export default function TrendRadar() {
  const setTrendResults = useStore((s) => s.setTrendResults)
  const trendResults    = useStore((s) => s.trendResults)
  const insights        = useStore((s) => s.insights)
  const addIdea         = useStore((s) => s.addIdea)

  const [topic, setTopic]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [loadPhase, setLoadPhase] = useState(0)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [savedIds, setSavedIds] = useState(new Set())
  const [creatorPlatformFilter, setCreatorPlatformFilter] = useState('all')
  const [creatorSearch, setCreatorSearch] = useState('')

  const hasApiKey = !!localStorage.getItem('cio-anthropic-key')

  const handleSearch = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setLoadPhase(0)
    setActiveTab('overview')

    const phaseInterval = setInterval(() => {
      setLoadPhase((p) => (p < LOADING_PHASES.length - 1 ? p + 1 : p))
    }, 1100)

    try {
      const apiKey = localStorage.getItem('cio-anthropic-key')
      if (!apiKey) throw new Error('Chave Anthropic não configurada. Adicione sua chave em Configurações para usar o Creator Insights.')

      const results = await callClaudeForTrends(apiKey, topic.trim(), insights)
      setTrendResults(results)
      setSavedIds(new Set())
    } catch (e) {
      setError(e.message || 'Erro ao analisar tendências')
    } finally {
      clearInterval(phaseInterval)
      setLoading(false)
    }
  }

  const handleSaveOpp = (opp) => {
    const parts = [
      opp.description,
      opp.hook_example ? `\n\nGancho: ${opp.hook_example}` : '',
      opp.content_gap ? `\nLacuna: ${opp.content_gap}` : '',
      opp.why_now ? `\nPor que agora: ${opp.why_now}` : '',
    ]
    addIdea({
      title: opp.title,
      description: parts.filter(Boolean).join(''),
      topic: trendResults?.topic,
      format: opp.format,
      hook_type: opp.hook?.toLowerCase(),
      platform: opp.platform,
      priority: opp.potential === 'Very High' ? 'high' : opp.potential === 'High' ? 'medium' : 'low',
      status: 'idea',
      tags: ['tendencia', trendResults?.topic].filter(Boolean),
    })
    setSavedIds((s) => new Set([...s, opp.id]))
  }

  const handleSaveIdea = (idea) => {
    const parts = [
      idea.angle ? `Ângulo: ${idea.angle}` : '',
      idea.hook_suggestion ? `\n\nGancho sugerido: ${idea.hook_suggestion}` : '',
      idea.format ? `\nFormato: ${idea.format}` : '',
      idea.platform ? `\nPlataforma: ${idea.platform}` : '',
    ]
    addIdea({
      title: idea.title,
      description: parts.filter(Boolean).join(''),
      topic: trendResults?.topic,
      format: idea.format,
      hook_type: idea.hook,
      platform: idea.platform,
      priority: idea.priority || 'medium',
      status: 'idea',
      tags: ['tendencia', trendResults?.topic].filter(Boolean),
    })
    setSavedIds((s) => new Set([...s, idea.id]))
  }

  const handleSaveAllIdeas = () => {
    ;(trendResults?.ideas || []).forEach((idea) => {
      if (!savedIds.has(idea.id)) handleSaveIdea(idea)
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Search card ─────────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-200">
            <Radar size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Creator Insights · Radar de Tendências</h2>
            <p className="text-xs text-gray-400">Detecta criadores, padrões, lacunas e oportunidades em 5 plataformas com IA</p>
          </div>
          {hasApiKey ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Brain size={9} /> IA Real Ativa
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              <KeyRound size={9} /> Chave necessária
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder='"IA nos negócios", "marca pessoal", "carreira em tecnologia"...'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading || !topic.trim()} className="btn-primary shrink-0 min-w-[130px]">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Analisando...</>
              : <><Brain size={14} /> Analisar</>
            }
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400">Tente:</span>
          {SUGGESTED.map((s) => (
            <button key={s} onClick={() => setTopic(s)}
              className="text-[11px] px-2 py-1 rounded-md bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-500 transition-colors">
              {s}
            </button>
          ))}
        </div>

        {!hasApiKey && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              <span className="font-semibold">Configure sua chave Anthropic</span> para ativar o Creator Insights completo — análise real de tendências, criadores, padrões e oportunidades com IA.
            </p>
          </div>
        )}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="card p-14 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Radar size={24} className="absolute inset-0 m-auto text-orange-500 animate-pulse" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-base font-semibold text-gray-800">{LOADING_PHASES[loadPhase]}</p>
            <div className="flex justify-center gap-1.5">
              {LOADING_PHASES.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i <= loadPhase ? 'bg-orange-500 w-8' : 'bg-gray-200 w-4'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-400">Analisando "{topic}" em TikTok, Instagram, YouTube, LinkedIn e X</p>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Erro na análise</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      {!loading && !error && trendResults && (
        <div className="space-y-5 animate-slide-up">

          {/* Summary banner */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-200">
                <span className="text-xl font-black text-white">{trendResults.signal_score || '—'}</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Score de Tendência</p>
                <SignalBadge signal={trendResults.overall_signal} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                Resultados para <span className="text-orange-600">"{trendResults.topic}"</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {trendResults.creators?.length} criadores · {trendResults.trends?.length} tendências · {trendResults.opportunities?.length} oportunidades · {trendResults.ideas?.length} ideias
              </p>
            </div>
            {insights.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded-lg">
                <Sparkles size={10} /> Personalizado com seus insights
              </span>
            )}
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {RESULT_TABS.map(({ id, label, icon: Icon }) => {
              const counts = {
                overview: trendResults.trends?.length,
                carousel: null,
                creators: trendResults.creators?.length,
                posts: trendResults.example_posts?.length,
                patterns: trendResults.patterns?.recurring_hooks?.length,
                gaps: trendResults.content_gaps?.length,
                opportunities: trendResults.opportunities?.length,
                ideas: trendResults.ideas?.length,
              }
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    activeTab === id
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={12} /> {label}
                  {counts[id] > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === id ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>
                      {counts[id]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Tab: Visão Geral ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Platform signals */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Globe size={15} className="text-orange-500" /> Sinal por Plataforma
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(trendResults.platform_signals || []).map((ps) => (
                    <PlatformSignalCard key={ps.platform} ps={ps} />
                  ))}
                </div>
              </div>

              {/* Detected trends */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp size={15} className="text-emerald-500" /> Tendências Detectadas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(trendResults.trends || []).map((trend) => <TrendCard key={trend.id} trend={trend} />)}
                </div>
              </div>

              {/* Emerging topics cloud */}
              {trendResults.patterns?.emerging_topics?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Hash size={15} className="text-blue-500" /> Subtópicos Emergentes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendResults.patterns.emerging_topics.map((t, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-gray-700 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Criadores ───────────────────────────────────────────────── */}
          {activeTab === 'creators' && (() => {
            const allCreators = trendResults.creators || []
            const platforms = [...new Set(allCreators.map(c => c.platform))].sort()
            const filtered = allCreators.filter(c => {
              if (creatorPlatformFilter !== 'all' && c.platform !== creatorPlatformFilter) return false
              if (creatorSearch && !c.name.toLowerCase().includes(creatorSearch.toLowerCase()) && !(c.handle || '').toLowerCase().includes(creatorSearch.toLowerCase()) && !(c.niche || '').toLowerCase().includes(creatorSearch.toLowerCase())) return false
              return true
            })
            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Users size={15} className="text-blue-500" /> Criadores Relevantes
                    <span className="text-[11px] text-gray-400 font-normal">· {filtered.length} de {allCreators.length}</span>
                  </h3>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={creatorSearch} onChange={e => setCreatorSearch(e.target.value)} placeholder="Buscar criador..."
                        className="pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg outline-none focus:border-orange-300 w-40" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setCreatorPlatformFilter('all')}
                        className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-all ${creatorPlatformFilter === 'all' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        Todos
                      </button>
                      {platforms.map(p => {
                        const meta = PLATFORM_META[p]
                        return (
                          <button key={p} onClick={() => setCreatorPlatformFilter(p)}
                            className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-all ${creatorPlatformFilter === p ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                            {meta?.emoji || '🌐'} {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">Nenhum criador encontrado com esses filtros</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((c) => <CreatorCard key={c.id} creator={c} />)}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Tab: Posts ───────────────────────────────────────────────────── */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={15} className="text-purple-500" /> Posts de Referência
                <span className="text-[11px] text-gray-400 font-normal">· exemplos do que está performando</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(trendResults.example_posts || []).map((post) => <ExamplePostCard key={post.id} post={post} />)}
              </div>
            </div>
          )}

          {/* ── Tab: Padrões ─────────────────────────────────────────────────── */}
          {activeTab === 'patterns' && trendResults.patterns && (
            <div className="space-y-6">
              {/* Recurring hooks */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <MessageSquare size={15} className="text-orange-500" /> Ganchos Recorrentes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(trendResults.patterns.recurring_hooks || []).map((h, i) => <HookCard key={i} hook={h} />)}
                </div>
              </div>

              {/* Narrative styles */}
              {trendResults.patterns.narrative_styles?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <BookOpen size={15} className="text-blue-500" /> Estilos Narrativos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trendResults.patterns.narrative_styles.map((style, i) => (
                      <div key={i} className="card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">{style.style}</span>
                          <span className="text-[11px] font-bold text-blue-600">{style.frequency}</span>
                        </div>
                        {style.description && <p className="text-[11px] text-gray-500 leading-relaxed">{style.description}</p>}
                        {style.why_works && (
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-[10px] text-blue-600 font-semibold mb-0.5">Por que funciona</p>
                            <p className="text-xs text-gray-600">{style.why_works}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retention techniques */}
              {trendResults.patterns.retention_techniques?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Eye size={15} className="text-emerald-500" /> Técnicas de Retenção
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trendResults.patterns.retention_techniques.map((rt, i) => (
                      <div key={i} className="card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-emerald-700">{i + 1}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800">{rt.technique}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{rt.description}</p>
                        {rt.example && (
                          <div className="bg-orange-50 border border-orange-100 rounded-lg p-2">
                            <p className="text-[10px] text-orange-600 font-semibold mb-0.5">Exemplo</p>
                            <p className="text-xs text-gray-700 italic">"{rt.example}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dominant formats */}
              {trendResults.patterns.dominant_formats?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Layout size={15} className="text-purple-500" /> Formatos Dominantes por Plataforma
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trendResults.patterns.dominant_formats.map((pf, i) => (
                      <div key={i} className="card p-4">
                        <PlatformBadge platform={pf.platform} />
                        <div className="mt-3 space-y-2">
                          {(pf.formats || []).map((f, j) => (
                            <div key={j} className="flex items-center justify-between text-[11px]">
                              <span className="text-gray-600">{f.format}</span>
                              <div className="flex items-center gap-2">
                                <span className={f.trend?.startsWith('+') ? 'text-emerald-600 font-medium' : 'text-red-500'}>{f.trend}</span>
                                <span className="text-gray-400">{f.dominance}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Lacunas ─────────────────────────────────────────────────── */}
          {activeTab === 'gaps' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Target size={15} className="text-red-500" /> Lacunas de Conteúdo
                </h3>
                <p className="text-xs text-gray-400 mb-4">Perspectivas e ângulos subexplorados — oportunidades para se diferenciar</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(trendResults.content_gaps || []).map((gap) => (
                    <div key={gap.id} className="card p-4 space-y-3 hover:border-orange-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Target size={14} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{gap.gap}</h4>
                            <span className={`chip border shrink-0 text-[10px] ${GAP_COLORS[gap.opportunity_level] || GAP_COLORS['Média']}`}>
                              {gap.opportunity_level}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{gap.description}</p>
                          {gap.platforms?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {gap.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Oportunidades ───────────────────────────────────────────── */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Lightbulb size={15} className="text-amber-500" /> Oportunidades de Conteúdo
                  <span className="text-[11px] text-gray-400 font-normal">· salve diretamente no Hub de Ideias</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {(trendResults.opportunities || []).map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    onSave={handleSaveOpp}
                    saved={savedIds.has(opp.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Ideias ──────────────────────────────────────────────────── */}
          {activeTab === 'ideas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles size={15} className="text-orange-500" /> Ideias Prontas para Criar
                  {savedIds.size > 0 && <span className="text-xs text-emerald-600 font-normal">{savedIds.size} salvas</span>}
                </h3>
                <button onClick={handleSaveAllIdeas} className="btn-ghost text-xs border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Check size={12} /> Salvar Todas
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(trendResults.ideas || []).map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onSave={handleSaveIdea}
                    saved={savedIds.has(idea.id)}
                  />
                ))}
              </div>
              {savedIds.size > 0 && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-700">
                    <span className="font-semibold">{savedIds.size} {savedIds.size === 1 ? 'ideia salva' : 'ideias salvas'}</span> — visíveis no Hub de Ideias.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !error && !trendResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200 flex items-center justify-center mb-5 shadow-sm">
            <Radar size={32} className="text-orange-500" />
          </div>
          <h3 className="text-gray-800 font-semibold text-base mb-2">Digite um tópico para ativar o radar</h3>
          <p className="text-gray-400 text-sm max-w-md leading-relaxed">
            O Creator Insights vai descobrir criadores relevantes, padrões de conteúdo, lacunas estratégicas e gerar ideias prontas para executar — tudo em segundos com IA.
          </p>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            {[
              { icon: Users, label: '15+ criadores', desc: 'com links clicáveis' },
              { icon: TrendingUp, label: 'Padrões detectados', desc: 'hooks, formatos, narrativas' },
              { icon: Target, label: 'Lacunas de conteúdo', desc: 'ângulos inexplorados' },
              { icon: Sparkles, label: 'Ideias geradas', desc: 'prontas para o Hub' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card p-3 text-center space-y-1">
                <Icon size={18} className="text-orange-400 mx-auto" />
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
