import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { Plus, TrendingUp, Eye, Heart, Share2, Bookmark, MousePointer, Trophy } from 'lucide-react'
import useStore from '../../store/useStore'
import MetricsForm from './MetricsForm'
import { enrichMetric, timelineData, aggregateByFormat, aggregateByPlatform, topPosts } from '../../utils/analytics'
import { PlatformBadge, FormatBadge } from '../common/Badge'

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

export default function Analytics() {
  const posts = useStore((s) => s.posts)
  const metrics = useStore((s) => s.metrics)
  const deleteMetric = useStore((s) => s.deleteMetric)
  const [formOpen, setFormOpen] = useState(false)

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

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus size={15} /> Add Metrics
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MiniStat icon={Eye} label="Impressions" value={totalImpressions.toLocaleString()} color="orange" />
        <MiniStat icon={TrendingUp} label="Avg Eng. Rate" value={`${avgER}%`} color="emerald" />
        <MiniStat icon={Heart} label="Total Likes" value={enriched.reduce((s, m) => s + (m.likes || 0), 0).toLocaleString()} color="pink" />
        <MiniStat icon={Share2} label="Shares" value={totalShares.toLocaleString()} color="blue" />
        <MiniStat icon={Bookmark} label="Saves" value={totalSaves.toLocaleString()} color="amber" />
        <MiniStat icon={Trophy} label="Authority Score" value={totalAuthority.toLocaleString()} color="sky" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Performance Timeline</h3>
          </div>
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
                <Area yAxisId="l" type="monotone" dataKey="impressions" name="Impressions" stroke="#f97316" fill="url(#gImp)" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                <Area yAxisId="r" type="monotone" dataKey="engagement_rate" name="Eng. Rate %" stroke="#10b981" fill="url(#gEng)" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Platform distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Impressions by Platform</h3>
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
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      {formatChartData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance by Format</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formatChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<Tip />} />
              <Legend iconSize={8} iconType="circle" />
              <Bar yAxisId="l" dataKey="impressions" name="Impressions" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="r" dataKey="eng. rate %" name="Eng. Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top posts table */}
      {top.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Performing Posts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  {['Post', 'Platform', 'Format', 'Impressions', 'Engagement', 'Eng. Rate', 'Authority'].map((h) => (
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
                        <span className="text-gray-800 font-medium truncate max-w-[180px]">{m.post?.title || 'Unknown'}</span>
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

      {/* All metrics log */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          All Metric Snapshots
          <span className="ml-2 text-xs text-gray-400 font-normal">{enriched.length} entries</span>
        </h3>
        {enriched.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No metrics recorded yet.</p>
            <button onClick={() => setFormOpen(true)} className="btn-primary mt-3 mx-auto">
              <Plus size={14} /> Add First Metrics
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  {['Date', 'Platform', 'Impressions', 'Reach', 'Likes', 'Comments', 'Shares', 'Saves', 'Eng.', 'Eng. Rate'].map((h) => (
                    <th key={h} className="text-left py-2 px-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...enriched].sort((a, b) => new Date(b.date) - new Date(a.date)).map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-orange-50/50">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MetricsForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
