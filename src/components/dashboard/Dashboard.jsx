import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { Lightbulb, BarChart2, Eye, TrendingUp, Plus, ArrowRight, Sparkles, Radar, Zap } from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric, timelineData, aggregateByFormat } from '../../utils/analytics'
import { PlatformBadge, StatusBadge, PriorityBadge } from '../common/Badge'

const PIE_COLORS = ['#f97316', '#fb923c', '#fdba74', '#0891b2', '#059669']

function StatCard({ icon: Icon, label, value, sub, color = 'orange' }) {
  const colors = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  }
  const c = colors[color]
  return (
    <div className={`card p-5 border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon size={18} className={c.text} />
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-md">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="text-gray-900 font-medium">
            {p.dataKey === 'engagement_rate' ? `${p.value}%` : p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const ideas = useStore((s) => s.ideas)
  const posts = useStore((s) => s.posts)
  const metrics = useStore((s) => s.metrics)

  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0)
  const avgER = metrics.length
    ? (metrics.reduce((s, m) => s + enrichMetric(m).engagement_rate, 0) / metrics.length * 100).toFixed(1)
    : 0

  const statusCounts = {
    idea: ideas.filter((i) => i.status === 'idea').length,
    draft: ideas.filter((i) => i.status === 'draft').length,
    ready: ideas.filter((i) => i.status === 'ready').length,
    published: ideas.filter((i) => i.status === 'published').length,
  }

  const timeline = timelineData(metrics)
  const byFormat = aggregateByFormat(posts, metrics).map((d) => ({
    name: d.format,
    impressions: d.impressions,
    engagement: +(d.avg_engagement_rate * 100).toFixed(2),
  }))

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
  const recentIdeas = [...ideas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-orange-50/80 to-white border border-orange-200 p-6">
        <div className="relative z-10">
          <p className="text-xs text-orange-500 font-medium mb-1">Good morning, Creator</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your content system is running</h2>
          <p className="text-sm text-gray-500 mb-4">
            You have <span className="text-orange-600 font-medium">{statusCounts.ready} ideas</span> ready to publish
            and <span className="text-blue-600 font-medium">{statusCounts.draft} in draft</span>.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/ideas')} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} /> New Idea
            </button>
            <button onClick={() => navigate('/trends')} className="btn-secondary text-xs py-1.5 px-3">
              <Radar size={13} /> Explore Trends
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-orange-100/30 to-transparent pointer-events-none" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Lightbulb} label="Total Ideas" value={ideas.length} sub={`${statusCounts.idea} new`} color="orange" />
        <StatCard icon={BarChart2} label="Posts Tracked" value={posts.length} sub={`${metrics.length} snapshots`} color="blue" />
        <StatCard icon={Eye} label="Total Impressions" value={totalImpressions.toLocaleString()} sub="across all platforms" color="emerald" />
        <StatCard icon={TrendingUp} label="Avg Engagement" value={`${avgER}%`} sub="engagement rate" color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance timeline */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Performance Over Time</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Impressions & Engagement</span>
          </div>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#f97316" fill="url(#impGrad)" strokeWidth={2} name="Impressions" dot={{ fill: '#f97316', r: 3 }} />
                <Area yAxisId="right" type="monotone" dataKey="engagement_rate" stroke="#10b981" fill="url(#engGrad)" strokeWidth={2} name="Eng. Rate %" dot={{ fill: '#10b981', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No metrics yet — add posts and track performance</div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ideas by Status</h3>
          {ideas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {Object.entries(statusCounts).map(([status, count], i) => (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="capitalize text-gray-500">{status}</span>
                    </div>
                    <span className="text-gray-800 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No ideas yet</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Format performance */}
        {byFormat.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Engagement by Format</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byFormat} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="engagement" name="Eng. Rate %" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent ideas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Ideas</h3>
            <button onClick={() => navigate('/ideas')} className="btn-ghost text-xs py-1 px-2">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentIdeas.map((idea) => (
              <div key={idea.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{idea.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <PlatformBadge platform={idea.platform} />
                    <StatusBadge status={idea.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Sparkles, label: 'Generate Insights', sub: 'Analyze your metrics', to: '/insights', color: 'from-orange-50 to-orange-100/50 border-orange-200', iconColor: 'text-orange-500' },
          { icon: Radar, label: 'Explore Trends', sub: 'Find what\'s working', to: '/trends', color: 'from-blue-50 to-blue-100/50 border-blue-200', iconColor: 'text-blue-500' },
          { icon: Zap, label: 'Idea Loop', sub: 'AI-powered ideation', to: '/loop', color: 'from-amber-50 to-amber-100/50 border-amber-200', iconColor: 'text-amber-500' },
        ].map(({ icon: Icon, label, sub, to, color, iconColor }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`bg-gradient-to-br ${color} border rounded-xl p-4 text-left hover:scale-[1.01] transition-all duration-150`}
          >
            <Icon size={18} className={`${iconColor} mb-2`} />
            <div className="text-sm font-semibold text-gray-800">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
