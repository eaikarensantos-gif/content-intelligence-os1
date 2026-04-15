import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import {
  Dna, Upload, FileText, Zap, TrendingUp, Copy, Check, Plus,
  BarChart2, Sparkles, RefreshCw, Target, Layers, BookOpen,
  ExternalLink, ChevronDown, ChevronUp, Eye, Heart, Share2,
  Bookmark, Users, Award, X,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'
import { parseFile } from '../../utils/csvNormalizer'

const LS_KEY = 'cio-anthropic-key'

// ── Loading Phases ──────────────────────────────────────────────────────────
const PHASES = [
  { label: 'Analisando performance dos seus conteúdos...', icon: BarChart2, color: 'text-blue-500' },
  { label: 'Identificando os top performers...', icon: TrendingUp, color: 'text-emerald-500' },
  { label: 'Detectando padrões de sucesso...', icon: Dna, color: 'text-purple-500' },
  { label: 'Sintetizando seu DNA de conteúdo...', icon: Sparkles, color: 'text-orange-500' },
  { label: 'Gerando templates e novas ideias...', icon: Target, color: 'text-rose-500' },
]

// ── Column mapping (same as MetricsForm) ────────────────────────────────────
const COL_MAP = {
  'post_id': 'post_id', 'post id': 'post_id',
  'data': 'date', 'publish time': 'date', 'horário de publicação': 'date',
  'horario de publicação': 'date', 'horário de publicacao': 'date',
  'horario de publicacao': 'date', 'publish_time': 'date',
  'plataforma': 'platform', 'platform': 'platform',
  'post type': 'post_type', 'tipo de post': 'post_type', 'tipo': 'post_type', 'post_type': 'post_type',
  'description': 'description', 'descrição': 'description', 'descricao': 'description',
  'descriçao': 'description', 'legenda': 'description',
  'permalink': 'link', 'link permanente': 'link', 'link': 'link', 'url': 'link',
  'comentário de dados': 'data_comment', 'comentario de dados': 'data_comment',
  'duração (s)': 'duration_sec', 'duracao (s)': 'duration_sec', 'duração': 'duration_sec',
  'duracao': 'duration_sec', 'duration': 'duration_sec', 'duration (s)': 'duration_sec',
  'visualizações': 'impressions', 'visualizacoes': 'impressions', 'visualizaçoes': 'impressions',
  'impressões': 'impressions', 'impressoes': 'impressions', 'impressions': 'impressions', 'views': 'impressions',
  'alcance': 'reach', 'reach': 'reach',
  'curtidas': 'likes', 'likes': 'likes',
  'coment.': 'comments', 'comentários': 'comments', 'comentarios': 'comments', 'comments': 'comments', 'replies': 'comments',
  'compart.': 'shares', 'compartilhamentos': 'shares', 'shares': 'shares',
  'seguimentos': 'follows', 'follows': 'follows', 'seguidores': 'follows',
  'new followers': 'follows', 'novos seguidores': 'follows',
  'salvam.': 'saves', 'salvamentos': 'saves', 'saves': 'saves', 'sticker taps': 'saves',
  'cliques no link': 'link_clicks', 'link_clicks': 'link_clicks', 'link clicks': 'link_clicks',
}

const ptMonth = { 'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
  'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12' }

function normalizeDate(raw = '') {
  const s = raw.trim()
  if (!s) return new Date().toISOString().split('T')[0]
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const brLong = s.match(/(\d{1,2})\s+de?\s*(\w{3})\.?\s+(\d{4})/)
  if (brLong) {
    const mon = ptMonth[brLong[2].toLowerCase().replace('.', '')] || '01'
    return `${brLong[3]}-${mon}-${brLong[1].padStart(2, '0')}`
  }
  const slash = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash) {
    const day = slash[1].padStart(2, '0')
    const month = slash[2].padStart(2, '0')
    if (Number(slash[1]) > 12) return `${slash[3]}-${month}-${day}`
    if (Number(slash[2]) > 12) return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`
    return `${slash[3]}-${month}-${day}`
  }
  const d = new Date(s)
  if (!isNaN(d)) return d.toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0]
}

function normalizePostType(raw = '') {
  const v = raw.toLowerCase().trim()
  if (v.includes('story') || v.includes('storie')) return 'story'
  if (v.includes('reel')) return 'reel'
  if (v.includes('carousel') || v.includes('carrossel')) return 'carousel'
  if (v.includes('video') || v.includes('vídeo')) return 'video'
  if (v.includes('image') || v.includes('photo') || v.includes('foto')) return 'image'
  return v || ''
}

const toNumber = (v = '') => Number(String(v).replace(/[^0-9]/g, '')) || 0

function parseCSVRow(raw) {
  const row = {}
  for (const [key, val] of Object.entries(raw)) {
    const mapped = COL_MAP[key.toLowerCase().trim()]
    if (mapped) row[mapped] = val
  }
  return {
    post_id: row.post_id || '',
    platform: (row.platform || 'instagram').toLowerCase(),
    date: normalizeDate(row.date),
    impressions: toNumber(row.impressions),
    reach: toNumber(row.reach),
    likes: toNumber(row.likes),
    comments: toNumber(row.comments),
    shares: toNumber(row.shares),
    saves: toNumber(row.saves),
    follows: toNumber(row.follows),
    link_clicks: toNumber(row.link_clicks),
    duration_sec: toNumber(row.duration_sec),
    description: (row.description || '').trim(),
    link: (row.link || '').trim(),
    post_type: normalizePostType(row.post_type),
    data_comment: (row.data_comment || '').trim(),
  }
}

// ── AI call ─────────────────────────────────────────────────────────────────
async function analyzeContentDNA(apiKey, metricsData) {
  // Build a summary of the data for the AI
  const enriched = metricsData.map(m => ({
    ...m,
    engagement: (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0),
    engagement_rate: m.impressions > 0
      ? (((m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)) / m.impressions * 100).toFixed(2)
      : '0',
  }))

  // Sort by engagement to find top performers
  const sorted = [...enriched].sort((a, b) => b.engagement - a.engagement)
  const topPosts = sorted.slice(0, Math.min(10, Math.ceil(sorted.length * 0.3)))
  const bottomPosts = sorted.slice(-Math.min(5, Math.ceil(sorted.length * 0.2)))

  const dataForAI = {
    total_posts: enriched.length,
    avg_engagement_rate: (enriched.reduce((s, m) => s + parseFloat(m.engagement_rate), 0) / enriched.length).toFixed(2),
    top_performers: topPosts.map(p => ({
      description: p.description?.slice(0, 300) || '(sem legenda)',
      type: p.post_type,
      date: p.date,
      impressions: p.impressions,
      reach: p.reach,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      follows: p.follows,
      engagement: p.engagement,
      engagement_rate: p.engagement_rate + '%',
      duration_sec: p.duration_sec,
    })),
    low_performers: bottomPosts.map(p => ({
      description: p.description?.slice(0, 200) || '(sem legenda)',
      type: p.post_type,
      impressions: p.impressions,
      engagement: p.engagement,
      engagement_rate: p.engagement_rate + '%',
    })),
    format_breakdown: Object.entries(
      enriched.reduce((acc, m) => {
        const t = m.post_type || 'other'
        if (!acc[t]) acc[t] = { count: 0, total_engagement: 0, total_impressions: 0 }
        acc[t].count++
        acc[t].total_engagement += m.engagement
        acc[t].total_impressions += m.impressions
        return acc
      }, {})
    ).map(([type, d]) => ({
      type,
      count: d.count,
      avg_engagement: (d.total_engagement / d.count).toFixed(0),
      avg_engagement_rate: d.total_impressions > 0 ? (d.total_engagement / d.total_impressions * 100).toFixed(2) + '%' : '0%',
    })),
  }

  const prompt = `Você é um estrategista de conteúdo digital brasileiro de alto nível. Analise os dados de desempenho abaixo e extraia o "DNA de conteúdo" deste criador — os padrões que fazem seu conteúdo funcionar.

PERFIL DO CRIADOR:
Este criador produz conteúdo e ministra palestras sobre: Carreira e desenvolvimento profissional, Maturidade profissional, IA aplicada, Crítica social da tecnologia, Corporativo relatable. Público-alvo: profissionais sêniores, gestores e tomadores de decisão em tech. Toda análise, template e ideia deve ser contextualizada neste universo temático.

DADOS DE DESEMPENHO:
${JSON.stringify(dataForAI, null, 2)}

MISSÃO: Analise profundamente os dados e retorne uma análise completa do DNA de conteúdo.

REGRAS:
- Linguagem: português brasileiro natural e observacional
- Seja específico — cite dados reais dos posts
- Evite generalidades vagas
- Insights devem ser acionáveis e baseados nos dados

Responda APENAS com JSON válido:
{
  "top_performers": [
    {
      "rank": 1,
      "description_preview": "primeiras palavras do post...",
      "why_it_worked": "análise de por que performou bem",
      "engagement": 0,
      "engagement_rate": "0%",
      "key_element": "o elemento principal de sucesso"
    }
  ],
  "patterns": [
    {
      "id": "pattern-1",
      "name": "nome curto do padrão (ex: 'Provocação + Reflexão')",
      "description": "descrição detalhada do padrão identificado",
      "evidence": "dados e exemplos que comprovam o padrão",
      "strength": "high|medium",
      "metrics_impact": "como este padrão afeta as métricas"
    }
  ],
  "synthesis": {
    "core_identity": "a identidade central do conteúdo deste criador em 1-2 frases",
    "winning_formula": "a fórmula de conteúdo que mais funciona, em linguagem clara",
    "audience_resonance": "o que ressoa com a audiência deste criador",
    "blind_spots": "pontos cegos ou oportunidades não exploradas"
  },
  "templates": [
    {
      "id": "template-1",
      "name": "nome do template",
      "based_on_pattern": "pattern-1",
      "hook_structure": "estrutura exata do gancho (com variáveis em [colchetes])",
      "content_flow": ["passo 1: ...", "passo 2: ...", "passo 3: ...", "passo 4: encerramento"],
      "tone_guidance": "orientação específica de tom para este template",
      "best_for": "reel|carousel|post|story|video",
      "example_hook": "um exemplo concreto usando a estrutura"
    }
  ],
  "new_ideas": [
    {
      "title": "título da ideia de conteúdo",
      "description": "descrição completa com hook, desenvolvimento e CTA",
      "based_on_pattern": "pattern-1",
      "format": "reel|carousel|post|story|video",
      "predicted_impact": "alto|médio",
      "hook": "o gancho exato para usar",
      "tags": ["tag1", "tag2"]
    }
  ],
  "creator_references": [
    {
      "name": "Nome do criador (pode ser internacional)",
      "handle": "@handle_instagram_ou_linkedin",
      "platform": "instagram|linkedin",
      "why": "por que este criador é tecnicamente relevante — qual método de entrega ou estrutura de conteúdo se conecta com os padrões identificados nos dados",
      "what_to_learn": "aprendizado 100% técnico e específico (ex: 'Como estrutura um carrossel de Case Study em 7 slides com dado + insight + aplicação')",
      "style_match": "qual padrão do DNA se conecta com este criador",
      "aesthetic": "descrição da estética visual (ex: 'Paleta neutra, tipografia bold, sem filtros')"
    }
  ]
}

REGRAS PARA creator_references:
- Nicho OBRIGATÓRIO: UX Design, IA aplicada, Carreira Sênior em Tech, Liderança em Produto, Design Systems, Maturidade Profissional, Crítica Social da Tecnologia, Corporativo Relatable com profundidade.
- Os criadores sugeridos devem estar alinhados com os temas que este criador trabalha: carreira e desenvolvimento profissional, maturidade profissional, IA aplicada, crítica social da tecnologia, corporativo relatable.
- Estética: minimalista, técnica, premium — paleta neutra/quente, sem excesso de cores.
- Público dos criadores sugeridos: profissionais sêniores, gestores, tomadores de decisão em tech.
- PROIBIDO sugerir: criadores de finanças pessoais genéricas (ex: Nath Arcuri, Thiago Nigro), coaches motivacionais, influenciadores de entretenimento de massa, perfis sem profundidade técnica.
- PRIORIZE: criadores que combinam humor corporativo com análise técnica, que falam de carreira com honestidade e sem toxic positivity, que tratam IA com senioridade e criticidade.
- Pode ser internacional se não houver nacional adequado — prefira qualidade ao localismo.
- A justificativa "what_to_learn" deve ser SEMPRE sobre método de entrega (estrutura do post, técnica narrativa, formato visual) — nunca sobre tema.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
      system: withAntiAIFilter('You are a world-class content strategist specializing in Tech Career niches. The user is a tech career consultant, mentor, and content creator who covers: Career & Professional Development, Professional Maturity, Applied AI, Social Critique of Technology, and Relatable Corporate Life. Their audience is senior professionals, managers, and decision-makers in tech. Analyze content performance data and extract actionable patterns. For creator_references, only suggest creators with deep technical authority in tech career, AI, Senior Tech Leadership, career maturity, or tech social critique — never generic finance, motivation, or mass entertainment creators. Write in natural, observational Brazilian Portuguese. Always respond with valid JSON only — no markdown, no explanations. Start with { and end with }.'),
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ── Clipboard hook ──────────────────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ── Strength badge ──────────────────────────────────────────────────────────
function StrengthBadge({ strength }) {
  const s = strength?.toLowerCase()
  if (s === 'high') return <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Forte</span>
  return <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase">Médio</span>
}

// ── Collapsible Section ─────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconColor, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconColor || 'bg-gray-100'}`}>
          <Icon size={15} className="text-white" />
        </div>
        <span className="text-sm font-bold text-gray-800 flex-1 text-left">{title}</span>
        {badge}
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

// ── Format badge ────────────────────────────────────────────────────────────
const FORMAT_STYLES = {
  reel: 'bg-rose-100 text-rose-700 border-rose-200',
  carousel: 'bg-purple-100 text-purple-700 border-purple-200',
  post: 'bg-blue-100 text-blue-700 border-blue-200',
  story: 'bg-pink-100 text-pink-700 border-pink-200',
  video: 'bg-violet-100 text-violet-700 border-violet-200',
  image: 'bg-sky-100 text-sky-700 border-sky-200',
}

function FormatBadge({ format }) {
  const style = FORMAT_STYLES[format] || 'bg-gray-100 text-gray-600 border-gray-200'
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${style}`}>{format || '—'}</span>
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ContentDNA() {
  const { metrics, addIdea } = useStore()
  const navigate = useNavigate()
  const { copiedKey, copy } = useCopy()

  const [apiKey] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [dataSource, setDataSource] = useState('store') // 'store' | 'csv'
  const [csvData, setCsvData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadPhase, setLoadPhase] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [savedIdeas, setSavedIdeas] = useState(new Set())
  const phaseRef = useRef(null)
  const resultsRef = useRef(null)

  const activeData = dataSource === 'csv' && csvData ? csvData : metrics

  const handleCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { data } = await parseFile(file)
      setCsvData(data.map(parseCSVRow))
      setDataSource('csv')
    } catch (err) {
      console.error(err)
      setError('Erro ao ler arquivo: ' + err.message)
    }
  }

  const startPhases = () => {
    setLoadPhase(0)
    let p = 0
    phaseRef.current = setInterval(() => {
      p += 1
      if (p >= PHASES.length) clearInterval(phaseRef.current)
      else setLoadPhase(p)
    }, 2500)
  }

  const handleAnalyze = async () => {
    if (activeData.length < 3) {
      setError('Importe pelo menos 3 registros de métricas para analisar.')
      return
    }
    if (!apiKey) {
      setError('Configure sua chave Anthropic API nas configurações.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)
    setSavedIdeas(new Set())
    startPhases()

    try {
      const data = await analyzeContentDNA(apiKey, activeData)
      setResult(data)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(phaseRef.current)
      setLoading(false)
    }
  }

  const handleSaveIdea = (idea, index) => {
    addIdea({
      title: idea.title,
      description: idea.description,
      format: idea.format || 'post',
      tags: ['content-dna', 'winning-pattern', ...(idea.tags || [])],
      priority: idea.predicted_impact === 'alto' ? 'high' : 'medium',
      status: 'draft',
      source: 'Content DNA',
      hook_type: idea.hook ? 'data-driven' : '',
    })
    setSavedIdeas(prev => new Set([...prev, index]))
  }

  const handleSaveAllIdeas = () => {
    (result?.new_ideas || []).forEach((idea, i) => {
      if (!savedIdeas.has(i)) handleSaveIdea(idea, i)
    })
  }

  // ── Stats from data ───────────────────────────────────────────────────────
  const totalPosts = activeData.length
  const totalImpressions = activeData.reduce((s, m) => s + (m.impressions || 0), 0)
  const totalEngagement = activeData.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0), 0)
  const avgEngRate = totalImpressions > 0 ? (totalEngagement / totalImpressions * 100).toFixed(2) : '0'

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <Dna size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Content DNA</h1>
              <p className="text-xs text-gray-400 mt-0.5">Descubra os padrões que fazem seu conteúdo funcionar</p>
            </div>
          </div>
          {result && (
            <span className="text-[11px] text-purple-600 font-medium px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full">
              ✦ DNA analisado — {result.patterns?.length || 0} padrões encontrados
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Data Source ── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-purple-500" />
            <p className="text-sm font-semibold text-gray-800">Fonte de Dados</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setDataSource('store')}
              className={`flex-1 text-xs py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                dataSource === 'store' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart2 size={12} /> Métricas do Analytics ({metrics.length})
            </button>
            <button
              onClick={() => setDataSource('csv')}
              className={`flex-1 text-xs py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                dataSource === 'csv' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload size={12} /> Upload CSV
            </button>
          </div>

          {dataSource === 'csv' && (
            <div className="p-4 rounded-xl border border-dashed border-purple-300 bg-purple-50/30 text-center">
              <Upload size={24} className="text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-700 mb-1">Faça upload da sua planilha de desempenho</p>
              <p className="text-xs text-gray-400 mb-3">
                Colunas aceitas: Descrição, Duração (s), Horário de publicação, Tipo de post, Data, Visualizações, Alcance, Curtidas, Compartilhamentos, Seguimentos, Comentários, Salvamentos
              </p>
              <label className="btn-primary cursor-pointer inline-flex">
                <FileText size={14} /> Escolher arquivo
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSV} />
              </label>
            </div>
          )}

          {/* Data Summary */}
          {activeData.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Posts', value: totalPosts, icon: Layers, color: 'text-purple-500' },
                { label: 'Impressões', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-blue-500' },
                { label: 'Engajamento', value: totalEngagement.toLocaleString(), icon: Heart, color: 'text-rose-500' },
                { label: 'Taxa Média', value: `${avgEngRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
              ].map(({ label, value, icon: SIcon, color }) => (
                <div key={label} className="rounded-xl p-3 bg-gray-50 border border-gray-100 text-center space-y-1">
                  <SIcon size={14} className={`${color} mx-auto`} />
                  <p className="text-lg font-bold text-gray-800">{value}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">{label}</p>
                </div>
              ))}
            </div>
          )}

          {csvData && dataSource === 'csv' && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
              <Check size={13} className="text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700">
                <span className="font-semibold">{csvData.length} registros</span> carregados do CSV
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-xs">
              <X size={13} className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || activeData.length < 3 || !apiKey}
            className="w-full btn-primary justify-center py-3 text-sm"
            style={{ background: loading ? undefined : 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {loading ? (
              <><RefreshCw size={15} className="animate-spin" /> {PHASES[loadPhase]?.label}</>
            ) : (
              <><Dna size={15} /> Analisar DNA do Conteúdo</>
            )}
          </button>

          {!apiKey && (
            <p className="text-center text-[11px] text-amber-600">
              Configure sua chave Anthropic API nas configurações para usar este recurso.
            </p>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="card p-8 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-200">
                <Dna size={30} className="text-white animate-pulse" />
              </div>
              <div className="absolute -inset-2 rounded-3xl border-2 border-purple-200 animate-ping opacity-30" />
            </div>
            <div className="flex items-center gap-2">
              {PHASES.map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    i < loadPhase ? 'bg-purple-500' : i === loadPhase ? 'bg-purple-400 scale-125 animate-pulse' : 'bg-gray-200'
                  }`} />
                  {i < PHASES.length - 1 && <div className={`h-0.5 w-4 transition-all duration-700 ${i < loadPhase ? 'bg-purple-300' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-5 animate-slide-up" ref={resultsRef}>

            {/* ─ Synthesis (Core Identity) ─ */}
            {result.synthesis && (
              <div className="rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50 border border-purple-200 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Dna size={15} className="text-purple-500" />
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Seu DNA de Conteúdo</p>
                </div>
                <p className="text-base font-bold text-gray-900 leading-snug">{result.synthesis.core_identity}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-white/60 border border-purple-100 space-y-1">
                    <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wide">🏆 Fórmula Vencedora</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{result.synthesis.winning_formula}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-white/60 border border-purple-100 space-y-1">
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">💡 Ressonância</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{result.synthesis.audience_resonance}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-white/60 border border-purple-100 space-y-1">
                    <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wide">🔍 Pontos Cegos</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{result.synthesis.blind_spots}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─ Top Performers ─ */}
            {result.top_performers?.length > 0 && (
              <Section
                title="Top Performers"
                icon={TrendingUp}
                iconColor="bg-gradient-to-br from-emerald-400 to-emerald-600"
                badge={<span className="text-[10px] text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">{result.top_performers.length} posts</span>}
              >
                <div className="space-y-3">
                  {result.top_performers.map((post, i) => (
                    <div key={i} className="rounded-xl p-4 bg-gray-50 border border-gray-100 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">#{post.rank}</span>
                          <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{post.description_preview}</p>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 shrink-0">{post.engagement_rate}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><Heart size={9} /> {post.engagement}</span>
                      </div>
                      <div className="rounded-lg p-2.5 bg-emerald-50 border border-emerald-100">
                        <p className="text-[10px] text-emerald-700 font-medium mb-0.5">Por que funcionou:</p>
                        <p className="text-xs text-gray-700">{post.why_it_worked}</p>
                      </div>
                      {post.key_element && (
                        <div className="flex items-center gap-1.5">
                          <Zap size={10} className="text-amber-500" />
                          <span className="text-[10px] text-amber-700 font-semibold">{post.key_element}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ─ Patterns ─ */}
            {result.patterns?.length > 0 && (
              <Section
                title="Padrões Identificados"
                icon={Dna}
                iconColor="bg-gradient-to-br from-purple-400 to-purple-600"
                badge={<span className="text-[10px] text-purple-600 font-medium px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-full">{result.patterns.length} padrões</span>}
              >
                <div className="space-y-3">
                  {result.patterns.map((pattern, i) => (
                    <div key={i} className="rounded-xl p-4 border border-purple-100 bg-purple-50/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-purple-300">{String(i + 1).padStart(2, '0')}</span>
                          <p className="text-sm font-bold text-gray-800">{pattern.name}</p>
                        </div>
                        <StrengthBadge strength={pattern.strength} />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{pattern.description}</p>
                      <div className="rounded-lg p-2.5 bg-white border border-purple-100">
                        <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wide mb-1">Evidência</p>
                        <p className="text-[11px] text-gray-600">{pattern.evidence}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={10} className="text-purple-400" />
                        <span className="text-[10px] text-purple-600 font-medium">{pattern.metrics_impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ─ Templates ─ */}
            {result.templates?.length > 0 && (
              <Section
                title="Templates Reutilizáveis"
                icon={Layers}
                iconColor="bg-gradient-to-br from-orange-400 to-orange-600"
                badge={<span className="text-[10px] text-orange-600 font-medium px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full">{result.templates.length} templates</span>}
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {result.templates.map((template, i) => (
                    <div key={i} className="rounded-xl border border-orange-100 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-orange-50/60 border-b border-orange-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-800">{template.name}</p>
                          <FormatBadge format={template.best_for} />
                        </div>
                        <button
                          onClick={() => copy(
                            `TEMPLATE: ${template.name}\n\nGANCHO: ${template.hook_structure}\n\nFLUXO:\n${(template.content_flow || []).join('\n')}\n\nTOM: ${template.tone_guidance}\n\nEXEMPLO: ${template.example_hook}`,
                            `template-${i}`
                          )}
                          className="text-[10px] text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white transition-colors"
                        >
                          {copiedKey === `template-${i}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Hook structure */}
                        <div className="rounded-lg p-3 bg-orange-50 border border-orange-200">
                          <p className="text-[9px] text-orange-500 font-bold uppercase tracking-wide mb-1">🎯 Estrutura do Gancho</p>
                          <p className="text-xs text-gray-800 font-semibold">{template.hook_structure}</p>
                        </div>
                        {/* Content flow */}
                        <div className="space-y-1.5">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Fluxo do Conteúdo</p>
                          {(template.content_flow || []).map((step, si) => (
                            <div key={si} className="flex gap-2 items-start">
                              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5">{si + 1}</span>
                              <p className="text-[11px] text-gray-600">{step}</p>
                            </div>
                          ))}
                        </div>
                        {/* Tone */}
                        <div className="rounded-lg p-2.5 bg-gray-50 border border-gray-100">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-1">🎤 Tom</p>
                          <p className="text-[11px] text-gray-600">{template.tone_guidance}</p>
                        </div>
                        {/* Example */}
                        {template.example_hook && (
                          <div className="rounded-lg p-2.5 bg-violet-50 border border-violet-200">
                            <p className="text-[9px] text-violet-500 font-bold uppercase tracking-wide mb-1">💬 Exemplo</p>
                            <p className="text-xs text-gray-800 font-medium italic">"{template.example_hook}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ─ New Ideas ─ */}
            {result.new_ideas?.length > 0 && (
              <Section
                title="Novas Ideias Baseadas no DNA"
                icon={Sparkles}
                iconColor="bg-gradient-to-br from-rose-400 to-rose-600"
                badge={<span className="text-[10px] text-rose-600 font-medium px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-full">{result.new_ideas.length} ideias</span>}
              >
                <div className="space-y-3">
                  {result.new_ideas.map((idea, i) => (
                    <div key={i} className="rounded-xl p-4 border border-gray-100 bg-gray-50/50 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-bold text-gray-800">{idea.title}</p>
                            <FormatBadge format={idea.format} />
                            {idea.predicted_impact === 'alto' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">⚡ Alto impacto</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{idea.description}</p>
                        </div>
                      </div>

                      {idea.hook && (
                        <div className="rounded-lg p-2.5 bg-rose-50 border border-rose-200 flex items-start gap-2">
                          <Target size={11} className="text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wide">Hook sugerido</p>
                            <p className="text-xs text-gray-800 font-medium">"{idea.hook}"</p>
                          </div>
                        </div>
                      )}

                      {idea.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {idea.tags.map((tag, ti) => (
                            <span key={ti} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="pt-1">
                        {savedIdeas.has(i) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                              <Check size={11} /> Salvo no Hub
                            </span>
                            <button
                              onClick={() => navigate('/ideas')}
                              className="text-[11px] text-orange-600 font-medium flex items-center gap-1 px-2 py-1.5 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              Abrir no Hub <ExternalLink size={9} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSaveIdea(idea, i)}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all"
                          >
                            <Plus size={12} /> Salvar no Hub
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Save all */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Plus size={15} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Salvar todas as ideias no Hub</p>
                        <p className="text-[10px] text-gray-400">Cada ideia vira um rascunho com tag "winning-pattern"</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleSaveAllIdeas}
                        disabled={savedIdeas.size === result.new_ideas.length}
                        className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                          savedIdeas.size === result.new_ideas.length
                            ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                        }`}
                      >
                        {savedIdeas.size === result.new_ideas.length ? <><Check size={12} /> Todas salvas</> : <><Sparkles size={12} /> Salvar todas</>}
                      </button>
                      {savedIdeas.size > 0 && (
                        <button onClick={() => navigate('/ideas')} className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-orange-50 border border-orange-200 transition-all">
                          Abrir Hub <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {/* ─ Creator References ─ */}
            {result.creator_references?.length > 0 && (
              <Section
                title="Criadores de Referência"
                icon={Users}
                iconColor="bg-gradient-to-br from-sky-400 to-sky-600"
                badge={<span className="text-[10px] text-sky-600 font-medium px-2 py-0.5 bg-sky-50 border border-sky-200 rounded-full">{result.creator_references.length} referências</span>}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.creator_references.map((creator, i) => (
                    <div key={i} className="rounded-xl p-4 border border-gray-200 bg-white space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                            {creator.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{creator.name}</p>
                            {creator.handle && (
                              <p className="text-[10px] text-gray-400 font-mono">{creator.handle}</p>
                            )}
                          </div>
                        </div>
                        {creator.platform && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                            creator.platform === 'linkedin'
                              ? 'bg-violet-50 text-violet-600 border-violet-200'
                              : 'bg-pink-50 text-pink-600 border-pink-200'
                          }`}>
                            {creator.platform}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 leading-relaxed">{creator.why}</p>

                      <div className="rounded-lg p-2.5 bg-gray-50 border border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-1">Método técnico a aprender</p>
                        <p className="text-[11px] text-gray-700 leading-relaxed">{creator.what_to_learn}</p>
                      </div>

                      {creator.aesthetic && (
                        <div className="flex items-start gap-1.5">
                          <Eye size={10} className="text-gray-300 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-gray-400 italic">{creator.aesthetic}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Award size={10} className="text-sky-400 shrink-0" />
                        <span className="text-[10px] text-sky-600 font-medium">{creator.style_match}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        )}

        {/* ── Empty State ── */}
        {!result && !loading && (
          <div className="card p-10 flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
              <Dna size={36} className="text-purple-400" />
            </div>
            <div className="text-center space-y-2 max-w-lg">
              <h2 className="text-lg font-bold text-gray-800">Descubra seu DNA de Conteúdo</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Importe suas métricas de desempenho e descubra os <strong>padrões que fazem seu conteúdo funcionar</strong>.
                A IA analisa seus top performers e gera templates reutilizáveis + novas ideias baseadas no que já deu certo.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: TrendingUp, label: 'Top Performers', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { icon: Dna, label: 'Padrões', color: 'text-purple-500', bg: 'bg-purple-50' },
                { icon: Layers, label: 'Templates', color: 'text-orange-500', bg: 'bg-orange-50' },
                { icon: Sparkles, label: 'Novas Ideias', color: 'text-rose-500', bg: 'bg-rose-50' },
                { icon: Users, label: 'Referências', color: 'text-sky-500', bg: 'bg-sky-50' },
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
