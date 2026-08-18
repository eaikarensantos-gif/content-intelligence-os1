import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, UserPlus, Grid3x3, Eye, TrendingUp, MousePointerClick, Loader2 } from 'lucide-react'
import { instagramAccountOverview } from '../../lib/aiService'

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gray-400 mb-1.5">
        <Icon size={14} />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{(value || 0).toLocaleString('pt-BR')}</p>
    </div>
  )
}

function DemographicsList({ title, items }) {
  if (!items?.length) return null
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.slice(0, 6).map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 w-24 shrink-0 truncate" title={item.key}>{item.key}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-pink-400 rounded-full" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 w-10 text-right shrink-0">{item.value.toLocaleString('pt-BR')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AccountOverview({ accessToken }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    instagramAccountOverview(accessToken)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accessToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={22} className="animate-spin text-pink-400" />
      </div>
    )
  }

  if (error) return <p className="text-xs text-red-500 mb-4">{error}</p>
  if (!data) return null

  const { profile, periodStats, followerGrowth, demographics } = data

  return (
    <div className="space-y-4 mb-6">
      {/* Perfil */}
      <div className="card p-4 flex items-center gap-4">
        {profile.profilePictureUrl && (
          <img src={profile.profilePictureUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">@{profile.username}</p>
          {profile.name && <p className="text-xs text-gray-500">{profile.name}</p>}
          {profile.biography && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{profile.biography}</p>}
        </div>
      </div>

      {/* Contadores em tempo real */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Seguidores" value={profile.followersCount} />
        <StatCard icon={UserPlus} label="Seguindo" value={profile.followsCount} />
        <StatCard icon={Grid3x3} label="Posts" value={profile.mediaCount} />
      </div>

      {/* Métricas do período (30 dias) */}
      {periodStats ? (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Últimos 30 dias</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {periodStats.reach != null && <StatCard icon={Eye} label="Alcance" value={periodStats.reach} />}
            {periodStats.profile_views != null && <StatCard icon={TrendingUp} label="Visitas ao perfil" value={periodStats.profile_views} />}
            {periodStats.website_clicks != null && <StatCard icon={MousePointerClick} label="Cliques no site" value={periodStats.website_clicks} />}
            {periodStats.accounts_engaged != null && <StatCard icon={Users} label="Contas engajadas" value={periodStats.accounts_engaged} />}
            {periodStats.total_interactions != null && <StatCard icon={TrendingUp} label="Interações totais" value={periodStats.total_interactions} />}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2.5 border border-amber-200">
          ⚠️ Métricas de conta (alcance, visitas ao perfil) não disponíveis nessa conexão.
        </p>
      )}

      {/* Crescimento de seguidores */}
      {followerGrowth?.length > 1 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">Crescimento de seguidores (30 dias)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={followerGrowth}>
              <defs>
                <linearGradient id="gFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" name="Seguidores" stroke="#ec4899" strokeWidth={2} fill="url(#gFollowers)" dot={{ r: 2, fill: '#ec4899' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Seguidores online por hora */}
      {data.onlineFollowers ? (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">Quando sua audiência está online (por hora do dia)</p>
          <div className="flex items-end gap-1 h-20">
            {(() => {
              const max = Math.max(...data.onlineFollowers.map((h) => h.count), 1)
              return data.onlineFollowers.map(({ hour, count }) => (
                <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${hour}h: ${count} seguidores online`}>
                  <div className="w-full bg-pink-400 rounded-t" style={{ height: `${Math.max((count / max) * 100, count > 0 ? 4 : 0)}%` }} />
                  {hour % 3 === 0 && <span className="text-[8px] text-gray-400">{hour}h</span>}
                </div>
              ))
            })()}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
          Horários de atividade da audiência não disponíveis nessa conexão.
        </p>
      )}

      {/* Demografia da audiência */}
      {demographics.available ? (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <DemographicsList title="Idade e gênero" items={demographics.ageGender} />
          <DemographicsList title="Cidades" items={demographics.city} />
          <DemographicsList title="Países" items={demographics.country} />
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
          Demografia da audiência não disponível — geralmente exige uma base mínima de seguidores ou permissão adicional.
        </p>
      )}
    </div>
  )
}
