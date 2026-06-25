import { useState, useMemo } from 'react'
import {
  Users, Heart, Eye, Zap, TrendingUp, TrendingDown,
  Share2, Download, Search, Bell, ChevronDown,
  Instagram, Twitter, Linkedin, Youtube, BarChart2, Activity,
  Edit3, Check, X, Settings, AlertCircle,
} from 'lucide-react'
import Analytics from './Analytics'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import useStore from '../../store/useStore'
import { aggregateByPlatform, aggregateByDayOfWeek, timelineData, enrichMetric } from '../../utils/analytics'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  orange:  '#FF8C5F',
  purple:  '#A78BFA',
  blue:    '#60A5FA',
  green:   '#34D399',
  amber:   '#FBBF24',
  pink:    '#F472B6',
  indigo:  '#818CF8',
  teal:    '#2DD4BF',
  red:     '#F87171',
}

const PLATFORM_META = {
  instagram: { label: 'Instagram', icon: Instagram, color: C.purple },
  tiktok:    { label: 'TikTok',    icon: Zap,       color: C.pink   },
  linkedin:  { label: 'LinkedIn',  icon: Linkedin,  color: C.blue   },
  youtube:   { label: 'YouTube',   icon: Youtube,   color: '#FF0000'},
  twitter:   { label: 'X/Twitter', icon: Twitter,   color: C.indigo },
  x:         { label: 'X/Twitter', icon: Twitter,   color: C.indigo },
  facebook:  { label: 'Facebook',  icon: Users,     color: C.teal   },
}

const DEFAULT_FOLLOWERS = {
  instagram: '',
  tiktok: '',
  linkedin: '',
  youtube: '',
  twitter: '',
  facebook: '',
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}

function pct(n) {
  if (n == null || isNaN(n)) return '—'
  return (n * 100).toFixed(1) + '%'
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub, up }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">{label}</p>
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && (
        <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
          {up != null && (up ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
          {sub}
        </div>
      )}
    </div>
  )
}

const PeriodSelect = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="appearance-none text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg pl-3 pr-7 py-1.5 cursor-pointer outline-none transition-colors"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
  </div>
)

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.stroke }} />
          <span className="text-gray-500 capitalize">{p.name}:</span>
          <span className="font-semibold text-gray-800">{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Follower Editor ───────────────────────────────────────────────────────────
function FollowerEditor({ followers, onSave, onClose }) {
  const [local, setLocal] = useState({ ...followers })

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Seus Seguidores Reais</p>
          <p className="text-xs text-gray-400 mt-0.5">Digite o número atual de seguidores por plataforma</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(PLATFORM_META).filter(([k]) => k !== 'x').map(([key, { label, icon: Icon, color }]) => (
          <div key={key} className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Icon size={12} style={{ color }} />
              {label}
            </label>
            <input
              type="number"
              min="0"
              value={local[key] ?? ''}
              onChange={e => setLocal(p => ({ ...p, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
              placeholder="0"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button
          onClick={() => { onSave(local); onClose() }}
          className="text-xs px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 flex items-center gap-1.5"
        >
          <Check size={12} /> Salvar
        </button>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyMetrics() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div className="p-4 rounded-2xl bg-orange-50">
        <AlertCircle size={24} className="text-orange-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700">Sem dados importados</p>
      <p className="text-xs text-gray-400 max-w-xs">
        Importe suas métricas via CSV na aba <strong>Analytics CSV</strong> para ver dados reais de performance por plataforma.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SocialDashboard() {
  const [tab, setTab] = useState('overview')
  const [editingFollowers, setEditingFollowers] = useState(false)

  // Real data from store
  const posts    = useStore(s => s.posts)
  const metrics  = useStore(s => s.metrics)
  const profile  = useStore(s => s.creatorProfile)
  const setProfile = useStore(s => s.setCreatorProfile)

  // Followers stored in creatorProfile.followersByPlatform
  const followers = profile.followersByPlatform || DEFAULT_FOLLOWERS

  const saveFollowers = (data) => {
    setProfile({ ...profile, followersByPlatform: data })
  }

  const hasMetrics = metrics.length > 0

  // ── Computed real data ─────────────────────────────────────────────────────
  const byPlatform = useMemo(() => aggregateByPlatform(posts, metrics), [posts, metrics])
  const byDay      = useMemo(() => aggregateByDayOfWeek(metrics), [metrics])
  const timeline   = useMemo(() => timelineData(metrics), [metrics])

  // KPIs
  const totalFollowers = useMemo(() => {
    return Object.values(followers).reduce((sum, v) => sum + (Number(v) || 0), 0)
  }, [followers])

  const totalImpressions = useMemo(() => metrics.reduce((s, m) => s + (m.impressions || 0), 0), [metrics])
  const totalReach       = useMemo(() => metrics.reduce((s, m) => s + (m.reach || 0), 0), [metrics])
  const avgEngRate       = useMemo(() => {
    if (!metrics.length) return 0
    const sum = metrics.reduce((s, m) => s + enrichMetric(m).engagement_rate, 0)
    return sum / metrics.length
  }, [metrics])

  // Platform table data — merge followers + metrics
  const platformRows = useMemo(() => {
    const allKeys = new Set([
      ...byPlatform.map(p => p.platform?.toLowerCase()),
      ...Object.keys(followers).filter(k => Number(followers[k]) > 0),
    ])
    return [...allKeys].filter(Boolean).map(key => {
      const meta = PLATFORM_META[key] || { label: key, icon: Activity, color: C.orange }
      const perf = byPlatform.find(p => p.platform?.toLowerCase() === key) || {}
      return {
        key,
        ...meta,
        followers: Number(followers[key]) || 0,
        posts: perf.count || 0,
        impressions: perf.impressions || 0,
        engagement: perf.engagement || 0,
        engRate: perf.avg_engagement_rate || 0,
      }
    }).sort((a, b) => b.followers - a.followers)
  }, [byPlatform, followers])

  // Timeline — last 12 months grouped by month
  const timelineMonthly = useMemo(() => {
    const map = {}
    timeline.forEach(d => {
      const month = d.date?.slice(0, 7)
      if (!month) return
      if (!map[month]) map[month] = { month, impressions: 0, reach: 0, engagement: 0, count: 0 }
      map[month].impressions += d.impressions || 0
      map[month].reach += d.reach || 0
      map[month].engagement += d.engagement || 0
      map[month].count += 1
    })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(d => ({
      ...d,
      label: new Date(d.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    }))
  }, [timeline])

  // Engagement by day chart
  const engByDay = useMemo(() => byDay.map(d => ({
    day: d.day.slice(0, 3),
    engajamento: +(d.avg_engagement_rate * 100).toFixed(2),
    posts: d.count,
  })), [byDay])

  return (
    <div className="min-h-screen bg-[#F8F9FA] animate-fade-in">

      {/* Header */}
      <div className="px-6 pt-6 pb-0 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Visão consolidada de todas as plataformas</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingFollowers(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-200 transition-colors"
            >
              <Settings size={13} /> Configurar Seguidores
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('overview')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all ${tab === 'overview' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Activity size={13} /> Overview
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all ${tab === 'analytics' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart2 size={13} /> Analytics CSV
          </button>
        </div>
      </div>

      {/* Tab: Analytics CSV */}
      {tab === 'analytics' && (
        <div className="animate-fade-in">
          <Analytics embedded />
        </div>
      )}

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="p-6 space-y-6">

          {/* Follower Editor */}
          {editingFollowers && (
            <FollowerEditor
              followers={followers}
              onSave={saveFollowers}
              onClose={() => setEditingFollowers(false)}
            />
          )}

          {/* KPI Row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              icon={Users} iconBg="bg-violet-50" iconColor="text-violet-500"
              label="Total Seguidores"
              value={totalFollowers > 0 ? fmt(totalFollowers) : '—'}
              sub={totalFollowers > 0 ? 'soma de todas as plataformas' : 'configure seus seguidores'}
              up={totalFollowers > 0 ? true : null}
            />
            <KpiCard
              icon={Heart} iconBg="bg-pink-50" iconColor="text-pink-500"
              label="Engajamento Médio"
              value={hasMetrics ? pct(avgEngRate) : '—'}
              sub={hasMetrics ? `${metrics.length} posts analisados` : 'importe métricas'}
              up={hasMetrics}
            />
            <KpiCard
              icon={Eye} iconBg="bg-blue-50" iconColor="text-blue-500"
              label="Alcance Total"
              value={hasMetrics ? fmt(totalReach) : '—'}
              sub={hasMetrics ? 'soma dos posts importados' : 'importe métricas'}
              up={hasMetrics}
            />
            <KpiCard
              icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-500"
              label="Impressões Totais"
              value={hasMetrics ? fmt(totalImpressions) : '—'}
              sub={hasMetrics ? 'soma dos posts importados' : 'importe métricas'}
              up={hasMetrics}
            />
          </div>

          {!hasMetrics ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <EmptyMetrics />
            </div>
          ) : (
            <>
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Impressions Timeline — 2/3 */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="mb-5">
                    <p className="text-sm font-bold text-gray-900">Impressões ao longo do tempo</p>
                    <p className="text-xs text-gray-400 mt-0.5">Baseado nos posts importados</p>
                  </div>
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={timelineMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={42} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<ChartTip />} />
                      <Line type="monotone" dataKey="impressions" name="Impressões" stroke={C.purple} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="reach" name="Alcance" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Engagement by Platform — 1/3 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="mb-5">
                    <p className="text-sm font-bold text-gray-900">Engajamento por Plataforma</p>
                    <p className="text-xs text-gray-400 mt-0.5">Taxa média dos posts</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byPlatform.map(p => ({
                      name: PLATFORM_META[p.platform?.toLowerCase()]?.label || p.platform,
                      taxa: +(p.avg_engagement_rate * 100).toFixed(2),
                      fill: PLATFORM_META[p.platform?.toLowerCase()]?.color || C.orange,
                    }))} barSize={20} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip formatter={v => [v + '%', 'Taxa']} contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E5E7EB' }} />
                      <Bar dataKey="taxa" name="Taxa" radius={[0, 4, 4, 0]}>
                        {byPlatform.map((p, i) => (
                          <Cell key={i} fill={PLATFORM_META[p.platform?.toLowerCase()]?.color || C.orange} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Platform Performance Table */}
              {platformRows.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Performance por Plataforma</p>
                      <p className="text-xs text-gray-400 mt-0.5">Seguidores reais + métricas dos posts importados</p>
                    </div>
                    <button
                      onClick={() => setEditingFollowers(true)}
                      className="flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-700 font-medium"
                    >
                      <Edit3 size={11} /> Editar seguidores
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {['Plataforma', 'Seguidores', 'Posts', 'Impressões', 'Alcance', 'Engajamento'].map(h => (
                            <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {platformRows.map(({ key, label, icon: Icon, color, followers: f, posts: p, impressions, engagement, engRate }) => (
                          <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg" style={{ background: color + '18' }}>
                                  <Icon size={14} style={{ color }} />
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{label}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm font-bold text-gray-900">
                              {f > 0 ? fmt(f) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">{p || <span className="text-gray-300">—</span>}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">{impressions ? fmt(impressions) : <span className="text-gray-300">—</span>}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">{engagement ? fmt(engagement) : <span className="text-gray-300">—</span>}</td>
                            <td className="px-5 py-3.5">
                              {engRate > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(engRate * 1000, 100)}%`, background: color }} />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700">{pct(engRate)}</span>
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Engagement by Day of Week */}
              {engByDay.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="mb-5">
                    <p className="text-sm font-bold text-gray-900">Engajamento por Dia da Semana</p>
                    <p className="text-xs text-gray-400 mt-0.5">Taxa média de engajamento dos seus posts por dia</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={engByDay} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => v + '%'} />
                      <Tooltip formatter={v => [v + '%', 'Engajamento']} contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E5E7EB' }} />
                      <Bar dataKey="engajamento" name="Taxa" fill={C.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
