import { useState } from 'react'
import {
  Sparkles, Loader2, Calendar, TrendingUp, Zap, AlertCircle,
  ChevronRight, Trophy, Lightbulb, Clock, Target, Key, Check,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'

function getLastNDays(n) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - n)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function buildPrompt(topPosts, allPosts, period) {
  const topData = topPosts.map((m, i) =>
    `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 120)}" | ER: ${(m.engagement_rate * 100).toFixed(2)}% | Imp: ${m.impressions} | Likes: ${m.likes} | Saves: ${m.saves || 0} | Shares: ${m.shares || 0} | Data: ${m.date}`
  ).join('\n')

  const formatMap = {}
  allPosts.forEach(m => {
    const t = m.post_type || 'desconhecido'
    if (!formatMap[t]) formatMap[t] = { count: 0, er_sum: 0, imp: 0 }
    formatMap[t].count++
    formatMap[t].er_sum += m.engagement_rate
    formatMap[t].imp += m.impressions
  })
  const formatSummary = Object.entries(formatMap).map(([type, d]) =>
    `- ${type}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%, Impressões média: ${Math.round(d.imp / d.count)}`
  ).join('\n')

  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const dayMap = {}
  allPosts.forEach(m => {
    if (!m.date) return
    const d = new Date(m.date + 'T12:00:00').getDay()
    const name = DAY_NAMES[d]
    if (!dayMap[name]) dayMap[name] = { count: 0, er_sum: 0 }
    dayMap[name].count++
    dayMap[name].er_sum += m.engagement_rate
  })
  const daySummary = Object.entries(dayMap)
    .sort((a, b) => (b[1].er_sum / b[1].count) - (a[1].er_sum / a[1].count))
    .map(([day, d]) => `- ${day}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%`)
    .join('\n')

  return `Você é um estrategista de conteúdo digital. Analise os posts que mais performaram nos últimos ${period} dias e sugira um plano de conteúdo para a PRÓXIMA SEMANA (7 dias).

═══ TOP POSTS DO PERÍODO (${period} dias) ═══
${topData}

═══ PERFORMANCE POR FORMATO ═══
${formatSummary}

═══ PERFORMANCE POR DIA DA SEMANA ═══
${daySummary}

═══ TOTAL: ${allPosts.length} posts no período ═══

REGRAS:
1. Baseie CADA sugestão em dados concretos dos top posts
2. Indique o MELHOR DIA e FORMATO para cada post baseado nos dados
3. Explique POR QUÊ aquele tema/formato vai funcionar (cite números)
4. Sugira de 5 a 7 posts para a semana
5. Inclua variações dos temas que mais performaram + 1-2 temas novos para testar

Responda EXCLUSIVAMENTE com JSON válido:
{
  "weekly_summary": {
    "best_format": "formato que mais performou",
    "best_day": "dia da semana com melhor ER",
    "avg_er": "ER médio do período",
    "top_theme": "tema/assunto que mais engajou"
  },
  "suggestions": [
    {
      "day": "Segunda|Terça|...",
      "title": "Título curto do post sugerido",
      "format": "Reel|Carrossel|Story|Post estático",
      "theme": "Tema baseado nos dados",
      "why": "Por que vai funcionar (com números do período)",
      "reference_post": "Qual top post inspirou esta sugestão",
      "priority": "high|medium|low"
    }
  ],
  "test_ideas": [
    {
      "title": "Ideia experimental para testar",
      "format": "formato sugerido",
      "hypothesis": "O que espera validar com este teste"
    }
  ]
}`
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PRIORITY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' }

export default function WeeklyPlanner() {
  const metrics = useStore((s) => s.metrics)
  const enriched = metrics.map(enrichMetric)

  const [period, setPeriod] = useState(28)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cio-anthropic-key') || '')
  const [showKeyInput, setShowKeyInput] = useState(false)

  // Usa a data do post mais recente como referência (não "hoje")
  const sortedByDate = [...enriched].filter(m => m.date).sort((a, b) => b.date.localeCompare(a.date))
  const latestDate = sortedByDate[0]?.date || new Date().toISOString().slice(0, 10)
  const cutoff = (() => {
    const d = new Date(latestDate + 'T12:00:00')
    d.setDate(d.getDate() - period)
    return d.toISOString().slice(0, 10)
  })()
  const postsInPeriod = enriched.filter(m => m.date && m.date >= cutoff)
  const topPosts = [...postsInPeriod].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 10)

  const canGenerate = topPosts.length >= 2

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setPlan(null)

    try {
      if (!apiKey) throw new Error('Configure sua API key clicando no ícone de chave.')

      const prompt = buildPrompt(topPosts, postsInPeriod, period)

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
          messages: [{ role: 'user', content: prompt }],
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

      if (!parsed.suggestions?.length) throw new Error('Nenhuma sugestão gerada')
      setPlan(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-orange-500 blur-3xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-blue-500 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-orange-400" />
            <h2 className="text-base font-bold">Planejador Semanal</h2>
          </div>
          <p className="text-sm text-gray-300 max-w-xl mb-4">
            Analisa os posts que mais performaram e sugere conteúdos para a próxima semana — baseado em dados reais.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Period selector */}
            <div className="flex gap-1 bg-white/10 rounded-xl p-1">
              {[7, 14, 28].map(d => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === d ? 'bg-white text-orange-700' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Analisando...</>
              ) : (
                <><Sparkles size={14} /> {plan ? 'Regenerar Plano' : 'Gerar Plano da Semana'}</>
              )}
            </button>

            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`p-2 rounded-xl border transition-colors ${apiKey ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300' : 'border-red-400/50 bg-red-500/20 text-red-300'}`}
              title={apiKey ? 'API Key configurada' : 'Configurar API Key'}
            >
              <Key size={14} />
            </button>

            {!canGenerate && (
              <span className="text-xs text-amber-300 flex items-center gap-1">
                <AlertCircle size={12} /> Mínimo 2 posts nos últimos {period} dias
              </span>
            )}

            <span className="text-xs text-gray-400 ml-auto">{postsInPeriod.length} posts nos últimos {period} dias</span>
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
                onClick={() => { localStorage.setItem('cio-anthropic-key', apiKey); setShowKeyInput(false) }}
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
            <Calendar size={20} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <p className="text-sm text-gray-600">Analisando top posts e gerando plano semanal...</p>
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
      {!loading && plan && (
        <div className="space-y-5">

          {/* Weekly Summary */}
          {plan.weekly_summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3.5 text-center">
                <Trophy size={16} className="text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">{plan.weekly_summary.best_format}</p>
                <p className="text-[10px] text-gray-400">Melhor formato</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3.5 text-center">
                <Calendar size={16} className="text-orange-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">{plan.weekly_summary.best_day}</p>
                <p className="text-[10px] text-gray-400">Melhor dia</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3.5 text-center">
                <TrendingUp size={16} className="text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">{plan.weekly_summary.avg_er}</p>
                <p className="text-[10px] text-gray-400">ER médio</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3.5 text-center">
                <Zap size={16} className="text-orange-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900 line-clamp-1">{plan.weekly_summary.top_theme}</p>
                <p className="text-[10px] text-gray-400">Tema top</p>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {plan.suggestions?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600"><Lightbulb size={16} /></div>
                <h3 className="text-sm font-bold text-gray-900">Sugestões para a Próxima Semana</h3>
              </div>
              {plan.suggestions.map((s, idx) => (
                <div key={idx} className="card border border-orange-100 bg-gradient-to-r from-orange-50/50 to-white p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 text-orange-600 rounded-lg px-2 py-1 text-[10px] font-bold shrink-0">
                      {s.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{s.title}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">{s.format}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[s.priority] || PRIORITY_COLORS.medium}`}>
                          {PRIORITY_LABELS[s.priority] || s.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600"><span className="font-medium text-gray-700">Tema:</span> {s.theme}</p>
                      <p className="text-xs text-gray-600 mt-1"><span className="font-medium text-orange-700">Por quê:</span> {s.why}</p>
                      {s.reference_post && (
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <ChevronRight size={10} /> Baseado em: {s.reference_post}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Test Ideas */}
          {plan.test_ideas?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600"><Target size={16} /></div>
                <h3 className="text-sm font-bold text-gray-900">Ideias para Testar</h3>
              </div>
              {plan.test_ideas.map((t, idx) => (
                <div key={idx} className="card border border-amber-100 bg-amber-50/50 p-4">
                  <div className="flex items-start gap-2">
                    <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{t.title}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">{t.format}</span>
                      </div>
                      <p className="text-xs text-gray-600"><span className="font-medium text-amber-700">Hipótese:</span> {t.hypothesis}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !plan && !error && canGenerate && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Calendar size={28} className="text-orange-400" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Pronto para planejar</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            Selecione o período e clique em "Gerar Plano da Semana" para receber sugestões baseadas nos seus {postsInPeriod.length} posts.
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
            Importe pelo menos 2 posts com métricas nos últimos {period} dias para gerar o plano semanal.
          </p>
        </div>
      )}
    </div>
  )
}
