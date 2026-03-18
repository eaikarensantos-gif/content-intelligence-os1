import { useState, useRef } from 'react'
import {
  Download, FileText, Calendar, User, Loader2, Sparkles,
  TrendingUp, Eye, Heart, Share2, Bookmark, Trophy,
  AlertCircle, Printer, ChevronRight, BarChart2,
  CheckCircle, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'

function buildReportPrompt(data) {
  const { enriched, clientName, periodLabel, totalImpressions, avgER, totalEngagement, top5, bottom3, formatBreakdown } = data
  return `Você é um consultor de conteúdo digital gerando um relatório para um cliente.

DADOS DO PERÍODO (${periodLabel}):
- Cliente/Projeto: ${clientName || 'Criador'}
- Posts analisados: ${enriched.length}
- Impressões totais: ${totalImpressions.toLocaleString()}
- Engajamento total: ${totalEngagement.toLocaleString()}
- Taxa de engajamento média: ${avgER}%

TOP 5 POSTS:
${top5.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 60)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%, Impressões: ${m.impressions}`).join('\n')}

${bottom3.length > 0 ? `POSTS COM MENOR DESEMPENHO:
${bottom3.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 60)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%`).join('\n')}` : ''}

POR FORMATO:
${formatBreakdown}

Gere um relatório executivo com:
1. executive_summary: 2-3 frases resumindo o período (direto, sem enrolação)
2. highlights: array de 3-4 destaques positivos do período (cada um com title e description curta)
3. concerns: array de 1-3 pontos de atenção (cada um com title e description curta)
4. recommendations: array de 3-5 recomendações práticas para o próximo período (cada uma com title, description, priority: high/medium/low)
5. next_content: array de 3 sugestões de conteúdo baseadas nos dados (cada uma com title, format, reason)

Responda EXCLUSIVAMENTE com JSON válido:
{
  "executive_summary": "...",
  "highlights": [{"title": "...", "description": "..."}],
  "concerns": [{"title": "...", "description": "..."}],
  "recommendations": [{"title": "...", "description": "...", "priority": "high|medium|low"}],
  "next_content": [{"title": "...", "format": "...", "reason": "..."}]
}`
}

function ReportPreview({ report, clientName, periodLabel, metrics, enriched }) {
  const totalImpressions = enriched.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = enriched.reduce((s, m) => s + m.engagement, 0)
  const avgER = enriched.length ? (enriched.reduce((s, m) => s + m.engagement_rate, 0) / enriched.length * 100).toFixed(2) : '0.00'
  const totalShares = enriched.reduce((s, m) => s + (m.shares || 0), 0)
  const totalSaves = enriched.reduce((s, m) => s + (m.saves || 0), 0)
  const top5 = [...enriched].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)

  // Trend
  const sorted = [...enriched].sort((a, b) => new Date(a.date) - new Date(b.date))
  const half = Math.floor(sorted.length / 2)
  const firstHalf = half > 0 ? sorted.slice(0, half).reduce((s, m) => s + m.engagement_rate, 0) / half * 100 : 0
  const secondHalf = sorted.length - half > 0 ? sorted.slice(half).reduce((s, m) => s + m.engagement_rate, 0) / (sorted.length - half) * 100 : 0
  const trendDir = secondHalf > firstHalf * 1.05 ? 'up' : secondHalf < firstHalf * 0.95 ? 'down' : 'stable'

  const fmtDate = (d) => {
    if (!d) return '—'
    try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <div id="report-content" className="space-y-6 print:space-y-4">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white print:bg-gray-900 print:rounded-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Relatório de Performance</p>
            <h1 className="text-xl font-bold mb-1">{clientName || 'Relatório de Conteúdo'}</h1>
            <p className="text-sm text-gray-300">{periodLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Gerado em</p>
            <p className="text-sm text-gray-200">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Posts', value: enriched.length, icon: FileText, color: 'orange' },
          { label: 'Impressões', value: totalImpressions.toLocaleString(), icon: Eye, color: 'blue' },
          { label: 'Engajamento', value: totalEngagement.toLocaleString(), icon: Heart, color: 'pink' },
          { label: 'Taxa Eng.', value: `${avgER}%`, icon: TrendingUp, color: 'emerald' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={16} className={`mx-auto mb-1.5 text-${color}-500`} />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-sm font-bold text-gray-900">{totalShares.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Compartilhamentos</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-sm font-bold text-gray-900">{totalSaves.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Salvamentos</p>
        </div>
        <div className="card p-3 text-center flex items-center justify-center gap-2">
          {trendDir === 'up' && <ArrowUpRight size={14} className="text-emerald-500" />}
          {trendDir === 'down' && <ArrowDownRight size={14} className="text-red-500" />}
          {trendDir === 'stable' && <Minus size={14} className="text-gray-400" />}
          <div>
            <p className="text-sm font-bold text-gray-900">{trendDir === 'up' ? 'Crescendo' : trendDir === 'down' ? 'Caindo' : 'Estável'}</p>
            <p className="text-[10px] text-gray-400">Tendência</p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card p-5 border-orange-200 bg-orange-50/50">
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FileText size={14} className="text-orange-500" /> Resumo Executivo
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">{report.executive_summary}</p>
      </div>

      {/* Highlights + Concerns side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Highlights */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500" /> Destaques do Período
          </h3>
          <div className="space-y-3">
            {report.highlights?.map((h, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{h.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Concerns */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" /> Pontos de Atenção
          </h3>
          <div className="space-y-3">
            {report.concerns?.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy size={14} className="text-orange-500" /> Top Posts do Período
        </h3>
        <div className="space-y-2">
          {top5.map((m, i) => {
            const erColor = m.engagement_rate > 0.04 ? 'text-emerald-600 bg-emerald-50' : m.engagement_rate > 0.02 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50'
            return (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate">{m.description || 'Sem descrição'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{fmtDate(m.date)}</span>
                    {m.post_type && <span className="text-[10px] text-gray-400 capitalize">{m.post_type}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">{m.impressions.toLocaleString()} imp.</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${erColor}`}>
                    {(m.engagement_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ChevronRight size={14} className="text-blue-500" /> Recomendações
        </h3>
        <div className="space-y-3">
          {report.recommendations?.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${priorityColors[r.priority] || priorityColors.medium}`}>
                {r.priority === 'high' ? 'Alta' : r.priority === 'low' ? 'Baixa' : 'Média'}
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Content */}
      {report.next_content?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" /> Sugestões de Conteúdo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {report.next_content.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-xs font-semibold text-gray-900 mb-1">{c.title}</p>
                <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded capitalize">{c.format}</span>
                <p className="text-[11px] text-gray-500 mt-2">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-300">Relatório gerado por Content Intelligence OS</p>
      </div>
    </div>
  )
}

export default function ReportBuilder() {
  const metrics = useStore((s) => s.metrics)
  const clients = useStore((s) => s.clients)
  const enriched = metrics.map(enrichMetric)

  const [clientName, setClientName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const filtered = enriched.filter(m => {
    if (dateFrom && m.date < dateFrom) return false
    if (dateTo && m.date > dateTo) return false
    return true
  })

  const canGenerate = filtered.length >= 2

  const periodLabel = (() => {
    if (dateFrom && dateTo) return `${dateFrom} a ${dateTo}`
    if (dateFrom) return `A partir de ${dateFrom}`
    if (dateTo) return `Até ${dateTo}`
    return 'Todo o período'
  })()

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const apiKey = localStorage.getItem('cio-anthropic-key')
      if (!apiKey) throw new Error('Configure sua API key nas configurações.')

      const totalImpressions = filtered.reduce((s, m) => s + m.impressions, 0)
      const totalEngagement = filtered.reduce((s, m) => s + m.engagement, 0)
      const avgER = filtered.length ? (filtered.reduce((s, m) => s + m.engagement_rate, 0) / filtered.length * 100).toFixed(2) : '0.00'
      const top5 = [...filtered].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)
      const bottom3 = [...filtered].sort((a, b) => a.engagement_rate - b.engagement_rate).slice(0, 3)

      const formatMap = {}
      filtered.forEach(m => {
        const t = m.post_type || 'desconhecido'
        if (!formatMap[t]) formatMap[t] = { count: 0, impressions: 0, er_sum: 0 }
        formatMap[t].count++
        formatMap[t].impressions += m.impressions
        formatMap[t].er_sum += m.engagement_rate
      })
      const formatBreakdown = Object.entries(formatMap).map(([type, d]) =>
        `- ${type}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%`
      ).join('\n')

      const prompt = buildReportPrompt({
        enriched: filtered, clientName, periodLabel,
        totalImpressions, avgER, totalEngagement,
        top5, bottom3, formatBreakdown,
      })

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
      setReport(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-5">
      {/* Config panel */}
      {!report && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <FileText size={18} className="text-orange-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Gerador de Relatório</h3>
              <p className="text-xs text-gray-400">Crie relatórios visuais prontos para compartilhar com clientes ou equipe</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="label">Cliente / Projeto</label>
              <input
                type="text"
                className="input"
                placeholder="Nome do cliente ou projeto..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Data Inicial</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Data Final</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 w-full text-center">
                <p className="text-lg font-bold text-orange-600">{filtered.length}</p>
                <p className="text-[10px] text-gray-400">Posts no período</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="btn-primary"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Gerando relatório...</>
              ) : (
                <><Sparkles size={14} /> Gerar Relatório com IA</>
              )}
            </button>
            {!canGenerate && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle size={12} /> Mínimo 2 posts no período selecionado
              </span>
            )}
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

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <FileText size={20} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Gerando relatório executivo...</p>
            <p className="text-xs text-gray-400 mt-1">Analisando {filtered.length} posts e formulando recomendações</p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
            <button
              onClick={() => setReport(null)}
              className="btn-secondary text-xs"
            >
              Novo Relatório
            </button>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                <Printer size={14} /> Imprimir / PDF
              </button>
            </div>
          </div>

          <ReportPreview
            report={report}
            clientName={clientName}
            periodLabel={periodLabel}
            metrics={filtered}
            enriched={filtered}
          />
        </>
      )}
    </div>
  )
}
