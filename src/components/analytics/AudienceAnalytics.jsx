import { useState, useCallback } from 'react'
import {
  UploadCloud, BarChart2, Bookmark, Share2, Eye,
  TrendingUp, TrendingDown, Minus, AlertCircle,
  Users, Zap, ChevronRight, RefreshCw, FileText
} from 'lucide-react'

// ─── CLASSIFICAÇÃO DE PILARES ─────────────────────────────────────────────────

const PILARES = [
  'IA & Tech',
  'Carreira & Maturidade',
  'UX & Produto',
  'Decisão & Estratégia',
  'Humor/Entretenimento',
  'Parceria/Publi',
  'Diversidade',
  'Outro',
]

const PILAR_COLORS = {
  'IA & Tech':               { bg: 'bg-violet-50',  border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', bar: '#7C3AED' },
  'Carreira & Maturidade':   { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: '#059669' },
  'UX & Produto':            { bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   bar: '#D97706' },
  'Decisão & Estratégia':    { bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     bar: '#2563EB' },
  'Humor/Entretenimento':    { bg: 'bg-indigo-50',  border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', bar: '#4F46E5' },
  'Parceria/Publi':          { bg: 'bg-gray-50',    border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700',     bar: '#6B7280' },
  'Diversidade':             { bg: 'bg-pink-50',    border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700',     bar: '#DB2777' },
  'Outro':                   { bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', bar: '#EA580C' },
}

function classificarPost(descricao = '', cliente = '') {
  const d = descricao.toLowerCase()
  const c = cliente.toLowerCase()
  if (c.includes('samsung') || d.includes('samsung') || d.includes('galaxy')) return 'Parceria/Publi'
  if (d.includes('fiap') || c.includes('fiap')) return 'Parceria/Publi'
  if (d.includes('graniamici') || d.includes('glutenfree') || d.includes('glúten') || d.includes('parceria:')) return 'Parceria/Publi'
  if (d.includes('#publi') || d.includes('| publi')) return 'Parceria/Publi'
  if (d.includes('sara caldas') || d.includes('paleta perfeita') || d.includes('saravcaldas')) return 'UX & Produto'
  if (d.includes('#ai') || d.includes('inteligência artificial') || d.includes('inteligencia artificial') || d.includes('#ia') || d.includes('adoção de ai') || d.includes('adocao de ai')) return 'IA & Tech'
  if (d.includes('#artificialintelligence') || d.includes('#inteligenciaartificial')) return 'IA & Tech'
  if (d.includes('frenchbulldog') || d.includes('sonequinha') || d.includes('#relatable') || d.includes('pov corporativo')) return 'Humor/Entretenimento'
  if (d.includes('reunião') && (d.includes('atenção') || d.includes('atencao'))) return 'Humor/Entretenimento'
  if (d.includes('#carreira') || d.includes('carreira') || d.includes('transição') || d.includes('transicao') || d.includes('clt') || d.includes(' pj ') || d.includes('expertise')) return 'Carreira & Maturidade'
  if (d.includes('operacional') || d.includes('agenda') || d.includes('estratégi') || d.includes('estrategi') || d.includes('fingir que entende') || d.includes('urgente')) return 'Decisão & Estratégia'
  if (d.includes('corporativo') || d.includes('liderança') || d.includes('lideranca') || d.includes('maturidade')) return 'Carreira & Maturidade'
  if (d.includes('ux') || d.includes('design') || d.includes('produto')) return 'UX & Produto'
  if (d.includes('representatividade') || d.includes('diversidade') || d.includes('pretas') || d.includes('inclusão')) return 'Diversidade'
  return 'Outro'
}

// ─── PARSE CSV ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())

  const rows = []
  let current = ''
  for (let i = 1; i < lines.length; i++) {
    current += lines[i]
    const quoteCount = (current.match(/"/g) || []).length
    if (quoteCount % 2 === 0) {
      rows.push(current)
      current = ''
    } else {
      current += '\n'
    }
  }

  const parsed = rows.map(row => {
    const values = []
    let val = '', inQuote = false
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '"') {
        if (inQuote && row[i + 1] === '"') { val += '"'; i++ }
        else inQuote = !inQuote
      } else if (row[i] === ',' && !inQuote) {
        values.push(val.trim()); val = ''
      } else {
        val += row[i]
      }
    }
    values.push(val.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return obj
  })

  return parsed
}

function num(v) {
  const n = parseFloat(String(v || '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

// ─── PROCESSAMENTO ────────────────────────────────────────────────────────────

function processarDados(rows) {
  // deduplicar
  const seen = new Set()
  const unique = rows.filter(r => {
    const key = `${r['Data']}|${r['Tipo']}|${(r['Descrição'] || '').slice(0, 40)}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  const feed = unique.filter(r => ['carousel', 'reel'].includes((r['Tipo'] || '').toLowerCase()))
  const stories = unique.filter(r => (r['Tipo'] || '').toLowerCase() === 'story')

  // classificar feed
  feed.forEach(p => {
    p._pilar = classificarPost(p['Descrição'] || '', p['Cliente'] || '')
  })

  // stats por pilar
  const pilarMap = {}
  feed.forEach(p => {
    const pl = p._pilar
    if (!pilarMap[pl]) pilarMap[pl] = { posts: 0, impressoes: 0, alcance: 0, curtidas: 0, comentarios: 0, compartilhamentos: 0, salvamentos: 0, taxa: [] }
    const s = pilarMap[pl]
    s.posts++
    s.impressoes += num(p['Impressões'])
    s.alcance += num(p['Alcance'])
    s.curtidas += num(p['Curtidas'])
    s.comentarios += num(p['Comentários'])
    s.compartilhamentos += num(p['Compartilhamentos'])
    s.salvamentos += num(p['Salvamentos'])
    s.taxa.push(num(p['Taxa Eng.%']))
  })

  const pilarStats = {}
  Object.entries(pilarMap).forEach(([pl, s]) => {
    const n = s.posts
    pilarStats[pl] = {
      posts: n,
      avgTaxa: +(s.taxa.reduce((a, b) => a + b, 0) / n).toFixed(2),
      avgAlcance: Math.round(s.alcance / n),
      avgImpressoes: Math.round(s.impressoes / n),
      avgSalvamentos: +(s.salvamentos / n).toFixed(1),
      avgCompartilhamentos: +(s.compartilhamentos / n).toFixed(1),
      avgCurtidas: Math.round(s.curtidas / n),
      totalSalvamentos: Math.round(s.salvamentos),
      totalCompartilhamentos: Math.round(s.compartilhamentos),
    }
  })

  // stats por formato
  const formatoMap = {}
  feed.forEach(p => {
    const t = (p['Tipo'] || 'outro').toLowerCase()
    if (!formatoMap[t]) formatoMap[t] = { posts: 0, taxa: [], salvamentos: 0, compartilhamentos: 0, alcance: [] }
    formatoMap[t].posts++
    formatoMap[t].taxa.push(num(p['Taxa Eng.%']))
    formatoMap[t].salvamentos += num(p['Salvamentos'])
    formatoMap[t].compartilhamentos += num(p['Compartilhamentos'])
    formatoMap[t].alcance.push(num(p['Alcance']))
  })

  const formatoStats = {}
  Object.entries(formatoMap).forEach(([t, s]) => {
    formatoStats[t] = {
      posts: s.posts,
      avgTaxa: +(s.taxa.reduce((a, b) => a + b, 0) / s.posts).toFixed(2),
      avgAlcance: Math.round(s.alcance.reduce((a, b) => a + b, 0) / s.posts),
      totalSalvamentos: Math.round(s.salvamentos),
      totalCompartilhamentos: Math.round(s.compartilhamentos),
    }
  })

  // stories resumo
  const storyTaxas = stories.map(p => num(p['Taxa Eng.%'])).filter(v => v > 0)
  const storiesStats = {
    total: stories.length,
    avgTaxa: storyTaxas.length ? +(storyTaxas.reduce((a, b) => a + b, 0) / storyTaxas.length).toFixed(2) : 0,
    avgImpressoes: stories.length ? Math.round(stories.reduce((s, p) => s + num(p['Impressões']), 0) / stories.length) : 0,
  }

  // top posts
  const topPosts = [...feed].sort((a, b) => num(b['Taxa Eng.%']) - num(a['Taxa Eng.%'])).slice(0, 6)

  return {
    totalRows: rows.length,
    uniquePosts: unique.length,
    feedPosts: feed.length,
    pilarStats,
    formatoStats,
    storiesStats,
    topPosts,
  }
}

// ─── INSIGHTS AUTOMÁTICOS ─────────────────────────────────────────────────────

function gerarInsights(stats) {
  const { pilarStats, formatoStats, storiesStats } = stats
  const insights = []

  const pilares = Object.entries(pilarStats).sort((a, b) => b[1].avgTaxa - a[1].avgTaxa)
  const porSalv = Object.entries(pilarStats).sort((a, b) => b[1].avgSalvamentos - a[1].avgSalvamentos)
  const porComp = Object.entries(pilarStats).sort((a, b) => b[1].avgCompartilhamentos - a[1].avgCompartilhamentos)

  if (pilares[0]) {
    insights.push({ tipo: 'ok', texto: `<b>${pilares[0][0]}</b> tem a maior taxa de engajamento (${pilares[0][1].avgTaxa}%). É o pilar que mais ativa reação da audiência.` })
  }

  if (porSalv[0] && porSalv[0][1].avgSalvamentos > 0) {
    insights.push({ tipo: 'ok', texto: `<b>${porSalv[0][0]}</b> lidera em salvamentos (média ${porSalv[0][1].avgSalvamentos} por post). Conteúdo percebido como útil pra guardar.` })
  }

  if (porComp[0] && porComp[0][1].avgCompartilhamentos > 0) {
    const isEqualTop = porComp[0][0] === pilares[0]?.[0]
    if (!isEqualTop) {
      insights.push({ tipo: 'warn', texto: `<b>${porComp[0][0]}</b> domina compartilhamentos mas não é o de maior engajamento. Viraliza, mas pode não converter em autoridade.` })
    } else {
      insights.push({ tipo: 'ok', texto: `<b>${porComp[0][0]}</b> lidera tanto em engajamento quanto em compartilhamentos — sinal de identificação coletiva forte.` })
    }
  }

  // pilar com engajamento alto mas zero compartilhamento
  const engAltaSemComp = pilares.find(([, s]) => s.avgTaxa > 3 && s.avgCompartilhamentos === 0 && s.posts >= 2)
  if (engAltaSemComp) {
    insights.push({ tipo: 'warn', texto: `<b>${engAltaSemComp[0]}</b> tem engajamento de ${engAltaSemComp[1].avgTaxa}% mas zero compartilhamentos. As pessoas curtem individualmente, mas ainda não repassam.` })
  }

  // stories vs feed
  const feedAvgTaxa = Object.values(pilarStats).length
    ? +(Object.values(pilarStats).reduce((s, p) => s + p.avgTaxa, 0) / Object.values(pilarStats).length).toFixed(2)
    : 0
  if (storiesStats.avgTaxa > feedAvgTaxa) {
    insights.push({ tipo: 'ok', texto: `Stories têm taxa média de ${storiesStats.avgTaxa}% vs ${feedAvgTaxa}% do feed. O núcleo duro da audiência está mais ativo nos stories.` })
  }

  // formato
  const formatos = Object.entries(formatoStats).sort((a, b) => b[1].avgTaxa - a[1].avgTaxa)
  if (formatos[0] && formatos.length > 1) {
    insights.push({ tipo: 'ok', texto: `Melhor formato por engajamento: <b>${formatos[0][0]}</b> (${formatos[0][1].avgTaxa}% médio). ${formatos[formatos.length - 1][0] !== formatos[0][0] ? `<b>${formatos[formatos.length - 1][0]}</b> tem o pior desempenho (${formatos[formatos.length - 1][1].avgTaxa}%).` : ''}` })
  }

  // pilar com 1 post
  const semAmostra = pilares.filter(([, s]) => s.posts === 1)
  if (semAmostra.length > 0) {
    insights.push({ tipo: 'alert', texto: `${semAmostra.map(([p]) => `<b>${p}</b>`).join(', ')} ${semAmostra.length > 1 ? 'têm' : 'tem'} apenas 1 post. Amostra insuficiente — não dá pra concluir nada sobre ${semAmostra.length > 1 ? 'esses pilares' : 'esse pilar'}.` })
  }

  return insights
}

// ─── BARRA HORIZONTAL ─────────────────────────────────────────────────────────

function BarraHorizontal({ label, valor, max, cor, sufixo = '' }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-12 text-right shrink-0">{valor}{sufixo}</span>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function AudienceAnalytics() {
  const [dados, setDados] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [erro, setErro] = useState(null)

  const processarArquivo = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setErro('Arquivo inválido. Envie o CSV exportado pelo seu painel de métricas.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result)
        if (rows.length < 3) { setErro('CSV com menos de 3 linhas. Verifique o arquivo.'); return }
        setDados(processarDados(rows))
        setErro(null)
      } catch {
        setErro('Erro ao ler o arquivo. Verifique se é o CSV correto.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    processarArquivo(e.dataTransfer.files[0])
  }, [processarArquivo])

  const onFileInput = (e) => processarArquivo(e.target.files[0])

  // ── Sem dados: upload ──
  if (!dados) {
    return (
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-violet-500 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-blue-500 blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-violet-400" />
              <h2 className="text-base font-bold">Análise de Audiência</h2>
            </div>
            <p className="text-sm text-gray-300 max-w-xl">
              Importe o CSV do seu painel de métricas para ver performance por pilar, sinais de comportamento e padrões da audiência.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-colors cursor-pointer ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          onClick={() => document.getElementById('csv-input').click()}
        >
          <div className={`p-4 rounded-2xl ${dragOver ? 'bg-violet-100' : 'bg-gray-100'}`}>
            <UploadCloud size={28} className={dragOver ? 'text-violet-500' : 'text-gray-400'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">Arraste o CSV aqui ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">Exporte pelo botão "Exportar CSV" no seu painel de métricas</p>
          </div>
          <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileInput} />
        </div>

        {erro && (
          <div className="card border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            <p className="text-sm">{erro}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Com dados: dashboard ──
  const { totalRows, uniquePosts, feedPosts, pilarStats, formatoStats, storiesStats, topPosts } = dados
  const insights = gerarInsights(dados)

  const pilaresPorTaxa = Object.entries(pilarStats).sort((a, b) => b[1].avgTaxa - a[1].avgTaxa)
  const pilaresPorSalv = Object.entries(pilarStats).sort((a, b) => b[1].avgSalvamentos - a[1].avgSalvamentos)
  const pilaresPorComp = Object.entries(pilarStats).sort((a, b) => b[1].avgCompartilhamentos - a[1].avgCompartilhamentos)
  const pilaresPorAlc  = Object.entries(pilarStats).sort((a, b) => b[1].avgAlcance - a[1].avgAlcance)

  const maxTaxa = Math.max(...pilaresPorTaxa.map(([, s]) => s.avgTaxa))
  const maxSalv = Math.max(...pilaresPorSalv.map(([, s]) => s.avgSalvamentos))
  const maxComp = Math.max(...pilaresPorComp.map(([, s]) => s.avgCompartilhamentos))
  const maxAlc  = Math.max(...pilaresPorAlc.map(([, s]) => s.avgAlcance))

  const feedAvgTaxa = pilaresPorTaxa.length
    ? +(pilaresPorTaxa.reduce((s, [, v]) => s + v.avgTaxa, 0) / pilaresPorTaxa.length).toFixed(1)
    : 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-violet-500 blur-3xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-blue-500 blur-3xl" />
        </div>
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-violet-400" />
              <h2 className="text-base font-bold">Análise de Audiência</h2>
            </div>
            <p className="text-xs text-gray-400">{totalRows} entradas → {uniquePosts} únicos após deduplicação</p>
          </div>
          <button
            onClick={() => setDados(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw size={12} /> Novo CSV
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Feed posts', value: feedPosts, sub: 'reel + carrossel' },
          { label: 'Stories únicos', value: storiesStats.total, sub: `${storiesStats.avgTaxa}% eng. médio` },
          { label: 'Eng. médio feed', value: `${feedAvgTaxa}%`, sub: 'todos os pilares' },
          { label: 'Pilares ativos', value: Object.keys(pilarStats).length, sub: 'com dados reais' },
        ].map((c, i) => (
          <div key={i} className="card p-4">
            <p className="text-[11px] text-gray-400 mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Barras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Taxa de engajamento */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-violet-500" />
            <p className="text-xs font-semibold text-gray-700">Taxa de engajamento por pilar</p>
          </div>
          {pilaresPorTaxa.map(([pl, s]) => (
            <BarraHorizontal key={pl} label={`${pl} (${s.posts}p)`} valor={s.avgTaxa} max={maxTaxa} cor={PILAR_COLORS[pl]?.bar || '#888'} sufixo="%" />
          ))}
        </div>

        {/* Salvamentos */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bookmark size={14} className="text-amber-500" />
            <p className="text-xs font-semibold text-gray-700">Salvamentos médios por pilar</p>
          </div>
          {pilaresPorSalv.map(([pl, s]) => (
            <BarraHorizontal key={pl} label={pl} valor={s.avgSalvamentos} max={maxSalv || 1} cor={PILAR_COLORS[pl]?.bar || '#888'} />
          ))}
        </div>

        {/* Compartilhamentos */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Share2 size={14} className="text-blue-500" />
            <p className="text-xs font-semibold text-gray-700">Compartilhamentos médios por pilar</p>
          </div>
          {pilaresPorComp.map(([pl, s]) => (
            <BarraHorizontal key={pl} label={pl} valor={s.avgCompartilhamentos} max={maxComp || 1} cor={PILAR_COLORS[pl]?.bar || '#888'} />
          ))}
        </div>

        {/* Alcance */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={14} className="text-emerald-500" />
            <p className="text-xs font-semibold text-gray-700">Alcance médio por pilar</p>
          </div>
          {pilaresPorAlc.map(([pl, s]) => (
            <BarraHorizontal key={pl} label={pl} valor={s.avgAlcance} max={maxAlc || 1} cor={PILAR_COLORS[pl]?.bar || '#888'} />
          ))}
        </div>
      </div>

      {/* Por formato */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} className="text-indigo-500" />
          <p className="text-xs font-semibold text-gray-700">Performance por formato</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(formatoStats).map(([tipo, s]) => (
            <div key={tipo} className="bg-gray-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 capitalize">{tipo}</span>
                <span className="text-[10px] text-gray-400">{s.posts} posts</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{s.avgTaxa}%</p>
              <p className="text-[10px] text-gray-400">Alcance médio: {s.avgAlcance.toLocaleString('pt-BR')}</p>
              <div className="flex gap-3 text-[10px] text-gray-500">
                <span><Bookmark size={9} className="inline mr-0.5" />{s.totalSalvamentos}</span>
                <span><Share2 size={9} className="inline mr-0.5" />{s.totalCompartilhamentos}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-orange-500" />
          <p className="text-xs font-semibold text-gray-700">Padrões identificados</p>
        </div>
        {insights.map((ins, i) => {
          const styles = {
            ok:    'border-emerald-200 bg-emerald-50 text-emerald-600',
            warn:  'border-amber-200 bg-amber-50 text-amber-600',
            alert: 'border-red-200 bg-red-50 text-red-600',
          }
          const Icon = ins.tipo === 'ok' ? TrendingUp : ins.tipo === 'warn' ? AlertCircle : AlertCircle
          return (
            <div key={i} className={`card border p-4 flex gap-3 ${styles[ins.tipo]}`}>
              <Icon size={14} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: ins.texto }} />
            </div>
          )
        })}
      </div>

      {/* Top posts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={14} className="text-gray-500" />
          <p className="text-xs font-semibold text-gray-700">Top posts por taxa de engajamento</p>
        </div>
        <div className="space-y-2">
          {topPosts.map((p, i) => {
            const pilar = p._pilar || 'Outro'
            const style = PILAR_COLORS[pilar] || PILAR_COLORS['Outro']
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>{pilar}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{p['Tipo']}</span>
                    <span className="text-[10px] text-gray-400">{p['Data']}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                    {p['Descrição'] ? p['Descrição'].slice(0, 120) : '(sem descrição)'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">{num(p['Taxa Eng.%']).toFixed(2)}%</p>
                  <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5 justify-end">
                    <span><Eye size={9} className="inline mr-0.5" />{Number(p['Alcance']).toLocaleString('pt-BR')}</span>
                    <span><Bookmark size={9} className="inline mr-0.5" />{p['Salvamentos']}</span>
                    <span><Share2 size={9} className="inline mr-0.5" />{p['Compartilhamentos']}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Aviso de volume */}
      {feedPosts < 20 && (
        <div className="card border border-amber-200 bg-amber-50 p-4 flex gap-2">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Base com {feedPosts} feed posts. Volume baixo para conclusões definitivas por pilar — pilares com 1 post não são conclusivos. Recomendado reanalisar com 8+ semanas de dados.
          </p>
        </div>
      )}

    </div>
  )
}
