import { useState } from 'react'
import {
  Sparkles, Loader2, Eye, TrendingUp, Target,
  Calendar, BarChart2, Zap, ChevronRight, RefreshCw,
  AlertCircle, Lightbulb, ArrowRight,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'

const PHASES = [
  'Analisando padrões de engajamento...',
  'Comparando formatos e tipos de post...',
  'Identificando tendências temporais...',
  'Cruzando dados de audiência...',
  'Formulando recomendações baseadas em dados...',
]

const CATEGORY_STYLES = {
  timing:      { icon: Calendar,   bg: 'bg-violet-50',  border: 'border-violet-200', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  format:      { icon: BarChart2,  bg: 'bg-indigo-50',  border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  content:     { icon: Lightbulb,  bg: 'bg-amber-50',   border: 'border-amber-200',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  engagement:  { icon: TrendingUp, bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  audience:    { icon: Eye,        bg: 'bg-blue-50',    border: 'border-blue-200',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  opportunity: { icon: Target,     bg: 'bg-orange-50',  border: 'border-orange-200',  iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
}

const CATEGORY_LABELS = {
  timing: 'Timing', format: 'Formato', content: 'Conteúdo',
  engagement: 'Engajamento', audience: 'Audiência', opportunity: 'Oportunidade',
}

function buildPrompt(enriched) {
  // Prepare data summary for the AI
  const totalPosts = enriched.length
  const avgER = (enriched.reduce((s, m) => s + m.engagement_rate, 0) / totalPosts * 100).toFixed(2)
  const totalImpressions = enriched.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = enriched.reduce((s, m) => s + m.engagement, 0)

  // Top 5 posts
  const top5 = [...enriched].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)
  // Bottom 5 posts
  const bottom5 = [...enriched].sort((a, b) => a.engagement_rate - b.engagement_rate).slice(0, 5)

  // Format breakdown
  const formatMap = {}
  enriched.forEach(m => {
    const t = m.post_type || 'desconhecido'
    if (!formatMap[t]) formatMap[t] = { count: 0, impressions: 0, engagement: 0, er_sum: 0, shares: 0, saves: 0 }
    formatMap[t].count++
    formatMap[t].impressions += m.impressions
    formatMap[t].engagement += m.engagement
    formatMap[t].er_sum += m.engagement_rate
    formatMap[t].shares += m.shares || 0
    formatMap[t].saves += m.saves || 0
  })

  // Day of week breakdown
  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const dayMap = {}
  enriched.forEach(m => {
    if (!m.date) return
    const d = new Date(m.date + 'T12:00:00').getDay()
    const name = DAY_NAMES[d]
    if (!dayMap[name]) dayMap[name] = { count: 0, er_sum: 0, impressions: 0 }
    dayMap[name].count++
    dayMap[name].er_sum += m.engagement_rate
    dayMap[name].impressions += m.impressions
  })

  // Timeline trend
  const sorted = [...enriched].sort((a, b) => new Date(a.date) - new Date(b.date))
  const half = Math.floor(sorted.length / 2)
  const firstHalfER = half > 0 ? sorted.slice(0, half).reduce((s, m) => s + m.engagement_rate, 0) / half : 0
  const secondHalfER = sorted.length - half > 0 ? sorted.slice(half).reduce((s, m) => s + m.engagement_rate, 0) / (sorted.length - half) : 0

  return `Você é um analista de conteúdo digital. Analise os dados reais abaixo e gere insights ACIONÁVEIS.

REGRAS OBRIGATÓRIAS:
- Cada insight DEVE ser baseado em um padrão real nos dados fornecidos
- NÃO use linguagem genérica ou motivacional
- Cada insight deve ter: observação (dado concreto), interpretação (o que significa), ação (o que fazer)
- Cite números específicos dos dados
- Se não houver padrão claro, diga explicitamente
- Máximo 8 insights, mínimo 4
- Categorias possíveis: timing, format, content, engagement, audience, opportunity

DADOS DO CRIADOR:
- Total de posts: ${totalPosts}
- Taxa de engajamento média: ${avgER}%
- Total de impressões: ${totalImpressions.toLocaleString()}
- Total de engajamento: ${totalEngagement.toLocaleString()}
- Engajamento primeira metade do período: ${(firstHalfER * 100).toFixed(2)}%
- Engajamento segunda metade do período: ${(secondHalfER * 100).toFixed(2)}%

TOP 5 POSTS (por taxa de engajamento):
${top5.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 80)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%, Impressões: ${m.impressions}, Curtidas: ${m.likes}, Compart.: ${m.shares || 0}, Salvamentos: ${m.saves || 0}, Data: ${m.date}`).join('\n')}

BOTTOM 5 POSTS (menor engajamento):
${bottom5.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 80)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%, Impressões: ${m.impressions}, Data: ${m.date}`).join('\n')}

POR FORMATO:
${Object.entries(formatMap).map(([type, d]) => `- ${type}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%, Impressões médias: ${Math.round(d.impressions / d.count)}, Compart. médio: ${(d.shares / d.count).toFixed(1)}, Salvamentos médio: ${(d.saves / d.count).toFixed(1)}`).join('\n')}

POR DIA DA SEMANA:
${Object.entries(dayMap).map(([day, d]) => `- ${day}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%, Impressões médias: ${Math.round(d.impressions / d.count)}`).join('\n')}

Responda EXCLUSIVAMENTE com JSON válido neste formato:
{
  "insights": [
    {
      "category": "timing|format|content|engagement|audience|opportunity",
      "title": "Título curto e direto (max 60 chars)",
      "observation": "O dado concreto observado, com números",
      "interpretation": "O que esse dado significa para a estratégia de conteúdo",
      "action": "Ação específica e prática que o criador deve tomar",
      "confidence": "high|medium|low",
      "impact": "high|medium|low"
    }
  ]
}`
}

export default function AIInsights() {
  const metrics = useStore((s) => s.metrics)
  const enriched = metrics.map(enrichMetric)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState(0)

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
      const apiKey = localStorage.getItem('cio-anthropic-key')
      if (!apiKey) throw new Error('Configure sua API key nas configurações.')

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

      if (!parsed.insights?.length) throw new Error('Nenhum insight gerado')
      setInsights(parsed.insights)
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
            <span className="text-xs text-gray-400 ml-auto">{enriched.length} posts analisados</span>
          </div>
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
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-gray-900">{insights.length} Insights Baseados em Dados</h3>
            <div className="flex gap-1.5 flex-wrap">
              {[...new Set(insights.map(i => i.category))].map(cat => {
                const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.engagement
                return (
                  <span key={cat} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Insight cards */}
          <div className="space-y-3">
            {insights.map((insight, idx) => {
              const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.engagement
              const Icon = style.icon
              return (
                <div
                  key={idx}
                  className={`card border ${style.border} ${style.bg} p-0 overflow-hidden animate-slide-up`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Title bar */}
                  <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100/50">
                    <div className={`p-1.5 rounded-lg ${style.iconBg} ${style.iconColor}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>
                          {CATEGORY_LABELS[insight.category] || insight.category}
                        </span>
                        {insight.confidence === 'high' && (
                          <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Alta confiança</span>
                        )}
                        {insight.impact === 'high' && (
                          <span className="text-[9px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Alto impacto</span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mt-1">{insight.title}</h4>
                    </div>
                  </div>

                  {/* Body — 3 sections */}
                  <div className="px-5 py-4 space-y-3">
                    {/* Observation */}
                    <div className="flex gap-2.5">
                      <div className="w-1 rounded-full bg-gray-300 shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Observação</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{insight.observation}</p>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="flex gap-2.5">
                      <div className="w-1 rounded-full bg-blue-300 shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-0.5">Interpretação</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{insight.interpretation}</p>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex gap-2.5">
                      <div className="w-1 rounded-full bg-orange-400 shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-0.5">Ação</p>
                        <p className="text-xs text-gray-900 font-medium leading-relaxed">{insight.action}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
