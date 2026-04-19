import { useState } from 'react'
import {
  Users, Heart, Eye, Zap, TrendingUp, TrendingDown,
  Share2, Download, Search, Bell, ChevronDown,
  Instagram, Twitter, Linkedin, Youtube,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

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
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const AUDIENCE_GROWTH = {
  '6M': [
    { month: 'Nov', instagram: 4200, facebook: 1800, tiktok: 3100, linkedin: 950 },
    { month: 'Dez', instagram: 4800, facebook: 1950, tiktok: 3900, linkedin: 1050 },
    { month: 'Jan', instagram: 5100, facebook: 2100, tiktok: 4700, linkedin: 1200 },
    { month: 'Fev', instagram: 5600, facebook: 2050, tiktok: 5400, linkedin: 1350 },
    { month: 'Mar', instagram: 6200, facebook: 2200, tiktok: 6100, linkedin: 1500 },
    { month: 'Abr', instagram: 7100, facebook: 2400, tiktok: 7300, linkedin: 1750 },
  ],
  '3M': [
    { month: 'Fev', instagram: 5600, facebook: 2050, tiktok: 5400, linkedin: 1350 },
    { month: 'Mar', instagram: 6200, facebook: 2200, tiktok: 6100, linkedin: 1500 },
    { month: 'Abr', instagram: 7100, facebook: 2400, tiktok: 7300, linkedin: 1750 },
  ],
  '1M': [
    { month: 'Abr', instagram: 7100, facebook: 2400, tiktok: 7300, linkedin: 1750 },
  ],
}

const SENTIMENT_DATA = [
  { name: 'Positivo',  value: 64, color: C.green  },
  { name: 'Neutro',    value: 24, color: C.blue   },
  { name: 'Negativo',  value: 12, color: C.orange },
]

const PLATFORMS = [
  { name: 'Instagram', icon: Instagram, color: C.purple,  followers: '47.2K', growth: '+8.4%',  engagement: '4.2%',  reach: '182K', posts: 24, up: true  },
  { name: 'TikTok',    icon: Zap,       color: C.pink,    followers: '31.8K', growth: '+15.1%', engagement: '6.8%',  reach: '241K', posts: 18, up: true  },
  { name: 'LinkedIn',  icon: Linkedin,  color: C.blue,    followers: '12.4K', growth: '+3.2%',  engagement: '2.1%',  reach: '48K',  posts: 12, up: true  },
  { name: 'YouTube',   icon: Youtube,   color: '#FF0000', followers: '8.9K',  growth: '-1.2%',  engagement: '1.8%',  reach: '31K',  posts: 4,  up: false },
  { name: 'X',         icon: Twitter,   color: C.indigo,  followers: '6.1K',  growth: '+0.5%',  engagement: '0.9%',  reach: '14K',  posts: 31, up: true  },
]

// Heatmap: [hour][day] — values 0–10
const DAYS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS  = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h']
const HEATMAP = [
  // Sun   Mon  Tue  Wed  Thu  Fri  Sat
  [  1,    3,   3,   2,   3,   2,   1 ], // 06h
  [  2,    5,   6,   6,   5,   4,   2 ], // 08h
  [  3,    6,   7,   8,   7,   6,   3 ], // 10h
  [  4,    7,   9,   10,  9,   7,   5 ], // 12h
  [  3,    5,   6,   7,   6,   5,   4 ], // 14h
  [  2,    5,   5,   6,   5,   5,   3 ], // 16h
  [  5,    8,   9,   9,   8,   8,   6 ], // 18h
  [  7,    9,   8,   8,   7,   8,   8 ], // 20h
  [  6,    6,   5,   5,   5,   6,   7 ], // 22h
]

function heatColor(v) {
  if (v >= 9) return 'bg-violet-600 text-white'
  if (v >= 7) return 'bg-violet-400 text-white'
  if (v >= 5) return 'bg-violet-200 text-violet-800'
  if (v >= 3) return 'bg-violet-100 text-violet-600'
  return 'bg-gray-100 text-gray-400'
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, delta, up }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">{label}</p>
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {delta} vs mês anterior
      </div>
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
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-500 capitalize">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SocialDashboard() {
  const [growthPeriod, setGrowthPeriod] = useState('6M')
  const [sentimentPeriod, setSentimentPeriod] = useState('30 dias')
  const [platformPeriod, setPlatformPeriod] = useState('Este mês')

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão consolidada de todas as plataformas</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 w-48 placeholder:text-gray-400"
              placeholder="Buscar métricas..."
            />
          </div>
          <button className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <Bell size={15} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={13} /> Exportar
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all hover:opacity-90 shadow-sm"
            style={{ background: C.orange }}>
            <Share2 size={13} /> Compartilhar
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Users}     iconBg="bg-violet-50" iconColor="text-violet-500" label="Total Seguidores" value="106.4K" delta="+7.2%"  up />
        <KpiCard icon={Heart}     iconBg="bg-pink-50"   iconColor="text-pink-500"   label="Engajamento"      value="3.8%"   delta="+0.4pp" up />
        <KpiCard icon={Eye}       iconBg="bg-blue-50"   iconColor="text-blue-500"   label="Alcance Mensal"   value="516K"   delta="+12.1%" up />
        <KpiCard icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-500"  label="Impressões"       value="1.24M"  delta="+9.3%"  up />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Audience Growth — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-900">Crescimento da Audiência</p>
              <p className="text-xs text-gray-400 mt-0.5">Novos seguidores por plataforma</p>
            </div>
            <PeriodSelect value={growthPeriod} onChange={setGrowthPeriod} options={['1M', '3M', '6M']} />
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={AUDIENCE_GROWTH[growthPeriod]} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={38} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="instagram" name="Instagram" fill={C.purple}  radius={[4, 4, 0, 0]} />
              <Bar dataKey="tiktok"    name="TikTok"    fill={C.pink}    radius={[4, 4, 0, 0]} />
              <Bar dataKey="linkedin"  name="LinkedIn"  fill={C.blue}    radius={[4, 4, 0, 0]} />
              <Bar dataKey="facebook"  name="Facebook"  fill={C.teal}    radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {[['Instagram', C.purple], ['TikTok', C.pink], ['LinkedIn', C.blue], ['Facebook', C.teal]].map(([name, color]) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-[11px] text-gray-500">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Sentiment — 1/3 width */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-900">Sentimento</p>
              <p className="text-xs text-gray-400 mt-0.5">Análise de comentários</p>
            </div>
            <PeriodSelect value={sentimentPeriod} onChange={setSentimentPeriod} options={['7 dias', '30 dias', '90 dias']} />
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={SENTIMENT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {SENTIMENT_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [`${v}%`, n]}
                contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E5E7EB' }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-2">
            {SENTIMENT_DATA.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-gray-600">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">Performance por Plataforma</p>
            <p className="text-xs text-gray-400 mt-0.5">Métricas consolidadas do período</p>
          </div>
          <PeriodSelect value={platformPeriod} onChange={setPlatformPeriod} options={['Esta semana', 'Este mês', 'Últimos 3 meses']} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Plataforma', 'Seguidores', 'Crescimento', 'Engajamento', 'Alcance', 'Posts'].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {PLATFORMS.map(({ name, icon: Icon, color, followers, growth, engagement, reach, posts, up }) => (
                <tr key={name} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg" style={{ background: color + '18' }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{followers}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {growth}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${parseFloat(engagement) * 10}%`, background: color }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{engagement}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{reach}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{posts}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Demographics + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Age Demographics */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-900">Faixa Etária</p>
              <p className="text-xs text-gray-400 mt-0.5">Distribuição da audiência</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { age: '18–24', pct: 22, color: C.purple },
              { age: '25–34', pct: 38, color: C.orange },
              { age: '35–44', pct: 24, color: C.blue   },
              { age: '45–54', pct: 11, color: C.green  },
              { age: '55+',   pct:  5, color: C.amber  },
            ].map(({ age, pct, color }) => (
              <div key={age} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">{age}</span>
                  <span className="text-xs font-bold text-gray-800">{pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="text-center p-2.5 bg-violet-50 rounded-xl">
              <p className="text-xs text-gray-500">Feminino</p>
              <p className="text-lg font-bold text-violet-600">68%</p>
            </div>
            <div className="text-center p-2.5 bg-blue-50 rounded-xl">
              <p className="text-xs text-gray-500">Masculino</p>
              <p className="text-lg font-bold text-blue-600">32%</p>
            </div>
          </div>
        </div>

        {/* Heatmap — Optimal Posting Time */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-900">Melhor Horário para Postar</p>
              <p className="text-xs text-gray-400 mt-0.5">Engajamento médio por hora e dia</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Baixo</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-200 inline-block" /> Médio</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-600 inline-block" /> Alto</span>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid gap-1" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
            <div />
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 pb-1">{d}</div>
            ))}

            {HEATMAP.map((row, hi) => (
              <>
                <div key={`h-${hi}`} className="text-[10px] text-gray-400 flex items-center justify-end pr-1.5">{HOURS[hi]}</div>
                {row.map((val, di) => (
                  <div
                    key={`${hi}-${di}`}
                    className={`rounded-lg h-8 flex items-center justify-center text-[10px] font-semibold transition-all cursor-default hover:scale-110 ${heatColor(val)}`}
                    title={`${DAYS[di]} ${HOURS[hi]}: engajamento ${val}/10`}
                  >
                    {val >= 8 ? val : ''}
                  </div>
                ))}
              </>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
            Melhores janelas: <span className="font-semibold text-gray-600">Ter–Qua 12h–18h</span> e <span className="font-semibold text-gray-600">Dom–Sáb 20h</span>
          </p>
        </div>
      </div>

    </div>
  )
}
