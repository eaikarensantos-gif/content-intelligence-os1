export default function MetricsCoverage({ metrics = [] }) {
  const dates = metrics.map(metric => String(metric.date || '').slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  const format = date => date ? date.split('-').reverse().join('/') : 'não informado'
  const sources = [...new Set(metrics.map(metric => metric.source).filter(Boolean))]
  const unknownSource = metrics.filter(metric => !metric.source).length
  return <details className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
    <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">
      <strong>{metrics.length} registros</strong>{dates.length > 0 && <> · até {format(dates.at(-1))}</>} <span className="text-gray-600">· detalhes da base</span>
    </summary>
    <div className="mt-3 space-y-1 leading-relaxed border-t border-gray-200 pt-3">
    <p>Publicações de {format(dates[0])} a {format(dates.at(-1))}.</p>
    {sources.length > 0 && <span> Origens registradas: {sources.join(', ')}.</span>}
    {unknownSource > 0 && <span> {unknownSource} sem origem registrada.</span>}
    <span className="block mt-1">As datas acima são de publicação, não de sincronização. Esta base pode diferir da consulta ao vivo do Instagram. Importações devem ser conferidas antes de combinar fontes.</span>
    </div>
  </details>
}
