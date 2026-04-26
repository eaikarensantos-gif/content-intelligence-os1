import { useState } from 'react'
import {
  Sparkles, Loader2, Eye, TrendingUp, Target,
  Calendar, BarChart2, Zap, ChevronRight, RefreshCw,
  AlertCircle, Lightbulb, ArrowRight, Database, Brain, Rocket, GitCompare, Key, Check,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'

const PHASES = [
  'Agente 1/4 — Analisando performance individual de cada post...',
  'Agente 1/4 — Ranking por engajamento, saves e shares...',
  'Agente 2/4 — Identificando padrões entre top performers...',
  'Agente 2/4 — Comparando melhores vs piores posts...',
  'Agente 3/4 — Gerando ações específicas e testáveis...',
  'Agente 4/4 — Comparando períodos e detectando mudanças...',
]

const SECTION_STYLES = {
  analysis:     { icon: Database,   color: 'blue',    label: 'Análise de Dados' },
  strategy:     { icon: Brain,      color: 'purple',  label: 'Estratégia de Conteúdo' },
  growth:       { icon: Rocket,     color: 'orange',  label: 'Ações de Crescimento' },
  comparison:   { icon: GitCompare, color: 'emerald', label: 'Comparação de Períodos' },
}

const CATEGORY_STYLES = {
  timing:      { icon: Calendar,   bg: 'bg-violet-50',  border: 'border-violet-200', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  format:      { icon: BarChart2,  bg: 'bg-indigo-50',  border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  content:     { icon: Lightbulb,  bg: 'bg-amber-50',   border: 'border-amber-200',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  engagement:  { icon: TrendingUp, bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  audience:    { icon: Eye,        bg: 'bg-blue-50',    border: 'border-blue-200',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  opportunity: { icon: Target,     bg: 'bg-orange-50',  border: 'border-orange-200',  iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  outlier:     { icon: AlertCircle, bg: 'bg-red-50',    border: 'border-red-200',     iconBg: 'bg-red-100',     iconColor: 'text-red-600',     badge: 'bg-red-100 text-red-700' },
}

const CATEGORY_LABELS = {
  timing: 'Timing', format: 'Formato', content: 'Conteúdo',
  engagement: 'Engajamento', audience: 'Audiência', opportunity: 'Oportunidade', outlier: 'Outlier',
}

function buildPostsData(enriched) {
  const all = enriched.map((m, i) => ({
    idx: i + 1,
    type: m.post_type || '?',
    desc: (m.description || '').slice(0, 100),
    date: m.date,
    impressions: m.impressions,
    reach: m.reach || 0,
    likes: m.likes,
    comments: m.comments || 0,
    shares: m.shares || 0,
    saves: m.saves || 0,
    follows: m.follows || 0,
    er: +(m.engagement_rate * 100).toFixed(2),
    engagement: m.engagement,
  }))

  const byER = [...all].sort((a, b) => b.er - a.er)
  const bySaves = [...all].sort((a, b) => b.saves - a.saves)
  const byShares = [...all].sort((a, b) => b.shares - a.shares)
  const byImpressions = [...all].sort((a, b) => b.impressions - a.impressions)

  // Format breakdown
  const formatMap = {}
  enriched.forEach(m => {
    const t = m.post_type || 'desconhecido'
    if (!formatMap[t]) formatMap[t] = { count: 0, impressions: 0, engagement: 0, er_sum: 0, shares: 0, saves: 0, likes: 0 }
    formatMap[t].count++
    formatMap[t].impressions += m.impressions
    formatMap[t].engagement += m.engagement
    formatMap[t].er_sum += m.engagement_rate
    formatMap[t].shares += m.shares || 0
    formatMap[t].saves += m.saves || 0
    formatMap[t].likes += m.likes
  })

  // Day of week
  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const dayMap = {}
  enriched.forEach(m => {
    if (!m.date) return
    const d = new Date(m.date + 'T12:00:00').getDay()
    const name = DAY_NAMES[d]
    if (!dayMap[name]) dayMap[name] = { count: 0, er_sum: 0, impressions: 0, engagement: 0 }
    dayMap[name].count++
    dayMap[name].er_sum += m.engagement_rate
    dayMap[name].impressions += m.impressions
    dayMap[name].engagement += m.engagement
  })

  // Period split
  const sorted = [...enriched].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const half = Math.floor(sorted.length / 2)
  const first = sorted.slice(0, half)
  const second = sorted.slice(half)
  const periodStats = (arr) => ({
    posts: arr.length,
    avgER: arr.length ? +(arr.reduce((s, m) => s + m.engagement_rate, 0) / arr.length * 100).toFixed(2) : 0,
    totalImpressions: arr.reduce((s, m) => s + m.impressions, 0),
    totalEngagement: arr.reduce((s, m) => s + m.engagement, 0),
    avgShares: arr.length ? +(arr.reduce((s, m) => s + (m.shares || 0), 0) / arr.length).toFixed(1) : 0,
    avgSaves: arr.length ? +(arr.reduce((s, m) => s + (m.saves || 0), 0) / arr.length).toFixed(1) : 0,
    dateRange: arr.length ? `${arr[0]?.date || '?'} a ${arr[arr.length - 1]?.date || '?'}` : '—',
  })

  return { all, byER, bySaves, byShares, byImpressions, formatMap, dayMap, period1: periodStats(first), period2: periodStats(second), totalPosts: all.length }
}

function buildPrompt(enriched) {
  const d = buildPostsData(enriched)

  return `Você vai executar 4 análises em sequência. Cada uma com um papel diferente. NÃO resuma. NÃO dê opiniões genéricas. Use NÚMEROS dos dados.

═══ DADOS COMPLETOS ═══

TODOS OS POSTS (${d.totalPosts} posts):
${d.all.map(p => `#${p.idx} [${p.type}] "${p.desc}" | Data: ${p.date} | Imp: ${p.impressions} | Alcance: ${p.reach} | Likes: ${p.likes} | Coment: ${p.comments} | Shares: ${p.shares} | Saves: ${p.saves} | Follows: ${p.follows} | ER: ${p.er}%`).join('\n')}

RANKING POR ENGAJAMENTO: ${d.byER.slice(0, 5).map(p => `#${p.idx}(${p.er}%)`).join(', ')}
RANKING POR SAVES: ${d.bySaves.slice(0, 5).map(p => `#${p.idx}(${p.saves})`).join(', ')}
RANKING POR SHARES: ${d.byShares.slice(0, 5).map(p => `#${p.idx}(${p.shares})`).join(', ')}
RANKING POR IMPRESSÕES: ${d.byImpressions.slice(0, 5).map(p => `#${p.idx}(${p.impressions})`).join(', ')}

POR FORMATO:
${Object.entries(d.formatMap).map(([type, v]) => `- ${type}: ${v.count} posts, ER médio: ${(v.er_sum / v.count * 100).toFixed(2)}%, Imp. média: ${Math.round(v.impressions / v.count)}, Likes médio: ${(v.likes / v.count).toFixed(1)}, Shares médio: ${(v.shares / v.count).toFixed(1)}, Saves médio: ${(v.saves / v.count).toFixed(1)}`).join('\n')}

POR DIA DA SEMANA:
${Object.entries(d.dayMap).map(([day, v]) => `- ${day}: ${v.count} posts, ER médio: ${(v.er_sum / v.count * 100).toFixed(2)}%, Imp. média: ${Math.round(v.impressions / v.count)}`).join('\n')}

PERÍODO 1 (${d.period1.dateRange}): ${d.period1.posts} posts, ER médio: ${d.period1.avgER}%, Impressões: ${d.period1.totalImpressions}, Eng: ${d.period1.totalEngagement}, Shares médio: ${d.period1.avgShares}, Saves médio: ${d.period1.avgSaves}
PERÍODO 2 (${d.period2.dateRange}): ${d.period2.posts} posts, ER médio: ${d.period2.avgER}%, Impressões: ${d.period2.totalImpressions}, Eng: ${d.period2.totalEngagement}, Shares médio: ${d.period2.avgShares}, Saves médio: ${d.period2.avgSaves}

═══ AGENTE 1: DATA ANALYST ═══
Retorne performance INDIVIDUAL de cada post. Identifique outliers (posts com métricas muito acima ou abaixo da média). Calcule a diferença entre top e bottom performers em cada métrica.

═══ AGENTE 2: CONTENT STRATEGIST ═══
Identifique padrões entre os top-performing posts. Compare melhores vs piores. Explique POR QUÊ um performou melhor, usando números. Sem insights genéricos.

═══ AGENTE 3: GROWTH STRATEGIST ═══
Gere ações claras, específicas e testáveis. Cada ação com "por quê" e "impacto esperado". Sem conselhos vagos.

═══ AGENTE 4: PERIOD COMPARISON ═══
Compare período 1 vs período 2. Identifique: crescimento, queda ou estabilidade. Explique o que mudou e possíveis razões.

Responda EXCLUSIVAMENTE com JSON válido:
{
  "analysis": {
    "top_performers": [{"post_idx": 1, "why": "...", "standout_metric": "..."}],
    "bottom_performers": [{"post_idx": 1, "why": "...", "weakness": "..."}],
    "outliers": [{"post_idx": 1, "metric": "...", "value": 0, "vs_average": "..."}],
    "gap": {"best_er": 0, "worst_er": 0, "diff": "..."}
  },
  "strategy": [
    {
      "category": "timing|format|content|engagement|audience|opportunity|outlier",
      "title": "Título curto (max 60 chars)",
      "insight": "Padrão encontrado com evidência numérica",
      "evidence": "Os números que comprovam",
      "interpretation": "Por que isso importa para a estratégia",
      "confidence": "high|medium|low",
      "impact": "high|medium|low"
    }
  ],
  "actions": [
    {
      "action": "Ação específica e testável",
      "why": "Baseado em qual dado",
      "expected_impact": "Resultado esperado com base nos números",
      "priority": "high|medium|low"
    }
  ],
  "period_comparison": {
    "trend": "growth|drop|stable",
    "er_change": "+X% ou -X%",
    "impressions_change": "+X% ou -X%",
    "what_changed": "Explicação baseada em dados",
    "possible_reasons": ["razão 1", "razão 2"]
  }
}`
}

export default function AIInsights() {
  const metrics = useStore((s) => s.metrics)
  const enriched = metrics.map(enrichMetric)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState(0)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cio-anthropic-key') || '')
  const [showKeyInput, setShowKeyInput] = useState(false)

  const canGenerate = enriched.length >= 3

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setInsights(null)
    setPhase(0)

    const interval = setInterval(() => {
      setPhase(p => (p + 1) % PHASES.length)
    }, 2500)

    try {
      if (!apiKey) throw new Error('Configure sua API key clicando no ícone de chave abaixo.')

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
          max_tokens: 4000,
          messages: [{ role: 'user', content: buildPrompt(enriched) }],
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error?.message || `Erro da API: ${res.status}`)
      }

      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida da IA')

      const cleaned = jsonMatch[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
      const parsed = JSON.parse(cleaned)

      if (!parsed.analysis && !parsed.strategy) throw new Error('Resposta incompleta da IA')
      setInsights(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-orange-500 blur-3xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-blue-500 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-orange-400" />
            <h2 className="text-base font-bold">Insights com IA</h2>
          </div>
          <p className="text-sm text-gray-300 max-w-xl mb-4">
            Análise profunda dos seus dados com inteligência artificial. Cada insight é baseado em padrões reais — sem frases genéricas.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Analisando...</>
              ) : (
                <><Zap size={14} /> {insights ? 'Regenerar Insights' : 'Gerar Insights com IA'}</>
              )}
            </button>
            {!canGenerate && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle size={12} /> Mínimo 3 posts para gerar insights
              </span>
            )}
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`p-2 rounded-xl border transition-colors ${apiKey ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300' : 'border-red-400/50 bg-red-500/20 text-red-300'}`}
              title={apiKey ? 'API Key configurada' : 'Configurar API Key'}
            >
              <Key size={14} />
            </button>
            <span className="text-xs text-gray-400 ml-auto">{enriched.length} posts analisados</span>
          </div>
          {showKeyInput && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-white/10 rounded-xl border border-white/20">
              <Key size={14} className="text-gray-400 shrink-0" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg outline-none text-white placeholder-gray-500 focus:border-orange-400"
              />
              <button
                onClick={() => {
                  localStorage.setItem('cio-anthropic-key', apiKey)
                  setShowKeyInput(false)
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                <Check size={12} /> Salvar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Sparkles size={20} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 mb-1">{PHASES[phase]}</p>
            <p className="text-xs text-gray-400">Analisando {enriched.length} posts com IA</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-5 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={16} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && insights && (
        <div className="space-y-6">

          {/* ═══ SECTION 1: Data Analysis ═══ */}
          {insights.analysis && (
            <div className="space-y-3 animate-slide-up">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600"><Database size={16} /></div>
                <h3 className="text-sm font-bold text-gray-900">{SECTION_STYLES.analysis.label}</h3>
              </div>

              {/* Top Performers */}
              {insights.analysis.top_performers?.length > 0 && (
                <div className="card border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1"><TrendingUp size={12} /> Top Performers</p>
                  {insights.analysis.top_performers.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">#{p.post_idx}</span>
                      <div>
                        <p className="text-xs text-gray-700">{p.why}</p>
                        {p.standout_metric && <p className="text-[10px] text-emerald-600 mt-0.5">Destaque: {p.standout_metric}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Performers */}
              {insights.analysis.bottom_performers?.length > 0 && (
                <div className="card border border-red-200 bg-red-50 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1"><AlertCircle size={12} /> Bottom Performers</p>
                  {insights.analysis.bottom_performers.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs font-bold text-red-700 bg-red-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">#{p.post_idx}</span>
                      <div>
                        <p className="text-xs text-gray-700">{p.why}</p>
                        {p.weakness && <p className="text-[10px] text-red-600 mt-0.5">Fraqueza: {p.weakness}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Outliers */}
              {insights.analysis.outliers?.length > 0 && (
                <div className="card border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1"><Zap size={12} /> Outliers</p>
                  {insights.analysis.outliers.map((o, i) => (
                    <div key={i} className="text-xs text-gray-700">
                      Post <span className="font-bold">#{o.post_idx}</span> — {o.metric}: <span className="font-semibold">{o.value}</span> (vs média: {o.vs_average})
                    </div>
                  ))}
                </div>
              )}

              {/* Gap */}
              {insights.analysis.gap && (
                <div className="card border border-blue-200 bg-blue-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Gap entre Melhor e Pior</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-700">Melhor ER: <b>{insights.analysis.gap.best_er}%</b></span>
                    <span className="text-red-700">Pior ER: <b>{insights.analysis.gap.worst_er}%</b></span>
                    <span className="text-gray-700">{insights.analysis.gap.diff}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ SECTION 2: Strategy ═══ */}
          {insights.strategy?.length > 0 && (
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600"><Brain size={16} /></div>
                <h3 className="text-sm font-bold text-gray-900">{SECTION_STYLES.strategy.label}</h3>
              </div>
              {insights.strategy.map((s, idx) => {
                const style = CATEGORY_STYLES[s.category] || CATEGORY_STYLES.engagement
                const Icon = style.icon
                return (
                  <div key={idx} className={`card border ${style.border} ${style.bg} p-0 overflow-hidden`}>
                    <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100/50">
                      <div className={`p-1.5 rounded-lg ${style.iconBg} ${style.iconColor}`}><Icon size={14} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>
                            {CATEGORY_LABELS[s.category] || s.category}
                          </span>
                          {s.confidence === 'high' && <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Alta confiança</span>}
                          {s.impact === 'high' && <span className="text-[9px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Alto impacto</span>}
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mt-1">{s.title}</h4>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex gap-2.5">
                        <div className="w-1 rounded-full bg-gray-300 shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Padrão</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{s.insight}</p>
                        </div>
                      </div>
                      {s.evidence && (
                        <div className="flex gap-2.5">
                          <div className="w-1 rounded-full bg-blue-300 shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-0.5">Evidência</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{s.evidence}</p>
                          </div>
                        </div>
                      )}
                      {s.interpretation && (
                        <div className="flex gap-2.5">
                          <div className="w-1 rounded-full bg-purple-300 shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-0.5">Interpretação</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{s.interpretation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══ SECTION 3: Growth Actions ═══ */}
          {insights.actions?.length > 0 && (
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600"><Rocket size={16} /></div>
                <h3 className="text-sm font-bold text-gray-900">{SECTION_STYLES.growth.label}</h3>
              </div>
              {insights.actions.map((a, idx) => {
                const priorityColors = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-gray-100 text-gray-600 border-gray-200' }
                const priorityLabels = { high: 'Prioridade Alta', medium: 'Prioridade Média', low: 'Prioridade Baixa' }
                return (
                  <div key={idx} className="card border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5"><ArrowRight size={14} /></span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{a.action}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityColors[a.priority] || priorityColors.medium}`}>
                            {priorityLabels[a.priority] || a.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600"><span className="font-medium text-gray-700">Por quê:</span> {a.why}</p>
                        <p className="text-xs text-gray-600 mt-1"><span className="font-medium text-orange-700">Impacto esperado:</span> {a.expected_impact}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══ SECTION 4: Period Comparison ═══ */}
          {insights.period_comparison && (
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600"><GitCompare size={16} /></div>
                <h3 className="text-sm font-bold text-gray-900">{SECTION_STYLES.comparison.label}</h3>
              </div>
              {(() => {
                const pc = insights.period_comparison
                const trendColors = { growth: 'bg-emerald-100 text-emerald-700 border-emerald-300', drop: 'bg-red-100 text-red-700 border-red-300', stable: 'bg-blue-100 text-blue-700 border-blue-300' }
                const trendLabels = { growth: 'Crescimento', drop: 'Queda', stable: 'Estável' }
                return (
                  <div className="card border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${trendColors[pc.trend] || trendColors.stable}`}>
                        {trendLabels[pc.trend] || pc.trend}
                      </span>
                      {pc.er_change && <span className="text-xs text-gray-600">ER: <b>{pc.er_change}</b></span>}
                      {pc.impressions_change && <span className="text-xs text-gray-600">Impressões: <b>{pc.impressions_change}</b></span>}
                    </div>
                    {pc.what_changed && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">O que mudou</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{pc.what_changed}</p>
                      </div>
                    )}
                    {pc.possible_reasons?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Possíveis razões</p>
                        <ul className="space-y-1">
                          {pc.possible_reasons.map((r, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-1.5"><ChevronRight size={12} className="text-emerald-500 shrink-0 mt-0.5" />{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

        </div>
      )}

      {/* Empty state */}
      {!loading && !insights && !error && canGenerate && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Sparkles size={28} className="text-gray-400" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Pronto para analisar</h3>
          <p className="text-gray-400 text-sm max-w-sm mb-4">
            Clique em "Gerar Insights com IA" para receber análises baseadas nos seus {enriched.length} posts reais.
          </p>
        </div>
      )}

      {!loading && !canGenerate && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-amber-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Dados insuficientes</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            Adicione pelo menos 3 registros de métricas para gerar insights com IA.
          </p>
        </div>
      )}
    </div>
  )
}
