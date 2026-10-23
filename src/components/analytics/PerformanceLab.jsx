import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import useStore from '../../store/useStore'
import { engagementRate, growthTimeline, numberOrNull, postingHeatmap } from '../../utils/performanceAnalytics'

const NETWORKS = { linkedin: 'LinkedIn', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'X/Twitter', facebook: 'Facebook' }
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const METRICS = { impressions: 'Impressões', reach: 'Alcance', likes: 'Curtidas', comments: 'Comentários', shares: 'Compartilhamentos', saves: 'Salvamentos', follows: 'Seguidores atribuídos', engagement_rate: 'Engajamento / impressões' }
const valueFor = (post, key) => key === 'engagement_rate' ? engagementRate(post) : numberOrNull(post[key])
const format = (value, key) => value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${key === 'engagement_rate' ? '%' : ''}`

export default function PerformanceLab() {
  const metrics = useStore(s => s.metrics)
  const posts = useStore(s => s.posts)
  const profile = useStore(s => s.creatorProfile)
  const [platform, setPlatform] = useState('linkedin')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [metric, setMetric] = useState('impressions')
  const [selected, setSelected] = useState([])
  const [cellKey, setCellKey] = useState(null)
  const [query, setQuery] = useState('')
  const rows = metrics.map(m => ({ ...posts.find(p => p.id === m.post_id), ...m }))
    .filter(m => m.platform === platform && (!from || m.date >= from) && (!to || m.date <= to))
    .sort((a, b) => (valueFor(b, metric) ?? -1) - (valueFor(a, metric) ?? -1))
  const compared = rows.filter(row => selected.includes(row.id))
  const visible = rows.filter(row => `${row.description || row.title || ''}`.toLowerCase().includes(query.toLowerCase()))
  const { cells, excluded } = postingHeatmap(rows, metric)
  const max = Math.max(0, ...cells.map(cell => cell.value ?? 0))
  const active = cellKey === null ? null : cells[cellKey]
  const growth = growthTimeline(profile, platform, from, to)
  const change = growth.length > 1 ? growth.at(-1).followers - growth[0].followers : null
  const reset = () => { setSelected([]); setCellKey(null) }

  return <div className="space-y-5">
    <section className="card p-5 space-y-4">
      <div><h2 className="text-lg font-semibold">Desempenho e crescimento</h2><p className="text-sm text-gray-500">Compare publicações, consulte horários e acompanhe os registros do perfil.</p></div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Rede<select className="input mt-1" value={platform} onChange={e => { setPlatform(e.target.value); reset() }}>{Object.entries(NETWORKS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <label className="text-sm">De<input className="input mt-1" type="date" value={from} max={to || undefined} onChange={e => { setFrom(e.target.value); reset() }} /></label>
        <label className="text-sm">Até<input className="input mt-1" type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); reset() }} /></label>
        <label className="text-sm">Métrica<select className="input mt-1" value={metric} onChange={e => setMetric(e.target.value)}>{Object.entries(METRICS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      </div>
      <p className="text-sm text-gray-500">{rows.length} publicações no período. Valores ausentes aparecem como —. As métricas refletem o momento da coleta e posts mais antigos tiveram mais tempo de exposição.</p>
    </section>

    <section className="card p-5 space-y-4">
      <h3 className="font-semibold">Comparação entre posts</h3>
      <p className="text-sm text-gray-500">Selecione de 2 a 4 posts. Ordenação pela métrica escolhida.</p>
      <label className="block text-sm">Buscar publicação<input type="search" className="input mt-1" placeholder="Texto do post" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="max-h-64 overflow-auto divide-y">
        {visible.map(row => <label key={row.id} className="flex items-center gap-3 py-3 text-sm cursor-pointer">
          <input type="checkbox" checked={selected.includes(row.id)} disabled={!selected.includes(row.id) && selected.length >= 4} onChange={() => setSelected(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])} />
          <span className="flex-1 min-w-0"><span className="block truncate">{row.description || row.title || 'Post sem descrição'}</span><span className="text-xs text-gray-500">{row.date || 'Sem data'} · {row.post_type || row.format || 'Formato não informado'}</span></span>
          <span>{format(valueFor(row, metric), metric)}</span>
        </label>)}
        {!visible.length && <p className="py-5 text-sm text-gray-500">Nenhum post encontrado. Importe métricas ou ajuste os filtros.</p>}
      </div>
      {compared.length >= 2 && <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="text-left py-2 text-gray-500">Comparação lado a lado · diferença entre o segundo e o primeiro post</caption><thead><tr><th className="p-3">Métrica</th>{compared.map((post, index) => <th className="p-3 min-w-40 max-w-64" key={post.id}><span className="block">Post {index + 1} · {post.date}</span><span className="font-normal line-clamp-2">{post.description || post.title || 'Sem descrição'}</span></th>)}<th className="p-3">Diferença 2 − 1</th></tr></thead><tbody>
        {Object.entries(METRICS).map(([key, name]) => { const first = valueFor(compared[0], key); const second = valueFor(compared[1], key); return <tr className="border-t" key={key}><th className="p-3 font-medium">{name}</th>{compared.map(post => <td className="p-3" key={post.id}>{format(valueFor(post, key), key)}</td>)}<td className="p-3">{first === null || second === null ? '—' : key === 'engagement_rate' ? `${(second - first).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.` : format(second - first, key)}</td></tr> })}
      </tbody></table></div>}
    </section>

    <section className="card p-5 space-y-4">
      <h3 className="font-semibold">Mapa de calor · horários de publicação</h3>
      <p className="text-sm text-gray-500">Média de {METRICS[metric].toLowerCase()} por post. Horários conforme importados; use o mesmo fuso nos arquivos. Cor mais escura indica média maior; cinza indica ausência de dados. {excluded} posts sem data, horário ou métrica válidos ficaram fora.</p>
      <div className="overflow-x-auto"><div className="grid gap-1 min-w-[760px]" style={{ gridTemplateColumns: '44px repeat(24, minmax(24px, 1fr))' }}>
        <span />{Array.from({ length: 24 }, (_, hour) => <span key={hour} className="text-[10px] text-center text-gray-500">{hour}h</span>)}
        {DAYS.map((day, dayIndex) => <div key={day} className="contents"><span className="text-xs self-center">{day}</span>{cells.slice(dayIndex * 24, dayIndex * 24 + 24).map(cell => { const label = `${day} ${cell.hour}h: ${cell.count} posts, média ${format(cell.value, metric)}`; return <button key={cell.hour} type="button" aria-label={label} title={label} aria-pressed={cellKey === cell.day * 24 + cell.hour} onClick={() => setCellKey(cell.day * 24 + cell.hour)} className="h-8 rounded border border-white focus:outline focus:outline-2 focus:outline-orange-600" style={{ background: cell.count ? `rgba(234, 88, 12, ${0.15 + (max ? cell.value / max : 0) * 0.85})` : '#f3f4f6' }} /> })}</div>)}
      </div></div>
      <p className="text-sm text-gray-600" aria-live="polite">{active ? `${DAYS[active.day]} às ${active.hour}h · ${active.count} posts · média ${format(active.value, metric)}${active.count > 0 && active.count < 3 ? ' · Poucos posts: amostra insuficiente para recomendar este horário.' : ''}` : 'Selecione um horário para ver a média e o tamanho da amostra.'}</p>
      <p className="text-xs text-gray-500">O histórico ajuda a escolher horários para testar. Tema, formato e idade dos posts também influenciam o resultado.</p>
    </section>

    <section className="card p-5 space-y-4">
      <h3 className="font-semibold">Evolução do perfil · {NETWORKS[platform]}</h3>
      <p className="text-sm text-gray-500">Contagens registradas em Seguidores por rede. Último registro de cada dia, no fuso de São Paulo. Variação entre os registros do período: <strong>{format(change, 'followers')}</strong>.</p>
      {growth.length >= 2 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={growth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={['auto', 'auto']} /><Tooltip /><Line dataKey="followers" name="Seguidores" stroke="#ea580c" strokeWidth={2} type="linear" dot /></LineChart></ResponsiveContainer></div> : <p className="py-5 text-sm text-gray-500">{growth.length ? 'Há uma contagem registrada. Salve uma nova contagem em outro dia para acompanhar a evolução.' : 'Ainda não há contagens neste período. Adicione seguidores no painel acima para iniciar o histórico.'}</p>}
      {!!growth.length && <details><summary className="cursor-pointer text-sm">Ver registros e publicações nas datas</summary><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Data</th><th className="p-2">Seguidores</th><th className="p-2">Variação</th><th className="p-2">Publicações no dia</th></tr></thead><tbody>{growth.map(point => <tr key={point.date} className="border-t"><td className="p-2">{point.date}</td><td className="p-2">{format(point.followers)}</td><td className="p-2">{format(point.change)}</td><td className="p-2">{rows.filter(row => row.date === point.date).map(row => row.description || row.title || 'Post sem descrição').join(' · ') || 'Nenhuma registrada'}</td></tr>)}</tbody></table></div><p className="text-xs text-gray-500 mt-2">Publicar no mesmo dia de uma variação não comprova que o post causou o crescimento.</p></details>}
    </section>
  </div>
}
