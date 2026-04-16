import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import {
  Eye, Heart, Share2, Bookmark, TrendingUp, AlertCircle, Target, Zap,
  ExternalLink, ChevronDown, Palette, Download, Filter,
} from 'lucide-react'
import useStore from '../../store/useStore'
import {
  getTop10Posts, getBottom5Posts, getMostConvertingContent, getMostActiveTimes,
  getEngagementMetrics, generateStrategicInsights, generateNextMonthRecommendations,
  getDemographicsOverview,
} from '../../utils/reportAnalytics'

const COLORS = ['#f97316', '#fb923c', '#2563eb', '#0891b2', '#059669', '#d97706', '#ec4899', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow-xl">
      <p className="text-gray-600 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}: <strong>{Number(p.value).toLocaleString()}</strong></span>
        </div>
      ))}
    </div>
  )
}

function BrandSettings({ brand, setBrand }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card p-4 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full hover:opacity-70 transition"
      >
        <Palette size={18} className="text-orange-500" />
        <span className="font-semibold text-gray-900">Identidade Visual</span>
        <ChevronDown size={16} className={`ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Cor Primária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brand.primaryColor}
                onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-500">{brand.primaryColor}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Font</label>
            <input
              type="text"
              value={brand.font}
              onChange={(e) => setBrand({ ...brand, font: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              placeholder="ex: Arial"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Logo URL</label>
            <input
              type="text"
              value={brand.logoUrl}
              onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Empresa</label>
            <input
              type="text"
              value={brand.company}
              onChange={(e) => setBrand({ ...brand, company: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              placeholder="Nome"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail, color = 'orange' }) {
  const colors = {
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    pink: { bg: 'bg-pink-100', icon: 'text-pink-600' },
  }
  const c = colors[color] || colors.orange

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className={`${c.bg} p-2 rounded-lg ${c.icon}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
          {detail && <p className="text-xs text-gray-400 mt-1">{detail}</p>}
        </div>
      </div>
    </div>
  )
}

function PostCard({ metric, platform = 'instagram' }) {
  const platformColors = {
    instagram: 'bg-pink-50 border-pink-200',
    facebook: 'bg-blue-50 border-blue-200',
    tiktok: 'bg-gray-900 border-gray-800',
  }

  return (
    <div className={`card p-3 border ${platformColors[platform]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">{metric.post?.title || 'Post'}</h4>
          <div className="flex gap-2 mt-2 text-xs text-gray-500">
            <span>📊 {metric.impressions.toLocaleString()}</span>
            <span>💬 {metric.engagement.toLocaleString()}</span>
            <span className={metric.engagement_rate > 0.03 ? 'text-emerald-600' : 'text-gray-500'}>
              {(metric.engagement_rate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <a
          href={`https://instagram.com/p/${metric.id.slice(0, 8)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-500 hover:text-pink-700 transition"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  )
}

export default function DynamicMetricsReport() {
  const posts = useStore((s) => s.posts)
  const metrics = useStore((s) => s.metrics)
  const [brand, setBrand] = useState({
    primaryColor: '#f97316',
    company: 'Minha Agência',
    font: 'Inter',
    logoUrl: '',
  })
  const [filterType, setFilterType] = useState('all')

  if (!metrics.length) {
    return (
      <div className="p-6 text-center py-20">
        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Nenhuma métrica registrada ainda.</p>
        <p className="text-sm text-gray-400">Adicione métricas na seção de Analytics para gerar relatórios.</p>
      </div>
    )
  }

  const instagramMetrics = metrics.filter((m) => m.platform === 'instagram')
  if (!instagramMetrics.length) {
    return (
      <div className="p-6 text-center py-20">
        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Nenhuma métrica do Instagram encontrada.</p>
        <p className="text-sm text-gray-400">Adicione métricas com plataforma "Instagram" para gerar este relatório.</p>
      </div>
    )
  }

  const top10 = getTop10Posts(posts, instagramMetrics)
  const bottom5 = getBottom5Posts(posts, instagramMetrics)
  const converting = getMostConvertingContent(posts, instagramMetrics)
  const activeTimes = getMostActiveTimes(instagramMetrics)
  const engMetrics = getEngagementMetrics(posts, instagramMetrics, filterType)
  const insights = generateStrategicInsights(posts, instagramMetrics)
  const recommendations = generateNextMonthRecommendations(posts, instagramMetrics)
  const demographics = getDemographicsOverview(instagramMetrics)

  return (
    <div className="p-6 space-y-6 animate-fade-in" style={{ fontFamily: brand.font }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório de Métricas</h1>
          <p className="text-gray-500 text-sm mt-1">Análise completa de performance do Instagram</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      {/* Brand Settings */}
      <BrandSettings brand={brand} setBrand={setBrand} />

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Eye}
          label="Total de Impressões"
          value={instagramMetrics.reduce((s, m) => s + m.impressions, 0).toLocaleString()}
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Engajamento Médio"
          value={engMetrics ? `${(engMetrics.avgEngagementRate * 100).toFixed(1)}%` : '0%'}
          color="emerald"
        />
        <StatCard
          icon={Heart}
          label="Total de Curtidas"
          value={engMetrics?.totalLikes.toLocaleString() || '0'}
          color="pink"
        />
        <StatCard
          icon={Bookmark}
          label="Total de Salvamentos"
          value={engMetrics?.totalSaves.toLocaleString() || '0'}
          color="blue"
        />
      </div>

      {/* Engagement Filter */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-orange-500" />
          <span className="font-semibold text-gray-900">Filtrar por Tipo</span>
        </div>
        <div className="flex gap-3">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'posts', label: 'Posts' },
            { value: 'stories', label: 'Stories' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                filterType === opt.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Engagement Timeline */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Engajamento ao Longo do Tempo</h3>
          {instagramMetrics.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={instagramMetrics.sort((a, b) => new Date(a.date) - new Date(b.date))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke={brand.primaryColor}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Impressões"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">Dados insuficientes</div>
          )}
        </div>

        {/* Demographics */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Gênero da Audiência</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={demographics.genders} cx="50%" cy="50%" outerRadius={60} dataKey="percentage">
                  {demographics.genders.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1 text-xs">
              {demographics.genders.map((d, i) => (
                <div key={d.gender} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-gray-600">{d.gender}: <strong>{d.percentage}%</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Cities */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Cidades</h3>
          <div className="space-y-2">
            {demographics.topCities.map((city, i) => (
              <div key={city.city} className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${city.percentage}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-12 text-right">{city.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Age Ranges */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Faixa Etária</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={demographics.ageRanges}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip />
              <Bar dataKey="percentage" fill={brand.primaryColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horários Mais Ativos */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Horários Mais Ativos</h3>
          <div className="space-y-2">
            {activeTimes.slice(0, 5).map((t, i) => (
              <div key={t.time} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.time}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min((t.engagement / Math.max(...activeTimes.map((x) => x.engagement))) * 100, 100)}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{t.engagement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 10 Posts */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">🏆 Top 10 Conteúdos (Mais Engajamento)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {top10.map((m, i) => (
            <div key={m.id} className="flex gap-3">
              <span className="text-2xl font-bold text-orange-500 w-8">{i + 1}</span>
              <PostCard metric={m} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom 5 Posts */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">📉 Bottom 5 Conteúdos (Menos Engajamento)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {bottom5.map((m, i) => (
            <div key={m.id} className="flex gap-3">
              <span className="text-2xl font-bold text-gray-400 w-8">{i + 1}</span>
              <PostCard metric={m} />
            </div>
          ))}
        </div>
      </div>

      {/* Most Converting */}
      {converting.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">🔗 Conteúdos que Mais Converteram</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {converting.map((m) => (
              <div key={m.id} className="border border-emerald-200 bg-emerald-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">{m.post?.title || 'Post'}</h4>
                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                      <span>🔗 {(m.link_clicks || 0).toLocaleString()} clicks</span>
                      <span>📊 {m.impressions.toLocaleString()}</span>
                    </div>
                  </div>
                  <a
                    href={`https://instagram.com/p/${m.id.slice(0, 8)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800 transition"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Insights */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap size={18} className="text-orange-500" /> Insights Estratégicos
        </h3>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'strength'
                  ? 'bg-emerald-50 border-emerald-500'
                  : insight.type === 'attention'
                    ? 'bg-amber-50 border-amber-500'
                    : 'bg-blue-50 border-blue-500'
              }`}
            >
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
              <p className="text-xs font-medium text-gray-700 mt-2 flex items-center gap-1">
                <Target size={14} /> Ação: {insight.actionPoint}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Next Month Recommendations */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">📋 Plano de Ação - Próximo Mês</h3>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-orange-200 transition">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.detail}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2 block">{rec.week}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-gray-400 text-xs border-t border-gray-200">
        <p>Relatório gerado por {brand.company} • Data: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
  )
}
