import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { Plus, TrendingUp, Eye, Heart, Share2, Bookmark, MousePointer, Trophy, Trash2, Download, AlertTriangle, ExternalLink, Film, Image, Play, Layers, ChevronUp, ChevronDown, ChevronsUpDown, UserPlus } from 'lucide-react'
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

const POST_TYPE_STYLES = {
  story:    'bg-purple-100 text-purple-700 border-purple-200',
  reel:     'bg-pink-100 text-pink-700 border-pink-200',
  carousel: 'bg-orange-100 text-orange-700 border-orange-200',
  image:    'bg-sky-100 text-sky-700 border-sky-200',
  video:    'bg-blue-100 text-blue-700 border-blue-200',
}
const POST_TYPE_ICONS = { story: Film, reel: Play, carousel: Layers, image: Image, video: Play }
function PostTypeBadge({ type }) {
  if (!type) return null
  const style = POST_TYPE_STYLES[type] || 'bg-gray-100 text-gray-500 border-gray-200'
  const Icon = POST_TYPE_ICONS[type]
  const labels = { story: 'Story', reel: 'Reel', carousel: 'Carrossel', image: 'Imagem', video: 'Vídeo' }
  return (
    <span className={`chip border text-[10px] inline-flex items-center gap-1 capitalize ${style}`}>
      {Icon && <Icon size={9} />}
      {labels[type] || type}
    </span>
  )
}

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'posts', label: 'Posts' },
  { id: 'insights', label: 'Insights' },
  { id: 'exportar', label: 'Exportar' },
]

export default function Analytics() {
  const posts = useStore((s) => s.posts)
  const metrics = useStore((s) => s.metrics)
  const deleteMetric = useStore((s) => s.deleteMetric)
  const deletePost = useStore((s) => s.deletePost)
  const clearMetrics = useStore((s) => s.clearMetrics)
  const [confirmClear, setConfirmClear] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [tab, setTab] = useState('visao-geral')
  const [filterPostType, setFilterPostType] = useState('') // '' = todos, 'story' = stories, 'feed' = feed
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [exportDateFrom, setExportDateFrom] = useState('')
  const [exportDateTo, setExportDateTo] = useState('')
  const [exportPlatform, setExportPlatform] = useState('')
  const [postTabSearch, setPostTabSearch] = useState('')
  const [postTabPlatform, setPostTabPlatform] = useState('')
  const [postTabType, setPostTabType] = useState('')
  const [postTabDateFrom, setPostTabDateFrom] = useState('')
  const [postTabDateTo, setPostTabDateTo] = useState('')
  const [postTabSort, setPostTabSort] = useState('date') // date, engagement, impressions, likes

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
  const totalFollows = enriched.reduce((s, m) => s + (m.follows || 0), 0)

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
      tipo: m.post_type || '',
      descricao: m.description || '',
      impressoes: m.impressions,
      alcance: m.reach,
      curtidas: m.likes,
      comentarios: m.comments,
      compartilhamentos: m.shares,
      salvamentos: m.saves,
      seguimentos: m.follows || 0,
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat icon={Eye} label="Impressões" value={totalImpressions.toLocaleString()} color="orange" />
            <MiniStat icon={TrendingUp} label="Eng. Médio" value={`${avgER}%`} color="emerald" />
            <MiniStat icon={Heart} label="Total Curtidas" value={enriched.reduce((s, m) => s + (m.likes || 0), 0).toLocaleString()} color="pink" />
            <MiniStat icon={Share2} label="Compartilhamentos" value={totalShares.toLocaleString()} color="blue" />
            <MiniStat icon={Bookmark} label="Salvamentos" value={totalSaves.toLocaleString()} color="amber" />
            <MiniStat icon={UserPlus} label="Seguimentos" value={totalFollows.toLocaleString()} color="sky" />
            <MiniStat icon={Trophy} label="Score Autoridade" value={totalAuthority.toLocaleString()} color="orange" />
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
          {(() => {
            const SORT_COLS = [
              { key: 'date', label: 'Data', sortable: true },
              { key: 'post_type', label: 'Tipo', sortable: false },
              { key: 'platform', label: 'Plataforma', sortable: false },
              { key: 'description', label: 'Descrição', sortable: false },
              { key: 'impressions', label: 'Impressões', sortable: true },
              { key: 'reach', label: 'Alcance', sortable: true },
              { key: 'likes', label: 'Curtidas', sortable: true },
              { key: 'comments', label: 'Coment.', sortable: true },
              { key: 'shares', label: 'Compart.', sortable: true },
              { key: 'saves', label: 'Salvam.', sortable: true },
              { key: 'follows', label: 'Seguim.', sortable: true },
              { key: 'engagement', label: 'Eng.', sortable: true },
              { key: 'engagement_rate', label: 'Taxa Eng.', sortable: true },
              { key: '_del', label: '', sortable: false },
            ]

            const handleSort = (col) => {
              if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
              else { setSortBy(col); setSortDir('desc') }
            }

            // "2026-02-12" → "12/02"
            const fmtDate = (d) => {
              if (!d) return '—'
              const parts = d.split('-')
              return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d
            }

            const SortIcon = ({ col }) => {
              if (!col.sortable) return null
              if (sortBy !== col.key) return <ChevronsUpDown size={10} className="text-gray-300 ml-0.5" />
              return sortDir === 'asc'
                ? <ChevronUp size={10} className="text-orange-500 ml-0.5" />
                : <ChevronDown size={10} className="text-orange-500 ml-0.5" />
            }

            const sorted = [...enriched]
              .filter((m) => {
                if (!filterPostType) return true
                if (filterPostType === 'story') return m.post_type === 'story'
                if (filterPostType === 'feed') return m.post_type !== 'story'
                return true
              })
              .sort((a, b) => {
                let va = a[sortBy], vb = b[sortBy]
                if (sortBy === 'date') { va = new Date(va); vb = new Date(vb) }
                else { va = Number(va) || 0; vb = Number(vb) || 0 }
                if (va < vb) return sortDir === 'asc' ? -1 : 1
                if (va > vb) return sortDir === 'asc' ? 1 : -1
                return 0
              })

            return (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Todos os Snapshots de Métricas
                    <span className="ml-2 text-xs text-gray-400 font-normal">{enriched.length} entradas</span>
                  </h3>
                  {enriched.length > 0 && (
                    confirmClear ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500">Apagar tudo?</span>
                        <button onClick={() => { clearMetrics(); setConfirmClear(false) }} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Confirmar</button>
                        <button onClick={() => setConfirmClear(false)} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        <AlertTriangle size={12} /> Limpar todos os dados
                      </button>
                    )
                  )}
                </div>

                {/* Filtro por tipo */}
                {enriched.some((m) => m.post_type) && (
                  <div className="flex gap-1.5 mb-4">
                    {[
                      { id: '', label: 'Todos' },
                      { id: 'story', label: 'Stories' },
                      { id: 'feed', label: 'Feed' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setFilterPostType(id)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          filterPostType === id
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {enriched.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">Nenhuma métrica registrada ainda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {SORT_COLS.map((col) => (
                            <th
                              key={col.key}
                              className={`text-left py-2 px-2.5 text-gray-400 font-medium whitespace-nowrap select-none ${col.sortable ? 'cursor-pointer hover:text-orange-600 transition-colors' : ''}`}
                              onClick={() => col.sortable && handleSort(col.key)}
                            >
                              <span className="inline-flex items-center">
                                {col.label}
                                <SortIcon col={col} />
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((m) => (
                          <tr key={m.id} className="border-b border-gray-100 hover:bg-orange-50/50 group">
                            <td className="py-2 px-2.5 text-gray-400 whitespace-nowrap">{fmtDate(m.date)}</td>
                            <td className="py-2 px-2.5"><PostTypeBadge type={m.post_type} /></td>
                            <td className="py-2 px-2.5"><PlatformBadge platform={m.platform} /></td>
                            <td className="py-2 px-2.5 max-w-[200px]">
                              <div className="flex items-center gap-1.5">
                                {m.description ? (
                                  <span className="text-gray-500 truncate block" title={m.description}>
                                    {m.description.slice(0, 50)}{m.description.length > 50 ? '…' : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                                {m.link && (
                                  <a
                                    href={m.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-600"
                                    title="Abrir post"
                                  >
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-gray-700">{m.impressions.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.reach.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.likes.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.comments.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.shares.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.saves.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.follows || 0).toLocaleString()}</td>
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
            )
          })()}
        </>
      )}

      {/* ===== POSTS ===== */}
      {tab === 'posts' && (() => {
        const filteredPostsView = enriched
          .filter((m) => {
            if (postTabType && m.post_type !== postTabType) return false
            if (postTabPlatform && m.platform !== postTabPlatform) return false
            if (postTabSearch && !m.description?.toLowerCase().includes(postTabSearch.toLowerCase())) return false
            if (postTabDateFrom && m.date < postTabDateFrom) return false
            if (postTabDateTo && m.date > postTabDateTo) return false
            return true
          })
          .sort((a, b) => {
            if (postTabSort === 'date') return new Date(b.date || 0) - new Date(a.date || 0)
            if (postTabSort === 'engagement') return (b.engagement || 0) - (a.engagement || 0)
            if (postTabSort === 'impressions') return (b.impressions || 0) - (a.impressions || 0)
            if (postTabSort === 'likes') return (b.likes || 0) - (a.likes || 0)
            if (postTabSort === 'engagement_rate') return (b.engagement_rate || 0) - (a.engagement_rate || 0)
            return 0
          })

        const bestImpressions = enriched.length ? Math.max(...enriched.map((m) => m.impressions)) : 0
        const fmtDate = (d) => {
          if (!d) return '—'
          try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
          catch { return d }
        }

        return (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center border border-orange-100">
                <p className="text-2xl font-bold text-gray-900">{enriched.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Entradas de Métricas</p>
              </div>
              <div className="card p-4 text-center border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-600">{avgER}%</p>
                <p className="text-xs text-gray-400 mt-0.5">Eng. Médio</p>
              </div>
              <div className="card p-4 text-center border border-blue-100">
                <p className="text-2xl font-bold text-blue-600">{bestImpressions.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">Melhor Alcance</p>
              </div>
            </div>

            {/* Filters */}
            <div className="card p-4 space-y-3">
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  className="input text-xs py-1.5 flex-1 min-w-[180px]"
                  placeholder="Buscar por descrição…"
                  value={postTabSearch}
                  onChange={(e) => setPostTabSearch(e.target.value)}
                />
                <select
                  className="select text-xs py-1.5 w-40"
                  value={postTabPlatform}
                  onChange={(e) => setPostTabPlatform(e.target.value)}
                >
                  <option value="">Todas plataformas</option>
                  {['instagram', 'linkedin', 'twitter', 'youtube', 'tiktok'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <select
                  className="select text-xs py-1.5 w-36"
                  value={postTabType}
                  onChange={(e) => setPostTabType(e.target.value)}
                >
                  <option value="">Todos os tipos</option>
                  {['story', 'reel', 'carousel', 'image', 'video'].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">De:</span>
                  <input
                    type="date"
                    className="input text-xs py-1 w-36"
                    value={postTabDateFrom}
                    onChange={(e) => setPostTabDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">Até:</span>
                  <input
                    type="date"
                    className="input text-xs py-1 w-36"
                    value={postTabDateTo}
                    onChange={(e) => setPostTabDateTo(e.target.value)}
                  />
                </div>
                <select
                  className="select text-xs py-1.5 w-44"
                  value={postTabSort}
                  onChange={(e) => setPostTabSort(e.target.value)}
                >
                  <option value="date">Ordenar: Mais recente</option>
                  <option value="engagement">Ordenar: Mais engajamento</option>
                  <option value="impressions">Ordenar: Mais impressões</option>
                  <option value="likes">Ordenar: Mais curtidas</option>
                  <option value="engagement_rate">Ordenar: Melhor taxa eng.</option>
                </select>
                {(postTabSearch || postTabPlatform || postTabType || postTabDateFrom || postTabDateTo) && (
                  <button
                    onClick={() => { setPostTabSearch(''); setPostTabPlatform(''); setPostTabType(''); setPostTabDateFrom(''); setPostTabDateTo('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">{filteredPostsView.length} resultado{filteredPostsView.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Cards */}
            {filteredPostsView.length === 0 ? (
              <div className="card p-14 text-center">
                <BarChart2 size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-1">
                  {enriched.length === 0 ? 'Nenhuma métrica registrada ainda.' : 'Nenhum resultado para os filtros aplicados.'}
                </p>
                {enriched.length === 0 && (
                  <>
                    <p className="text-xs text-gray-300 mb-4">Importe um CSV ou adicione métricas manualmente para ver seus posts aqui.</p>
                    <button onClick={() => setFormOpen(true)} className="btn-primary mx-auto">
                      <Plus size={14} /> Adicionar Métricas
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPostsView.map((m) => {
                  const erColor = m.engagement_rate > 0.04 ? 'bg-emerald-500' : m.engagement_rate > 0.02 ? 'bg-amber-400' : 'bg-gray-300'
                  const erTextColor = m.engagement_rate > 0.04 ? 'text-emerald-600' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'
                  const erBg = m.engagement_rate > 0.04 ? 'bg-emerald-50' : m.engagement_rate > 0.02 ? 'bg-amber-50' : 'bg-gray-50'
                  return (
                    <div key={m.id} className="card p-4 group relative hover:shadow-md transition-all duration-150 overflow-hidden">
                      {/* Left engagement bar */}
                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${erColor}`} />
                      <div className="pl-3">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <PostTypeBadge type={m.post_type} />
                            <PlatformBadge platform={m.platform} />
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {m.link && (
                              <a
                                href={m.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-600 p-1 rounded transition-colors"
                                title="Abrir post"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                            <button
                              onClick={() => deleteMetric(m.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Date */}
                        <p className="text-[11px] text-gray-400 mb-2">
                          📅 {fmtDate(m.date)}
                          {m.duration_sec > 0 && <span className="ml-2 text-gray-300">· {m.duration_sec}s</span>}
                        </p>

                        {/* Description */}
                        <p className="text-xs text-gray-700 line-clamp-2 mb-3 min-h-[2rem]">
                          {m.description || <span className="text-gray-300 italic">Sem descrição</span>}
                        </p>

                        {/* Main stats */}
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          <div className="bg-orange-50 rounded-lg p-2 text-center">
                            <p className="text-xs font-bold text-orange-600 leading-none">{m.impressions.toLocaleString()}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">Impressões</p>
                          </div>
                          <div className="bg-pink-50 rounded-lg p-2 text-center">
                            <p className="text-xs font-bold text-pink-600 leading-none">{(m.likes || 0).toLocaleString()}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">Curtidas</p>
                          </div>
                          <div className={`${erBg} rounded-lg p-2 text-center`}>
                            <p className={`text-xs font-bold leading-none ${erTextColor}`}>{(m.engagement_rate * 100).toFixed(1)}%</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">Eng. Rate</p>
                          </div>
                        </div>

                        {/* Secondary stats */}
                        {(m.shares > 0 || m.saves > 0 || m.comments > 0 || m.reach > 0 || m.follows > 0) && (
                          <div className="flex items-center gap-2.5 text-[10px] text-gray-400 flex-wrap">
                            {m.reach > 0 && <span className="flex items-center gap-0.5"><Eye size={9} />{m.reach.toLocaleString()}</span>}
                            {m.comments > 0 && <span className="flex items-center gap-0.5"><MousePointer size={9} />{m.comments}</span>}
                            {m.shares > 0 && <span className="flex items-center gap-0.5"><Share2 size={9} />{m.shares}</span>}
                            {m.saves > 0 && <span className="flex items-center gap-0.5"><Bookmark size={9} />{m.saves}</span>}
                            {m.follows > 0 && <span className="flex items-center gap-0.5"><UserPlus size={9} />{m.follows}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}


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
