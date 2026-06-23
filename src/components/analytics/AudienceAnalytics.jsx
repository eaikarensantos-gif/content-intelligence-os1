import { useState, useCallback } from 'react'
import {
  UploadCloud, BarChart2, Bookmark, Share2, Eye,
  TrendingUp, AlertCircle, Users, Zap, RefreshCw, FileText
} from 'lucide-react'

// ─── PILARES ─────────────────────────────────────────────────────────────────

const PILAR_COLORS = {
  'IA & Tech':             { badge: 'bg-violet-100 text-violet-700', bar: '#7C3AED' },
  'Carreira & Maturidade': { badge: 'bg-emerald-100 text-emerald-700', bar: '#059669' },
  'UX & Produto':          { badge: 'bg-amber-100 text-amber-700', bar: '#D97706' },
  'Decisão & Estratégia':  { badge: 'bg-blue-100 text-blue-700', bar: '#2563EB' },
  'Humor/Entretenimento':  { badge: 'bg-indigo-100 text-indigo-700', bar: '#4F46E5' },
  'Parceria/Publi':        { badge: 'bg-gray-100 text-gray-700', bar: '#6B7280' },
  'Diversidade':           { badge: 'bg-pink-100 text-pink-700', bar: '#DB2777' },
  'Outro':                 { badge: 'bg-orange-100 text-orange-700', bar: '#EA580C' },
}

function classificar(desc = '') {
  const d = desc.toLowerCase()
  if (d.includes('#publi') || d.includes('| publi') || d.includes('samsung') || d.includes('galaxy')) return 'Parceria/Publi'
  if (d.includes('fiap')) return 'Parceria/Publi'
  if (d.includes('graniamici') || d.includes('glutenfree') || d.includes('parceria:')) return 'Parceria/Publi'
  if (d.includes('sara caldas') || d.includes('paleta perfeita')) return 'UX & Produto'
  if (d.includes('#ai') || d.includes('inteligência artificial') || d.includes('inteligencia artificial') || d.includes('#ia') || d.includes('#inteligenciaartificial') || d.includes('prompt') || d.includes('genai')) return 'IA & Tech'
  if (d.includes('frenchbulldog') || d.includes('sonequinha') || d.includes('#relatable') || d.includes('pov corporativo')) return 'Humor/Entretenimento'
  if (d.includes('reunião') && d.includes('atenção')) return 'Humor/Entretenimento'
  if (d.includes('#carreira') || d.includes('carreira') || d.includes('transição') || d.includes('clt') || d.includes('expertise')) return 'Carreira & Maturidade'
  if (d.includes('operacional') || d.includes('agenda') || d.includes('estratégi') || d.includes('fingir que entende')) return 'Decisão & Estratégia'
  if (d.includes('corporativo') || d.includes('liderança') || d.includes('maturidade')) return 'Carreira & Maturidade'
  if (d.includes('ux') || d.includes('design') || d.includes('produto')) return 'UX & Produto'
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
    if ((current.match(/"/g) || []).length % 2 === 0) {
      rows.push(current); current = ''
    } else { current += '\n' }
  }
  return rows.map(row => {
    const values = []
    let val = '', inQ = false
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '"') { if (inQ && row[i+1] === '"') { val += '"'; i++ } else inQ = !inQ }
      else if (row[i] === ',' && !inQ) { values.push(val.trim()); val = '' }
      else val += row[i]
    }
    values.push(val.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return obj
  })
}

function num(v) {
  const n = parseFloat(String(v || '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

// ─── DETECTAR FORMATO DE CSV ──────────────────────────────────────────────────
// Suporta dois formatos:
// Formato A (antigo): colunas "Tipo", "Impressões", "Taxa Eng.%"
// Formato B (novo):   colunas "Tipo de post", "Visualizações", sem Taxa Eng.%

function detectarFormato(headers) {
  if (headers.includes('Taxa Eng.%')) return 'A'
  if (headers.includes('Tipo de post')) return 'B'
  return 'B'
}

function normalizarRow(r, formato) {
  if (formato === 'A') {
    return {
      tipo: (r['Tipo'] || '').toLowerCase(),
      desc: r['Descrição'] || '',
      cliente: r['Cliente'] || '',
      data: r['Data'] || '',
      alcance: num(r['Alcance']),
      impressoes: num(r['Impressões']),
      curtidas: num(r['Curtidas']),
      comentarios: num(r['Comentários']),
      compartilhamentos: num(r['Compartilhamentos']),
      salvamentos: num(r['Salvamentos']),
      taxaEng: num(r['Taxa Eng.%']),
    }
  }
  // Formato B
  const alcance = num(r['Alcance'])
  const curtidas = num(r['Curtidas'])
  const comentarios = num(r['Comentários'])
  const compartilhamentos = num(r['Compartilhamentos'])
  const salvamentos = num(r['Salvamentos'])
  const taxaEng = alcance > 0
    ? ((curtidas + comentarios + salvamentos + compartilhamentos) / alcance) * 100
    : 0
  return {
    tipo: (r['Tipo de post'] || '').toLowerCase(),
    desc: r['Descrição'] || '',
    cliente: '',
    data: r['Horário de publicação'] ? r['Horário de publicação'].split(' ')[0] : '',
    alcance,
    impressoes: num(r['Visualizações']),
    curtidas,
    comentarios,
    compartilhamentos,
    salvamentos,
    taxaEng,
  }
}

function ehFeed(tipo) {
  return tipo.includes('reel') || tipo.includes('carrossel') || tipo.includes('carousel') || tipo.includes('imagem') || tipo.includes('image')
}

// ─── PROCESSAMENTO ────────────────────────────────────────────────────────────

function processarDados(rows) {
  const headers = Object.keys(rows[0] || {})
  const formato = detectarFormato(headers)

  // dedup
  const seen = new Set()
  const unique = rows.filter(r => {
    const nr = normalizarRow(r, formato)
    const key = `${nr.data}|${nr.tipo}|${nr.desc.slice(0, 40)}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  const normalizado = unique.map(r => ({ ...normalizarRow(r, formato), _raw: r }))
  const feed = normalizado.filter(r => ehFeed(r.tipo))
  const stories = normalizado.filter(r => !ehFeed(r.tipo))

  feed.forEach(r => { r._pilar = classificar(r.desc) })

  // stats por pilar
  const pilarMap = {}
  feed.forEach(r => {
    const pl = r._pilar
    if (!pilarMap[pl]) pilarMap[pl] = { posts: 0, taxa: [], alc: [], salv: 0, comp: 0, curtidas: 0, comentarios: 0 }
    pilarMap[pl].posts++
    pilarMap[pl].taxa.push(r.taxaEng)
    pilarMap[pl].alc.push(r.alcance)
    pilarMap[pl].salv += r.salvamentos
    pilarMap[pl].comp += r.compartilhamentos
    pilarMap[pl].curtidas += r.curtidas
    pilarMap[pl].comentarios += r.comentarios
  })

  const pilarStats = {}
  Object.entries(pilarMap).forEach(([pl, s]) => {
    const n = s.posts
    pilarStats[pl] = {
      posts: n,
      avgTaxa: +(s.taxa.reduce((a, b) => a + b, 0) / n).toFixed(2),
      avgAlcance: Math.round(s.alc.reduce((a, b) => a + b, 0) / n),
      avgSalvamentos: +(s.salv / n).toFixed(1),
      avgCompartilhamentos: +(s.comp / n).toFixed(1),
      totalSalvamentos: Math.round(s.salv),
      totalCompartilhamentos: Math.round(s.comp),
    }
  })

  // stats por formato
  const formatoMap = {}
  feed.forEach(r => {
    const t = r.tipo.split(' ')[0]
    if (!formatoMap[t]) formatoMap[t] = { posts: 0, taxa: [], salv: 0, comp: 0, alc: [] }
    formatoMap[t].posts++
    formatoMap[t].taxa.push(r.taxaEng)
    formatoMap[t].salv += r.salvamentos
    formatoMap[t].comp += r.compartilhamentos
    formatoMap[t].alc.push(r.alcance)
  })
  const formatoStats = {}
  Object.entries(formatoMap).forEach(([t, s]) => {
    formatoStats[t] = {
      posts: s.posts,
      avgTaxa: +(s.taxa.reduce((a, b) => a + b, 0) / s.posts).toFixed(2),
      avgAlcance: Math.round(s.alc.reduce((a, b) => a + b, 0) / s.posts),
      totalSalvamentos: Math.round(s.salv),
      totalCompartilhamentos: Math.round(s.comp),
    }
  })

  // stories resumo
  const stTaxas = stories.map(r => r.taxaEng).filter(v => v > 0)
  const storiesStats = {
    total: stories.length,
    avgTaxa: stTaxas.length ? +(stTaxas.reduce((a, b) => a + b, 0) / stTaxas.length).toFixed(2) : 0,
    avgImpressoes: stories.length ? Math.round(stories.reduce((s, r) => s + r.impressoes, 0) / stories.length) : 0,
  }

  const topPosts = [...feed].sort((a, b) => b.taxaEng - a.taxaEng).slice(0, 6)

  return { totalRows: rows.length, uniquePosts: unique.length, feedPosts: feed.length, pilarStats, formatoStats, storiesStats, topPosts, formato }
}

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────

function gerarInsights(stats) {
  const { pilarStats, formatoStats, storiesStats } = stats
  const insights = []
  const porTaxa = Object.entries(pilarStats).sort((a, b) => b[1].avgTaxa - a[1].avgTaxa)
  const porSalv = Object.entries(pilarStats).sort((a, b) => b[1].avgSalvamentos - a[1].avgSalvamentos)
  const porComp = Object.entries(pilarStats).sort((a, b) => b[1].avgCompartilhamentos - a[1].avgCompartilhamentos)

  if (porTaxa[0]) insights.push({ tipo: 'ok', texto: `<b>${porTaxa[0][0]}</b> tem a maior taxa de engajamento (${porTaxa[0][1].avgTaxa}% médio). É o pilar que mais ativa reação da audiência.` })

  if (porSalv[0] && porSalv[0][1].avgSalvamentos > 0)
    insights.push({ tipo: 'ok', texto: `<b>${porSalv[0][0]}</b> lidera em salvamentos (média ${porSalv[0][1].avgSalvamentos} por post). Conteúdo percebido como útil pra guardar.` })

  if (porComp[0] && porComp[0][1].avgCompartilhamentos > 0) {
    if (porComp[0][0] !== porTaxa[0]?.[0])
      insights.push({ tipo: 'warn', texto: `<b>${porComp[0][0]}</b> domina compartilhamentos (média ${porComp[0][1].avgCompartilhamentos} por post) mas não é o de maior engajamento. Viraliza, mas pode não converter em autoridade diretamente.` })
    else
      insights.push({ tipo: 'ok', texto: `<b>${porComp[0][0]}</b> lidera tanto engajamento quanto compartilhamentos — sinal de identificação coletiva forte.` })
  }

  const engAltaSemComp = porTaxa.find(([, s]) => s.avgTaxa > 5 && s.avgCompartilhamentos < 2 && s.posts >= 3)
  if (engAltaSemComp)
    insights.push({ tipo: 'warn', texto: `<b>${engAltaSemComp[0]}</b> tem ${engAltaSemComp[1].avgTaxa}% de engajamento mas média de ${engAltaSemComp[1].avgCompartilhamentos} compartilhamentos. As pessoas curtem, mas ainda não repassam.` })

  const feedAvg = porTaxa.length ? +(porTaxa.reduce((s, [, v]) => s + v.avgTaxa, 0) / porTaxa.length).toFixed(1) : 0
  if (storiesStats.avgTaxa > feedAvg)
    insights.push({ tipo: 'ok', texto: `Stories têm taxa média de ${storiesStats.avgTaxa}% vs ${feedAvg}% do feed. O núcleo engajado está mais ativo nos stories.` })

  const formatos = Object.entries(formatoStats).sort((a, b) => b[1].avgTaxa - a[1].avgTaxa)
  if (formatos.length > 1)
    insights.push({ tipo: 'ok', texto: `Melhor formato por engajamento: <b>${formatos[0][0]}</b> (${formatos[0][1].avgTaxa}%). Pior: <b>${formatos[formatos.length - 1][0]}</b> (${formatos[formatos.length - 1][1].avgTaxa}%).` })

  const semAmostra = porTaxa.filter(([, s]) => s.posts === 1)
  if (semAmostra.length)
    insights.push({ tipo: 'alert', texto: `${semAmostra.map(([p]) => `<b>${p}</b>`).join(', ')} ${semAmostra.length > 1 ? 'têm' : 'tem'} apenas 1 post — amostra insuficiente para conclusões sobre ${semAmostra.length > 1 ? 'esses pilares' : 'esse pilar'}.` })

  return insights
}

// ─── BARRA ────────────────────────────────────────────────────────────────────

function Barra({ label, valor, max, cor, sufixo = '' }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-44 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">{valor}{sufixo}</span>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function AudienceAnalytics() {
  const [dados, setDados] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [erro, setErro] = useState(null)

  const processarArquivo = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) { setErro('Envie o CSV exportado pelo seu painel de métricas.'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result)
        if (rows.length < 3) { setErro('CSV com menos de 3 linhas.'); return }
        const result = processarDados(rows)
        if (result.feedPosts === 0) { setErro('Nenhum reel, carrossel ou imagem encontrado nesse CSV. Exporte o arquivo de feed, não de stories.'); return }
        setDados(result); setErro(null)
      } catch { setErro('Erro ao ler o arquivo. Verifique se é o CSV correto.') }
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const onDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); processarArquivo(e.dataTransfer.files[0]) }, [processarArquivo])

  if (!dados) return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-violet-500 blur-3xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-blue-500 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1"><Users size={18} className="text-violet-400" /><h2 className="text-base font-bold">Análise de Audiência</h2></div>
          <p className="text-sm text-gray-300 max-w-xl">Importe o CSV de reels e carrosséis para ver performance por pilar, sinais de comportamento e padrões da audiência.</p>
        </div>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-colors cursor-pointer ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        onClick={() => document.getElementById('csv-input-aud').click()}
      >
        <div className={`p-4 rounded-2xl ${dragOver ? 'bg-violet-100' : 'bg-gray-100'}`}><UploadCloud size={28} className={dragOver ? 'text-violet-500' : 'text-gray-400'} /></div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Arraste o CSV aqui ou clique para selecionar</p>
          <p className="text-xs text-gray-400 mt-1">Use o CSV de reels/carrosséis — não o de stories</p>
        </div>
        <input id="csv-input-aud" type="file" accept=".csv" className="hidden" onChange={(e) => processarArquivo(e.target.files[0])} />
      </div>
      {erro && <div className="card border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-red-600"><AlertCircle size={16} className="shrink-0" /><p className="text-sm">{erro}</p></div>}
    </div>
  )

  const { totalRows, uniquePosts, feedPosts, pilarStats, formatoStats, storiesStats, topPosts } = dados
  const insights = gerarInsights(dados)
  const porTaxa = Object.entries(pilarStats).sort((a, b) => b[1].avgTaxa - a[1].avgTaxa)
  const porSalv = Object.entries(pilarStats).sort((a, b) => b[1].avgSalvamentos - a[1].avgSalvamentos)
  const porComp = Object.entries(pilarStats).sort((a, b) => b[1].avgCompartilhamentos - a[1].avgCompartilhamentos)
  const porAlc  = Object.entries(pilarStats).sort((a, b) => b[1].avgAlcance - a[1].avgAlcance)
  const maxTaxa = Math.max(...porTaxa.map(([, s]) => s.avgTaxa))
  const maxSalv = Math.max(...porSalv.map(([, s]) => s.avgSalvamentos))
  const maxComp = Math.max(...porComp.map(([, s]) => s.avgCompartilhamentos))
  const maxAlc  = Math.max(...porAlc.map(([, s]) => s.avgAlcance))
  const feedAvgTaxa = porTaxa.length ? +(porTaxa.reduce((s, [, v]) => s + v.avgTaxa, 0) / porTaxa.length).toFixed(1) : 0

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
            <div className="flex items-center gap-2 mb-1"><Users size={18} className="text-violet-400" /><h2 className="text-base font-bold">Análise de Audiência</h2></div>
            <p className="text-xs text-gray-400">{totalRows} entradas → {uniquePosts} únicos após deduplicação · {feedPosts} posts de feed</p>
          </div>
          <button onClick={() => setDados(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors">
            <RefreshCw size={12} /> Novo CSV
          </button>
        </div>
      </div>

      {/* Métricas resumo */}
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
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-violet-500" /><p className="text-xs font-semibold text-gray-700">Taxa de engajamento por pilar</p></div>
          {porTaxa.map(([pl, s]) => <Barra key={pl} label={`${pl} (${s.posts}p)`} valor={s.avgTaxa} max={maxTaxa} cor={PILAR_COLORS[pl]?.bar || '#888'} sufixo="%" />)}
        </div>
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1"><Bookmark size={14} className="text-amber-500" /><p className="text-xs font-semibold text-gray-700">Salvamentos médios por pilar</p></div>
          {porSalv.map(([pl, s]) => <Barra key={pl} label={pl} valor={s.avgSalvamentos} max={maxSalv || 1} cor={PILAR_COLORS[pl]?.bar || '#888'} />)}
        </div>
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1"><Share2 size={14} className="text-blue-500" /><p className="text-xs font-semibold text-gray-700">Compartilhamentos médios por pilar</p></div>
          {porComp.map(([pl, s]) => <Barra key={pl} label={pl} valor={s.avgCompartilhamentos} max={maxComp || 1} cor={PILAR_COLORS[pl]?.bar || '#888'} />)}
        </div>
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1"><Eye size={14} className="text-emerald-500" /><p className="text-xs font-semibold text-gray-700">Alcance médio por pilar</p></div>
          {porAlc.map(([pl, s]) => <Barra key={pl} label={pl} valor={s.avgAlcance} max={maxAlc || 1} cor={PILAR_COLORS[pl]?.bar || '#888'} />)}
        </div>
      </div>

      {/* Por formato */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4"><BarChart2 size={14} className="text-indigo-500" /><p className="text-xs font-semibold text-gray-700">Performance por formato</p></div>
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
        <div className="flex items-center gap-2"><Zap size={14} className="text-orange-500" /><p className="text-xs font-semibold text-gray-700">Padrões identificados</p></div>
        {insights.map((ins, i) => {
          const s = { ok: 'border-emerald-200 bg-emerald-50 text-emerald-600', warn: 'border-amber-200 bg-amber-50 text-amber-600', alert: 'border-red-200 bg-red-50 text-red-600' }
          return (
            <div key={i} className={`card border p-4 flex gap-3 ${s[ins.tipo]}`}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: ins.texto }} />
            </div>
          )
        })}
      </div>

      {/* Top posts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4"><FileText size={14} className="text-gray-500" /><p className="text-xs font-semibold text-gray-700">Top posts por taxa de engajamento</p></div>
        <div className="space-y-2">
          {topPosts.map((p, i) => {
            const style = PILAR_COLORS[p._pilar] || PILAR_COLORS['Outro']
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>{p._pilar}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{p.tipo}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{p.desc ? p.desc.slice(0, 120) : '(sem descrição)'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">{p.taxaEng.toFixed(2)}%</p>
                  <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5 justify-end">
                    <span><Eye size={9} className="inline mr-0.5" />{p.alcance.toLocaleString('pt-BR')}</span>
                    <span><Bookmark size={9} className="inline mr-0.5" />{p.salvamentos}</span>
                    <span><Share2 size={9} className="inline mr-0.5" />{p.compartilhamentos}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {feedPosts < 20 && (
        <div className="card border border-amber-200 bg-amber-50 p-4 flex gap-2">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Base com {feedPosts} feed posts. Pilares com 1 post não são conclusivos. Recomendado reanalisar com 8+ semanas.</p>
        </div>
      )}
    </div>
  )
}
