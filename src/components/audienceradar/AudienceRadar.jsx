import { useMemo, useRef, useState } from 'react'
import {
  Target, UploadCloud, Link2, Type, RefreshCw, Trash2, Search, Download,
  Sparkles, Loader2, ExternalLink, Copy, AlertCircle, Check,
} from 'lucide-react'
import useStore from '../../store/useStore'
import useAIStore from '../../store/useAIStore'
import { aiClassifyProfiles } from '../../lib/aiService'
import {
  AXIS_LABELS, ENG_MAP, ENG_LABELS, TIER_META,
  scoreOf, tierOf, normalizeUrl, audienceProfileKey, localClassifyLine, formatFollowers,
} from '../../utils/audienceRadar'

const AXIS_KEYS = Object.keys(AXIS_LABELS)
const TIERS = ['A', 'B', 'C', 'D']
const MODES = [
  { id: 'json', label: 'Carregar perfis.json', icon: UploadCloud },
  { id: 'links', label: 'Fila de links', icon: Link2 },
  { id: 'texto', label: 'Colar texto', icon: Type },
]

function esc(v) {
  return String(v == null ? '' : v)
}

export default function AudienceRadar() {
  const profiles = useStore((s) => s.audienceProfiles)
  const weights = useStore((s) => s.audienceWeights)
  const cuts = useStore((s) => s.audienceCuts)
  const setWeights = useStore((s) => s.setAudienceWeights)
  const setCuts = useStore((s) => s.setAudienceCuts)
  const resetWeights = useStore((s) => s.resetAudienceWeights)
  const importProfiles = useStore((s) => s.importAudienceProfiles)
  const updateEng = useStore((s) => s.updateAudienceProfileEng)
  const clearProfiles = useStore((s) => s.clearAudienceProfiles)

  // Seleciona campos primitivos e monta o objeto com useMemo — passar um
  // selector que devolve um objeto novo a cada render (s.getSettings())
  // faz o Zustand entrar em loop infinito de re-render.
  const provider = useAIStore((s) => s.provider)
  const apiKey = useAIStore((s) => s.apiKey)
  const model = useAIStore((s) => s.model)
  const customBaseUrl = useAIStore((s) => s.customBaseUrl)
  const aiSettings = useMemo(() => ({ provider, apiKey, model, customBaseUrl }), [provider, apiKey, model, customBaseUrl])
  const isAIConfigured = !!apiKey?.trim()

  const [mode, setMode] = useState('json')
  const [dragOver, setDragOver] = useState(false)
  const [linksText, setLinksText] = useState('')
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // { text, err }
  const fileRef = useRef(null)

  const [tab, setTab] = useState('todos')
  const [q, setQ] = useState('')
  const [fOrigem, setFOrigem] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [sort, setSort] = useState({ k: 'score', dir: -1 })

  const setStat = (text, err = false) => setStatus(text ? { text, err } : null)

  // ── Import: perfis.json (drag/drop ou seletor) ──────────────────────────
  const readFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        const list = Array.isArray(data) ? data : data.perfis || data.rows || []
        if (!Array.isArray(list) || !list.length) {
          setStat('O arquivo não tem um array de perfis.', true)
          return
        }
        const { novos, atualizados } = importProfiles(list)
        setStat(`${novos} novo(s), ${atualizados} atualizado(s). Ajustes manuais de engajamento preservados.`)
      } catch (err) {
        setStat(`JSON inválido: ${err.message}`, true)
      }
    }
    reader.readAsText(file)
  }

  // ── Import: fila de links ───────────────────────────────────────────────
  const filaAtual = () => {
    const seen = {}
    const out = []
    linksText.split(/\r?\n/).forEach((l) => {
      const n = normalizeUrl(l)
      if (n && !seen[n.url]) {
        seen[n.url] = 1
        out.push(n)
      }
    })
    return out
  }

  const gerarFila = () => {
    const f = filaAtual()
    if (!f.length) {
      setStat('Nenhum link de Instagram ou LinkedIn reconhecido.', true)
      return
    }
    const blob = new Blob([f.map((x) => x.url).join('\n')], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'perfis-fila.txt'
    a.click()
    URL.revokeObjectURL(a.href)
    const li = f.filter((x) => x.origem === 'LI').length
    setStat(`${f.length} link(s) na fila (${li} LI, ${f.length - li} IG). Salvo como perfis-fila.txt.`)
  }

  const copiarComando = async () => {
    const f = filaAtual()
    const cmd = `Roda o radar-de-audiencia nesses perfis usando o Chrome:\n\n${
      f.length ? f.map((x) => x.url).join('\n') : '(cole os links aqui)'
    }\n\nColeta em lotes de 5 com pausa, salva em data/perfis.json e me diz quantos ficaram em A.`
    try {
      await navigator.clipboard.writeText(cmd)
      setStat('Comando copiado. Cola no Claude Code.')
    } catch {
      setStat('Não consegui acessar a área de transferência.', true)
    }
  }

  // ── Import: colar texto (local ou IA) ───────────────────────────────────
  const linhasColadas = () =>
    rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1)

  const classificarLocal = () => {
    const lines = linhasColadas()
    if (!lines.length) {
      setStat('Cola pelo menos uma linha.', true)
      return
    }
    const { novos, atualizados } = importProfiles(lines.map(localClassifyLine))
    setStat(`${novos} classificado(s) localmente${atualizados ? `, ${atualizados} atualizado(s)` : ''}. Sem IA: revise as notas.`)
  }

  const classificarComIA = async () => {
    const lines = linhasColadas()
    if (!lines.length) {
      setStat('Cola pelo menos uma linha.', true)
      return
    }
    setLoading(true)
    setStat(`Classificando ${lines.length} linha(s) com IA...`)
    try {
      const result = await aiClassifyProfiles(aiSettings, lines)
      const { novos, atualizados } = importProfiles(result)
      setStat(`${novos} classificado(s) por IA${atualizados ? `, ${atualizados} atualizado(s)` : ''}.`)
    } catch (err) {
      setStat(`Falhou: ${err.message}`, true)
    }
    setLoading(false)
  }

  // ── Tabela derivada ──────────────────────────────────────────────────────
  const scored = useMemo(
    () => profiles.map((r) => ({ ...r, score: scoreOf(r, weights), tier: tierOf(scoreOf(r, weights), cuts) })),
    [profiles, weights, cuts]
  )

  const tipos = useMemo(() => [...new Set(profiles.map((r) => r.tipo))].sort(), [profiles])

  const stats = useMemo(() => {
    const c = { A: 0, B: 0, C: 0, D: 0 }
    scored.forEach((r) => c[r.tier]++)
    return c
  }, [scored])

  const visible = useMemo(() => {
    const query = q.toLowerCase().trim()
    return scored
      .filter((r) => {
        if (tab !== 'todos' && r.tier !== tab) return false
        if (fOrigem && r.origem !== fOrigem) return false
        if (fTipo && r.tipo !== fTipo) return false
        if (fStatus === 'ok' && r.status_coleta !== 'ok') return false
        if (fStatus === 'problema' && (r.status_coleta === 'ok' || r.status_coleta === 'manual')) return false
        if (query) {
          const hay = `${r.nome} ${r.handle} ${r.cargo} ${r.empresa} ${r.setor} ${r.tipo} ${r.porque}`.toLowerCase()
          if (!hay.includes(query)) return false
        }
        return true
      })
      .sort((a, b) => {
        const va = a[sort.k]
        const vb = b[sort.k]
        if (typeof va === 'string') return sort.dir * va.localeCompare(String(vb), 'pt-BR')
        return sort.dir * ((va || 0) - (vb || 0))
      })
  }, [scored, tab, fOrigem, fTipo, fStatus, q, sort])

  const toggleSort = (k) => setSort((s) => (s.k === k ? { k, dir: s.dir * -1 } : { k, dir: -1 }))

  const exportCSV = () => {
    if (!visible.length) return
    const head = ['Nome', 'Handle', 'URL', 'Cargo', 'Empresa', 'Setor', 'Seguidores', 'Origem', 'Tipo', 'Decisor', 'Fit', 'Engajamento', 'Alcance', 'Score', 'Tier', 'Porque', 'Evidencia', 'Abordagem', 'Coletado', 'Status']
    const lines = [head.join(',')].concat(
      visible.map((r) =>
        [r.nome, r.handle, r.url, r.cargo, r.empresa, r.setor, r.seguidores, r.origem, r.tipo, r.decisor, r.fit, ENG_MAP[r.eng], r.alcance, r.score, r.tier, r.porque, r.evidencia, r.abordagem, r.coletado_em, r.status_coleta]
          .map((v) => `"${esc(v).replace(/"/g, '""')}"`)
          .join(',')
      )
    )
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'radar-audiencia.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleClear = () => {
    if (!profiles.length) return
    if (!confirm(`Apagar as ${profiles.length} pessoas da base?`)) return
    clearProfiles()
    setStat('Base zerada.')
  }

  return (
    <div className="p-6 animate-fade-in space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-orange-500 blur-3xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-emerald-500 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Target size={18} className="text-orange-400" />
            <h2 className="text-base font-bold">Radar de Audiência</h2>
          </div>
          <p className="text-sm text-gray-300 max-w-2xl">
            Classifica e pontua seguidores de Instagram e LinkedIn em quatro eixos. Carregue um{' '}
            <code className="text-orange-300">perfis.json</code> coletado pelo Claude Code, monte uma fila de links pra
            ele coletar, ou cole texto pra classificar direto aqui.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 items-start">
        {/* Import panel */}
        <div className="card p-5">
          <div className="flex gap-1 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setStat(null) }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  mode === m.id ? 'border-orange-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <m.icon size={13} /> {m.label}
              </button>
            ))}
          </div>

          {mode === 'json' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-2 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <UploadCloud size={24} className={dragOver ? 'text-orange-500' : 'text-gray-400'} />
              <p className="text-sm font-medium text-gray-700">Arraste perfis.json aqui, ou clique pra escolher</p>
              <p className="text-xs text-gray-400">
                Gerado pela skill radar-de-audiencia. Perfis com a mesma URL são atualizados no lugar; ajuste manual de
                engajamento é preservado.
              </p>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => readFile(e.target.files[0])} />
            </div>
          )}

          {mode === 'links' && (
            <div className="space-y-3">
              <textarea
                className="input font-mono text-xs min-h-[140px]"
                placeholder={'Um link por linha.\n\nhttps://www.linkedin.com/in/ana-ribeiro/\nhttps://www.instagram.com/juprado.oficial/\nlinkedin.com/in/marcos-tavares\n@designdadeb'}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
              />
              <p className="text-xs text-gray-400">
                Esta tela não abre navegador. Ela normaliza os links, tira duplicados e monta a fila que o Claude Code
                vai coletar.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary" onClick={gerarFila}><Download size={13} /> Gerar fila</button>
                <button className="btn-secondary" onClick={copiarComando}><Copy size={13} /> Copiar comando pro Code</button>
              </div>
            </div>
          )}

          {mode === 'texto' && (
            <div className="space-y-3">
              <textarea
                className="input font-mono text-xs min-h-[140px]"
                placeholder={'Uma pessoa por linha, quando você já tem a bio na mão.\n\nAna Ribeiro | @anaribeiro | Head de Operações, varejo alimentar, 4k seg | IG | eng:3\nMarcos Tavares | CTO na Fintech Norte | LI | eng:1'}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-xs text-gray-400">
                Marque engajamento com <code>eng:0</code> a <code>eng:3</code>. Sem IA configurada, usa leitura local
                por palavra-chave — confira as notas.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-secondary" onClick={classificarLocal} disabled={loading}>
                  <Type size={13} /> Classificar local
                </button>
                <button className="btn-primary" onClick={classificarComIA} disabled={loading || !isAIConfigured} title={!isAIConfigured ? 'Configure uma chave de IA em Configurações' : ''}>
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Classificar com IA
                </button>
              </div>
              {!isAIConfigured && <p className="text-[11px] text-gray-400">Sem chave de IA configurada — só o modo local funciona.</p>}
            </div>
          )}

          {status && (
            <div className={`flex items-center gap-2 text-xs mt-3 px-3 py-2 rounded-lg ${status.err ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {status.err ? <AlertCircle size={13} /> : <Check size={13} />}
              {status.text}
            </div>
          )}
        </div>

        {/* Weights panel */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Seus critérios</h3>
          {AXIS_KEYS.map((k) => {
            const total = AXIS_KEYS.reduce((s, x) => s + weights[x], 0)
            const pct = total ? Math.round((weights[k] / total) * 100) : 0
            return (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1">
                  <b className="font-medium text-gray-700">{AXIS_LABELS[k].label}</b>
                  <span className="text-gray-400 tabular-nums">{pct}%</span>
                </div>
                <input
                  type="range" min={0} max={60} value={weights[k]}
                  onChange={(e) => setWeights({ ...weights, [k]: parseInt(e.target.value, 10) })}
                  className="w-full accent-orange-500"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">{AXIS_LABELS[k].hint}</p>
              </div>
            )
          })}
          <button className="btn-ghost text-xs" onClick={resetWeights}><RefreshCw size={12} /> Voltar ao padrão</button>

          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-2">Corte dos tiers</h3>
          {[
            ['A', 'contatar agora', 50, 95],
            ['B', 'aquecer antes', 30, 80],
            ['C', 'observar', 10, 60],
          ].map(([t, label, min, max]) => (
            <div key={t}>
              <div className="flex justify-between text-xs mb-1">
                <b className="font-medium text-gray-700">{t} — {label}</b>
                <span className="text-gray-400 tabular-nums">≥ {cuts[t]}</span>
              </div>
              <input
                type="range" min={min} max={max} value={cuts[t]}
                onChange={(e) => setCuts({ ...cuts, [t]: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TIERS.map((t) => (
          <div key={t} className="card p-4">
            <p className="text-[11px] text-gray-400 mb-1">{t} · {TIER_META[t].label}</p>
            <p className="text-xl font-bold text-gray-900">{stats[t]}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-5">
        <div className="flex gap-1 border-b mb-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
          {['todos', ...TIERS].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-orange-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {t === 'todos' ? 'Todos' : `${t} — ${TIER_META[t].label}`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center mb-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 py-1.5 text-xs w-52" placeholder="Buscar nome, cargo, setor..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select py-1.5 text-xs w-auto" value={fOrigem} onChange={(e) => setFOrigem(e.target.value)}>
            <option value="">Origem: todas</option>
            <option value="IG">IG</option>
            <option value="LI">LI</option>
          </select>
          <select className="select py-1.5 text-xs w-auto" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="">Tipo: todos</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="select py-1.5 text-xs w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Coleta: toda</option>
            <option value="ok">só coletados</option>
            <option value="problema">com problema</option>
          </select>
          <div className="flex-1" />
          <button className="btn-secondary text-xs" onClick={exportCSV}><Download size={12} /> Exportar CSV</button>
          <button className="btn-ghost text-xs" onClick={handleClear}><Trash2 size={12} /> Limpar base</button>
        </div>

        {!profiles.length ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Base vazia. Carregue um <b>perfis.json</b>, monte uma fila de links, ou cole texto pra classificar.
          </div>
        ) : !visible.length ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhum resultado com esses filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {[['nome', 'Pessoa'], ['tipo', 'Tipo'], ['origem', 'Origem'], ['decisor', 'Eixos D/F/E/A'], ['eng', 'Eng'], ['score', 'Score'], ['tier', 'Tier'], ['abordagem', 'Abordagem']].map(([k, label]) => (
                    <th key={k} onClick={() => toggleSort(k)} className="text-left py-2.5 px-3 font-semibold text-gray-500 cursor-pointer select-none whitespace-nowrap hover:text-gray-800">
                      {label}{sort.k === k ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const sub = [r.cargo, r.empresa, r.setor].filter(Boolean).join(' · ')
                  const seg = r.seguidores != null ? `${formatFollowers(r.seguidores)} seg` : ''
                  const key = audienceProfileKey(r)
                  return (
                    <tr key={key} className="border-b hover:bg-gray-50" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="py-2.5 px-3 align-top max-w-[260px]">
                        <div className="font-semibold text-gray-900">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 inline-flex items-center gap-1">
                              {r.nome} <ExternalLink size={10} />
                            </a>
                          ) : r.nome}
                          {r.status_coleta && r.status_coleta !== 'ok' && r.status_coleta !== 'manual' && (
                            <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{r.status_coleta}</span>
                          )}
                        </div>
                        {r.handle && <div className="text-gray-400">{r.handle}</div>}
                        {(sub || seg) && <div className="text-gray-400">{sub}{sub && seg ? ' · ' : ''}{seg}</div>}
                        {r.porque && <div className="text-gray-500 mt-0.5">{r.porque}</div>}
                        {r.evidencia && <div className="text-gray-400 italic mt-0.5">&ldquo;{r.evidencia}&rdquo;</div>}
                      </td>
                      <td className="py-2.5 px-3 align-top"><span className="chip bg-orange-50 text-orange-700">{r.tipo}</span></td>
                      <td className="py-2.5 px-3 align-top"><span className="chip bg-gray-100 text-gray-600">{r.origem}</span></td>
                      <td className="py-2.5 px-3 align-top tabular-nums text-gray-600 whitespace-nowrap">
                        <b className="text-gray-900">{r.decisor.toFixed(0)}</b>/{r.fit.toFixed(0)}/{ENG_MAP[r.eng] ?? 0}/{r.alcance.toFixed(0)}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <select className="select py-1 text-[11px] w-auto" value={r.eng} onChange={(e) => updateEng(key, parseInt(e.target.value, 10))}>
                          {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{ENG_LABELS[v]}</option>)}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 align-top font-bold text-gray-900 tabular-nums">{r.score}</td>
                      <td className="py-2.5 px-3 align-top">
                        <span className={`inline-block min-w-[20px] text-center text-[11px] font-bold px-1.5 py-0.5 rounded text-white ${
                          r.tier === 'A' ? 'bg-emerald-600' : r.tier === 'B' ? 'bg-emerald-400' : r.tier === 'C' ? 'bg-gray-400' : 'bg-gray-200 !text-gray-500'
                        }`}>{r.tier}</span>
                      </td>
                      <td className="py-2.5 px-3 align-top text-gray-500 max-w-[200px]">{r.abordagem}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
