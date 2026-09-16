import { useEffect, useState } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Users, UserPlus, Grid3x3, Eye, TrendingUp, MousePointerClick, Loader2, ExternalLink } from 'lucide-react'
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

export default function AccountOverview({ accessToken, posts }) {
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

  const { profile, periodStats, followerGrowth, demographics, dayPeaks } = data
  const growthTotal = (followerGrowth || []).reduce((sum, point) => sum + (point.value || 0), 0)
  const growthAverage = followerGrowth?.length ? growthTotal / followerGrowth.length : 0
  const bestGrowthDay = (followerGrowth || []).reduce(
    (best, point) => (!best || point.value > best.value ? point : best),
    null,
  )
  const topGrowthDates = new Set(
    [...(followerGrowth || [])]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((point) => point.date),
  )
  const postsWithFollowerData = (posts || []).filter((post) => post.followsAvailable)
  const attributedPosts = postsWithFollowerData
    .filter((post) => post.follows > 0)
    .sort((a, b) => b.follows - a.follows)
  const attributedTotal = attributedPosts.reduce((sum, post) => sum + post.follows, 0)
  const maxAttributedFollows = attributedPosts[0]?.follows || 1
  const formatGrowthDate = (date, options = {}) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', options)

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
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700">Novos seguidores por dia</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Entradas diárias registradas pelo Instagram nos últimos 30 dias.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] text-gray-400">Novos seguidores no período</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{growthTotal.toLocaleString('pt-BR')}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] text-gray-400">Média diária</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{growthAverage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] text-gray-400">Melhor dia</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{bestGrowthDay?.value.toLocaleString('pt-BR') || 0}</p>
              {bestGrowthDay && <p className="text-[10px] text-gray-400 mt-0.5">{formatGrowthDate(bestGrowthDay.date, { day: '2-digit', month: 'short' })}</p>}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={followerGrowth} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => formatGrowthDate(date, { day: '2-digit', month: '2-digit' })}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#f3f4f6' }}
                labelFormatter={(date) => formatGrowthDate(date, { day: '2-digit', month: 'long', year: 'numeric' })}
                formatter={(value) => [value.toLocaleString('pt-BR'), 'Novos seguidores']}
              />
              <ReferenceLine
                y={growthAverage}
                stroke="#6b7280"
                strokeDasharray="4 4"
                label={{ value: `Média ${growthAverage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`, fill: '#6b7280', fontSize: 10, position: 'insideTopRight' }}
              />
              <Bar dataKey="value" name="Novos seguidores" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {followerGrowth.map((point) => (
                  <Cell key={point.date} fill={topGrowthDates.has(point.date) ? '#db2777' : '#f9a8d4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-700">Seguidores atribuídos por publicação</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  O gráfico mostra quando o seguidor entrou. Esta lista mostra a publicação à qual o Instagram atribuiu a entrada.
                </p>
              </div>
              {attributedPosts.length > 0 && (
                <div className="sm:text-right shrink-0">
                  <p className="text-lg font-bold text-pink-600">+{attributedTotal.toLocaleString('pt-BR')}</p>
                  <p className="text-[9px] text-gray-400">em {attributedPosts.length} {attributedPosts.length === 1 ? 'publicação' : 'publicações'}</p>
                </div>
              )}
            </div>

            {attributedPosts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {attributedPosts.slice(0, 6).map((post) => (
                  <a
                    key={post.id}
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 hover:border-pink-200 hover:bg-pink-50/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {post.thumbnailUrl ? (
                        <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Grid3x3 size={16} /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] text-gray-700 line-clamp-2 leading-4">{post.caption || 'Publicação sem legenda'}</p>
                        <p className="text-sm font-bold text-pink-600 shrink-0">+{post.follows.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-pink-400"
                            style={{ width: `${Math.max((post.follows / maxAttributedFollows) * 100, 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    </div>
                    <ExternalLink size={12} className="text-gray-300 group-hover:text-pink-400 shrink-0" />
                  </a>
                ))}
              </div>
            ) : postsWithFollowerData.length > 0 ? (
              <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3">
                Nenhuma das publicações recentes recebeu seguidores atribuídos pelo Instagram.
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
                A conta informou o total diário, mas não liberou a atribuição por publicação para os posts carregados.
              </p>
            )}

            {attributedPosts.length > 6 && (
              <p className="text-[10px] text-gray-400 mt-2 text-right">Mostrando as 6 publicações com mais seguidores atribuídos.</p>
            )}
            <p className="text-[9px] text-gray-400 mt-3">
              As duas leituras têm janelas diferentes e não devem ser somadas nem comparadas como se fossem o mesmo total.
            </p>
          </div>
        </div>
      )}

      {/* Melhores dias da semana pra postar */}
      {dayPeaks?.length > 0 ? (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">Melhores dias para postar (engajamento médio por post)</p>
          <div className="flex items-end gap-2 h-20">
            {(() => {
              const max = Math.max(...dayPeaks.map((d) => d.avgEngagement), 1)
              return dayPeaks.map(({ day, avgEngagement, count }) => (
                <div key={day} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${day}: ${avgEngagement} de engajamento médio (${count} posts)`}>
                  <div className="w-full bg-pink-400 rounded-t" style={{ height: `${Math.max((avgEngagement / max) * 100, avgEngagement > 0 ? 4 : 0)}%` }} />
                  <span className="text-[8px] text-gray-400">{day.slice(0, 3)}</span>
                </div>
              ))
            })()}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
          Melhores dias para postar não disponíveis ainda — publique mais posts pra calcular.
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
