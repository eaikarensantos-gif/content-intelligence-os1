export default function MetricsCoverage({ metrics = [] }) {
  const dates = metrics.map(metric => String(metric.date || '').slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  const format = date => date ? date.split('-').reverse().join('/') : 'não informado'
  const sources = [...new Set(metrics.map(metric => metric.source).filter(Boolean))]
  const unknownSource = metrics.filter(metric => !metric.source).length
  return <aside className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
    <strong>Base de métricas salva: {metrics.length} registros.</strong> Publicações de {format(dates[0])} a {format(dates.at(-1))}.
    {sources.length > 0 && <span> Origens registradas: {sources.join(', ')}.</span>}
    {unknownSource > 0 && <span> {unknownSource} sem origem registrada.</span>}
    <span className="block mt-1">As datas acima são de publicação, não de sincronização. Esta base pode diferir da consulta ao vivo do Instagram. Importações devem ser conferidas antes de combinar fontes.</span>
  </aside>
}
