import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { Plus, TrendingUp, Eye, Heart, Share2, Bookmark, MousePointer, Trophy, Trash2, Download, Users, Globe } from 'lucide-react'
import Papa from 'papaparse'
import useStore from '../../store/useStore'
import MetricsForm from './MetricsForm'
import { enrichMetric, timelineData, aggregateByFormat, aggregateByPlatform, topPosts } from '../../utils/analytics'
import { PlatformBadge, FormatBadge } from '../common/Badge'
import InsightEngine from '../insights/InsightEngine'

const COLORS = ['#f97316', '#fb923c', '#2563eb', '#0891b2', '#059669', '#d97706']

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="text-gray-900 font-semibold">
            {p.dataKey === 'engagement_rate' ? `${p.value}%` : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color = 'orange' }) {
  const c = { orange: 'text-orange-500', blue: 'text-blue-500', emerald: 'text-emerald-600', amber: 'text-amber-500', pink: 'text-pink-500', sky: 'text-sky-500' }
  const bg = { orange: 'bg-orange-100', blue: 'bg-blue-100', emerald: 'bg-emerald-100', amber: 'bg-amber-100', pink: 'bg-pink-100', sky: 'bg-sky-100' }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg[color]} ${c[color]}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'posts', label: 'Posts' },
  { id: 'demograficos', label: 'Demográficos' },
  { id: 'insights', label: 'Insights' },
  { id: 'exportar', label: 'Exportar' },
]

export default function Analytics() {
  const posts = useStore((s) => s.posts)
  const metrics = useStore((s) => s.metrics)
  const deleteMetric = useStore((s) => s.deleteMetric)
  const deletePost = useStore((s) => s.deletePost)
  const demographics = useStore((s) => s.demographics)
  const setDemographics = useStore((s) => s.setDemographics)
  const [formOpen, setFormOpen] = useState(false)
  const [tab, setTab] = useState('visao-geral')
  const [exportDateFrom, setExportDateFrom] = useState('')
  const [exportDateTo, setExportDateTo] = useState('')
  const [exportPlatform, setExportPlatform] = useState('')
  const [demoClientId, setDemoClientId] = useState('global')

  const enriched = metrics.map(enrichMetric)
  const timeline = timelineData(metrics)
  const byFormat = aggregateByFormat(posts, metrics)
  const byPlatform = aggregateByPlatform(posts, metrics)
  const top = topPosts(posts, metrics, 5)

  const totalImpressions = enriched.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = enriched.reduce((s, m) => s + m.engagement, 0)
  const avgER = enriched.length ? (enriched.reduce((s, m) => s + m.engagement_rate, 0) / enriched.length * 100).toFixed(2) : '0.00'
  const totalAuthority = enriched.reduce((s, m) => s + m.authority_score, 0)
  const totalShares = enriched.reduce((s, m) => s + (m.shares || 0), 0)
  const totalSaves = enriched.reduce((s, m) => s + (m.saves || 0), 0)

  const formatChartData = byFormat.map((d) => ({
    name: d.format,
    impressions: d.impressions,
    'eng. rate %': +(d.avg_engagement_rate * 100).toFixed(2),
  }))

  const platformPieData = byPlatform.map((d) => ({ name: d.platform, value: d.impressions }))

  // Export CSV
  const handleExportCSV = () => {
    let data = enriched
    if (exportDateFrom) data = data.filter((m) => m.date >= exportDateFrom)
    if (exportDateTo) data = data.filter((m) => m.date <= exportDateTo)
    if (exportPlatform) data = data.filter((m) => m.platform === exportPlatform)
    const csv = Papa.unparse(data.map((m) => ({
      data: m.date,
      plataforma: m.platform,
      impressoes: m.impressions,
      alcance: m.reach,
      curtidas: m.likes,
      comentarios: m.comments,
      compartilhamentos: m.shares,
      salvamentos: m.saves,
      cliques: m.link_clicks,
      engajamento: m.engagement,
      taxa_engajamento: (m.engagement_rate * 100).toFixed(2) + '%',
    })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metricas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    window.print()
  }

  // Demo demographics state
  const demoCurrent = demographics[demoClientId] || {
    age: [{ range: '18-24', pct: 22 }, { range: '25-34', pct: 38 }, { range: '35-44', pct: 25 }, { range: '45-54', pct: 10 }, { range: '55+', pct: 5 }],
    gender: { female: 52, male: 44, other: 4 },
    countries: [{ name: 'Brasil', pct: 68 }, { name: 'Portugal', pct: 12 }, { name: 'EUA', pct: 8 }, { name: 'Argentina', pct: 6 }, { name: 'Outros', pct: 6 }],
    platforms: [{ name: 'LinkedIn', pct: 42 }, { name: 'Instagram', pct: 31 }, { name: 'YouTube', pct: 15 }, { name: 'Twitter', pct: 8 }, { name: 'TikTok', pct: 4 }],
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs py-1.5 px-3 rounded-md font-medium transition-all ${
                tab === t.id ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus size={15} /> Adicionar Métricas
        </button>
      </div>

      {/* ===== VISÃO GERAL ===== */}
      {tab === 'visao-geral' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <MiniStat icon={Eye} label="Impressões" value={totalImpressions.toLocaleString()} color="orange" />
            <MiniStat icon={TrendingUp} label="Eng. Médio" value={`${avgER}%`} color="emerald" />
            <MiniStat icon={Heart} label="Total Curtidas" value={enriched.reduce((s, m) => s + (m.likes || 0), 0).toLocaleString()} color="pink" />
            <MiniStat icon={Share2} label="Compartilhamentos" value={totalShares.toLocaleString()} color="blue" />
            <MiniStat icon={Bookmark} label="Salvamentos" value={totalSaves.toLocaleString()} color="amber" />
            <MiniStat icon={Trophy} label="Score Autoridade" value={totalAuthority.toLocaleString()} color="sky" />
          </div>

          {/* Gráficos linha 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Linha do Tempo de Desempenho</h3>
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<Tip />} />
                    <Legend iconSize={8} iconType="circle" />
                    <Area yAxisId="l" type="monotone" dataKey="impressions" name="Impressões" stroke="#f97316" fill="url(#gImp)" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                    <Area yAxisId="r" type="monotone" dataKey="engagement_rate" name="Eng. Rate %" stroke="#10b981" fill="url(#gEng)" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados ainda</div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Impressões por Plataforma</h3>
              {platformPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={platformPieData} cx="50%" cy="50%" outerRadius={65} innerRadius={40} paddingAngle={3} dataKey="value">
                        {platformPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {platformPieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="capitalize text-gray-500">{d.name}</span>
                        </div>
                        <span className="text-gray-700 font-medium">{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
              )}
            </div>
          </div>

          {/* Gráfico por formato */}
          {formatChartData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Desempenho por Formato</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={formatChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<Tip />} />
                  <Legend iconSize={8} iconType="circle" />
                  <Bar yAxisId="l" dataKey="impressions" name="Impressões" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="r" dataKey="eng. rate %" name="Eng. Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top posts */}
          {top.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Posts com Melhor Desempenho</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Post', 'Plataforma', 'Formato', 'Impressões', 'Engajamento', 'Taxa Eng.', 'Autoridade'].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((m, i) => (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-orange-50/50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{i + 1}.</span>
                            <span className="text-gray-800 font-medium truncate max-w-[180px]">{m.post?.title || 'Desconhecido'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3"><PlatformBadge platform={m.post?.platform || m.platform} /></td>
                        <td className="py-2.5 px-3"><FormatBadge format={m.post?.format || '—'} /></td>
                        <td className="py-2.5 px-3 text-gray-600">{m.impressions.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-gray-600">{m.engagement.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`font-semibold ${m.engagement_rate > 0.04 ? 'text-emerald-600' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {(m.engagement_rate * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{m.authority_score.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Log de métricas */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Todos os Snapshots de Métricas
              <span className="ml-2 text-xs text-gray-400 font-normal">{enriched.length} entradas</span>
            </h3>
            {enriched.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-400 text-sm">Nenhuma métrica registrada ainda.</p>
                <button onClick={() => setFormOpen(true)} className="btn-primary mt-3 mx-auto">
                  <Plus size={14} /> Adicionar Primeiras Métricas
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Data', 'Plataforma', 'Impressões', 'Alcance', 'Curtidas', 'Coment.', 'Compart.', 'Salvam.', 'Eng.', 'Taxa Eng.', ''].map((h) => (
                        <th key={h} className="text-left py-2 px-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...enriched].sort((a, b) => new Date(b.date) - new Date(a.date)).map((m) => (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-orange-50/50 group">
                        <td className="py-2 px-2.5 text-gray-400 whitespace-nowrap">{m.date}</td>
                        <td className="py-2 px-2.5"><PlatformBadge platform={m.platform} /></td>
                        <td className="py-2 px-2.5 text-gray-700">{m.impressions.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-gray-500">{m.reach.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-gray-500">{m.likes.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-gray-500">{m.comments.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-gray-500">{m.shares.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-gray-500">{m.saves.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-gray-700 font-medium">{m.engagement.toLocaleString()}</td>
                        <td className="py-2 px-2.5">
                          <span className={`font-semibold ${m.engagement_rate > 0.04 ? 'text-emerald-600' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {(m.engagement_rate * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2 px-2.5">
                          <button
                            onClick={() => deleteMetric(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== POSTS ===== */}
      {tab === 'posts' && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Posts Cadastrados
            <span className="ml-2 text-xs text-gray-400 font-normal">{posts.length} posts</span>
          </h3>
          {posts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Nenhum post ainda. Adicione métricas vinculadas a posts para começar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Título', 'Plataforma', 'Formato', 'Métricas', 'Status', ''].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => {
                    const postMetrics = metrics.filter((m) => m.post_id === p.id)
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-orange-50/50 group">
                        <td className="py-2.5 px-3 text-gray-800 font-medium truncate max-w-[200px]">{p.title}</td>
                        <td className="py-2.5 px-3"><PlatformBadge platform={p.platform} /></td>
                        <td className="py-2.5 px-3"><FormatBadge format={p.format} /></td>
                        <td className="py-2.5 px-3 text-gray-500">{postMetrics.length} snapshot{postMetrics.length !== 1 ? 's' : ''}</td>
                        <td className="py-2.5 px-3">
                          <span className={`chip border text-[10px] ${p.status === 'published' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {p.status === 'published' ? 'Publicado' : p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => deletePost(p.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                            title="Excluir post e métricas"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== DEMOGRÁFICOS ===== */}
      {tab === 'demograficos' && (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Users size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Análise Demográfica da Audiência</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Dados demográficos da sua audiência. Atualize manualmente com base nos insights das plataformas.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Faixa etária */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Faixa Etária</h4>
                <div className="space-y-2">
                  {demoCurrent.age.map((a) => (
                    <div key={a.range} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12 shrink-0">{a.range}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${a.pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{a.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gênero */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Gênero</h4>
                <div className="space-y-2">
                  {[['Feminino', demoCurrent.gender.female, 'bg-pink-400'], ['Masculino', demoCurrent.gender.male, 'bg-blue-400'], ['Outro', demoCurrent.gender.other, 'bg-gray-400']].map(([label, pct, color]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Países */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Globe size={12} /> Países
                </h4>
                <div className="space-y-2">
                  {demoCurrent.countries.map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plataformas */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Plataformas</h4>
                <div className="space-y-2">
                  {demoCurrent.platforms.map((p) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">{p.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
              Dica: Exporte seus dados demográficos do LinkedIn Insights, Instagram Insights ou YouTube Studio e atualize os valores acima manualmente para refletir sua audiência real.
            </p>
          </div>
        </div>
      )}

      {/* ===== INSIGHTS ===== */}
      {tab === 'insights' && (
        <InsightEngine embedded />
      )}

      {/* ===== EXPORTAR ===== */}
      {tab === 'exportar' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Download size={16} className="text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-900">Exportar Dados</h3>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Data Inicial</label>
                <input type="date" className="input" value={exportDateFrom} onChange={(e) => setExportDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Data Final</label>
                <input type="date" className="input" value={exportDateTo} onChange={(e) => setExportDateTo(e.target.value)} />
              </div>
              <div>
                <label className="label">Plataforma</label>
                <select className="select" value={exportPlatform} onChange={(e) => setExportPlatform(e.target.value)}>
                  <option value="">Todas</option>
                  {['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prévia */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500">
                Registros a exportar:{' '}
                <span className="font-semibold text-orange-600">
                  {enriched.filter((m) => {
                    if (exportDateFrom && m.date < exportDateFrom) return false
                    if (exportDateTo && m.date > exportDateTo) return false
                    if (exportPlatform && m.platform !== exportPlatform) return false
                    return true
                  }).length}
                </span>{' '}
                métricas
              </p>
            </div>

            {/* Botões de exportação */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleExportCSV} className="btn-primary flex items-center gap-2">
                <Download size={14} /> Exportar CSV
              </button>
              <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2">
                <Download size={14} /> Exportar / Imprimir PDF
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              O CSV contém todos os campos de métricas. Para PDF, use a função de impressão do navegador e selecione "Salvar como PDF".
            </p>
          </div>
        </div>
      )}

      <MetricsForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
