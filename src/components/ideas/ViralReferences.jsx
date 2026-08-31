import { useMemo, useState } from 'react'
import {
  Flame, Search, Loader2, Sparkles, ExternalLink, Trash2, Check,
  AlertCircle, ChevronDown, ChevronUp, Eye, Heart, Save, Info,
  LayoutGrid, List,
  CalendarDays,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { getEnabledPlatforms, normalizeResult } from '../../lib/videoPlatforms'
import { combinedViralTopics } from '../../lib/viralTopics'
import { extractJsonObject, assertNotTruncated } from '../../utils/aiJson'
import { buildVoiceContext } from '../../utils/voiceContext'
import { ANTI_AI_FILTER } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'
import { WORK_NICHE } from '../../utils/themeCategories'

const LS_OPENAI = 'cio-openai-key'

const PLATFORM_LABELS = { youtube: 'YouTube', dailymotion: 'Dailymotion', vimeo: 'Vimeo', tiktok: 'TikTok', instagram: 'Instagram' }

function formatCount(n) {
  const num = parseInt(n, 10)
  if (!num || Number.isNaN(num)) return null
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

function formatPublishedDate(date) {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Prompt de análise — só legenda/título + métricas, nunca o vídeo em si ──────
function buildViralAnalysisPrompt({ video, topic, voiceContext }) {
  return `Você está analisando um vídeo viral encontrado numa busca por tema — você NÃO tem acesso ao vídeo em si (sem frames, sem transcrição), só ao título/legenda e às métricas públicas abaixo. Nunca invente o que aparece na tela ou é dito em voz alta — trabalhe só com o texto disponível.

PLATAFORMA: ${PLATFORM_LABELS[video.platform] || video.platform}
TEMA DA BUSCA: ${topic}
TÍTULO/LEGENDA DISPONÍVEL: ${video.caption?.trim() || video.title?.trim() || '(nenhuma legenda disponível — vídeo sem texto associado)'}
VISUALIZAÇÕES: ${video.viewCount || 'não disponível'}
CURTIDAS: ${video.likeCount || 'não disponível'}
DATA DE PUBLICAÇÃO: ${formatPublishedDate(video.publishedAt) || 'não disponível'}

Extraia, com honestidade sobre o que dá pra inferir:
1. Gancho provável de abertura (se a legenda já É literalmente a fala de abertura, use-a citando; senão, é uma inferência baseada no padrão do texto — marque como inferência)
2. Estrutura provável de desenvolvimento — hipótese, não certeza
3. Por que provavelmente funcionou — conecte com as métricas e o padrão do texto
4. Fórmula reaproveitável — o padrão estrutural por trás disso, generalizado (nunca a frase literal)
5. Confiabilidade dessa análise (alta/média/baixa) — baixa se a legenda for vazia ou pouco informativa
6. 3 ideias de conteúdo aplicando essa fórmula ao tema de Karen Santos — ${WORK_NICHE}

As 3 ideias de conteúdo devem seguir as regras de voz e as proibições abaixo.
${voiceContext}

Responda SOMENTE com JSON válido, sem texto antes ou depois:
{
  "gancho_provavel": "a frase",
  "gancho_e_citacao_literal": true,
  "estrutura_provavel": ["passo 1", "passo 2", "passo 3"],
  "por_que_funcionou": "1-2 frases",
  "formula_reaproveitavel": "o padrão generalizado",
  "confiabilidade": "alta | média | baixa",
  "confiabilidade_motivo": "1 frase",
  "ideias": [
    { "title": "título curto", "hook": "gancho de abertura", "format": "reel", "platform": "instagram" }
  ]
}`
}

async function callClaude(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'gpt-5.6-terra',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Erro ${res.status}`)
  }
  const data = await res.json()
  assertNotTruncated(data, 'A análise ficou grande demais e foi cortada pela IA antes de terminar. Tente novamente.')
  const raw = data.content?.find((b) => b.type === 'text')?.text || ''
  return extractJsonObject(raw, 'A IA não retornou uma análise estruturada. Tente novamente.')
}

function ConfiabilidadeBadge({ nivel }) {
  const cls = nivel === 'alta' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : nivel === 'média' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-500 border-gray-200'
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>Confiabilidade {nivel || 'baixa'}</span>
}

function SavedReferenceCard({ reference, onRemove, onSaveIdea, savedIdeaKeys }) {
  const [open, setOpen] = useState(false)
  const r = reference.result || {}

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-md">
              {PLATFORM_LABELS[reference.platform] || reference.platform}
            </span>
            <span className="text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md">
              {reference.topic}
            </span>
            <ConfiabilidadeBadge nivel={r.confiabilidade} />
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1.5 line-clamp-2">{reference.title || '(sem título)'}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatCount(reference.viewCount) ? `${formatCount(reference.viewCount)} visualizações` : ''}
            {formatCount(reference.likeCount) ? ` · ${formatCount(reference.likeCount)} curtidas` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {reference.url && (
            <a href={reference.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Abrir vídeo original">
              <ExternalLink size={14} />
            </a>
          )}
          <button onClick={() => onRemove(reference.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Remover">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2.5 text-xs border-t border-gray-100 pt-3">
          {r.gancho_provavel && (
            <div>
              <div className="font-semibold text-gray-700 mb-0.5">
                Gancho provável {r.gancho_e_citacao_literal === false && <span className="text-gray-300 font-normal">(inferência)</span>}
              </div>
              <p className="text-gray-600 italic">"{r.gancho_provavel}"</p>
            </div>
          )}
          {r.estrutura_provavel?.length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 mb-0.5">Estrutura provável</div>
              <p className="text-gray-600">{r.estrutura_provavel.join(' → ')}</p>
            </div>
          )}
          {r.por_que_funcionou && (
            <div>
              <div className="font-semibold text-gray-700 mb-0.5">Por que provavelmente funcionou</div>
              <p className="text-gray-600">{r.por_que_funcionou}</p>
            </div>
          )}
          {r.formula_reaproveitavel && (
            <div>
              <div className="font-semibold text-gray-700 mb-0.5">Fórmula reaproveitável</div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 text-orange-800 font-medium">{r.formula_reaproveitavel}</div>
            </div>
          )}
          {r.confiabilidade_motivo && (
            <p className="text-gray-400 text-[11px] flex items-start gap-1"><Info size={11} className="mt-0.5 shrink-0" /> {r.confiabilidade_motivo}</p>
          )}
          {r.ideias?.length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 mb-1.5">Ideias de conteúdo</div>
              <div className="space-y-1.5">
                {r.ideias.map((idea, i) => {
                  const key = `${reference.id}:${i}`
                  const saved = savedIdeaKeys.has(key)
                  return (
                    <div key={i} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{idea.title}</p>
                        {idea.hook && <p className="text-gray-500 mt-0.5">"{idea.hook}"</p>}
                      </div>
                      <button
                        onClick={() => onSaveIdea(reference, idea, key)}
                        disabled={saved}
                        className={clsx(
                          'shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
                          saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-white border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600'
                        )}
                      >
                        {saved ? <><Check size={11} /> Salva</> : <><Save size={11} /> Salvar</>}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ViralReferences() {
  const pilares = useStore((s) => s.posicionamento.pilares)
  const brandVoice = useStore((s) => s.brandVoice)
  const dislikedContent = useStore((s) => s.dislikedContent)
  const posicionamento = useStore((s) => s.posicionamento)
  const bannedWords = useStore((s) => s.posicionamento.lista_negra) || []
  const viralReferences = useStore((s) => s.viralReferences)
  const addViralReference = useStore((s) => s.addViralReference)
  const removeViralReference = useStore((s) => s.removeViralReference)
  const addIdea = useStore((s) => s.addIdea)

  const topics = useMemo(() => combinedViralTopics(pilares), [pilares])
  const enabledPlatforms = useMemo(() => getEnabledPlatforms(), [
    // getEnabledPlatforms lê localStorage direto; recalcula ao montar/reabrir a aba.
  ])

  const [selectedTopics, setSelectedTopics] = useState(new Set())
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => new Set(getEnabledPlatforms().map((p) => p.id)))
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [results, setResults] = useState([])
  const [analyzingId, setAnalyzingId] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [savedIdeaKeys, setSavedIdeaKeys] = useState(new Set())
  const [recencyDays, setRecencyDays] = useState('30')
  const [resultSort, setResultSort] = useState('recent')
  const [hasSearched, setHasSearched] = useState(false)

  const toggleTopic = (query) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(query)) next.delete(query)
      else next.add(query)
      return next
    })
  }

  const togglePlatform = (id) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const savedSourceIds = useMemo(() => new Set(viralReferences.map((r) => r.sourceId)), [viralReferences])

  const platformsToSearch = useMemo(
    () => enabledPlatforms.filter((p) => selectedPlatforms.has(p.id)),
    [enabledPlatforms, selectedPlatforms]
  )

  const handleSearch = async () => {
    if (selectedTopics.size === 0 || platformsToSearch.length === 0) return
    setSearching(true)
    setHasSearched(false)
    setSearchError(null)
    try {
      const days = recencyDays === 'any' ? null : Number(recencyDays)
      const cutoff = days ? new Date(Date.now() - days * 86400000) : null
      const searchOptions = {
        sort: resultSort,
        ...(cutoff ? { publishedAfter: cutoff.toISOString() } : {}),
      }
      const tasks = []
      for (const topic of selectedTopics) {
        for (const platform of platformsToSearch) {
          tasks.push(
            platform.run(topic, searchOptions)
              .then((raw) => raw.map((v) => normalizeResult(v, topic, topic)))
              .catch(() => [])
          )
        }
      }
      const lists = await Promise.all(tasks)
      const seen = new Set()
      const merged = []
      for (const v of lists.flat()) {
        if (!v.id || seen.has(v.id) || savedSourceIds.has(v.id)) continue
        if (cutoff) {
          const published = v.publishedAt ? new Date(v.publishedAt) : null
          if (!published || Number.isNaN(published.getTime()) || published < cutoff) continue
        }
        seen.add(v.id)
        merged.push(v)
      }
      if (resultSort === 'recent') {
        merged.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      } else if (resultSort === 'views') {
        merged.sort((a, b) => (parseInt(b.viewCount, 10) || 0) - (parseInt(a.viewCount, 10) || 0))
      }
      setResults(merged.slice(0, 30))
      setHasSearched(true)
    } catch (e) {
      setSearchError(e.message)
    } finally {
      setSearching(false)
    }
  }

  const handleAnalyze = async (video) => {
    const apiKey = localStorage.getItem(LS_OPENAI)
    if (!apiKey) { setAnalyzeError('Configure sua API key da OpenAI em Configurações.'); return }
    setAnalyzingId(video.id)
    setAnalyzeError(null)
    try {
      const voiceContext = buildVoiceContext(brandVoice, dislikedContent, bannedWords, posicionamento)
      const system = withManualOperacional(ANTI_AI_FILTER)
      const prompt = buildViralAnalysisPrompt({ video, topic: video.query, voiceContext })
      const result = await callClaude(apiKey, system, prompt)
      addViralReference({
        sourceId: video.id,
        platform: video.platform,
        title: video.title,
        caption: video.caption,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        publishedAt: video.publishedAt,
        topic: video.category,
        result,
      })
      setResults((prev) => prev.filter((v) => v.id !== video.id))
    } catch (e) {
      setAnalyzeError(e.message)
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleSaveIdea = (reference, idea, key) => {
    if (savedIdeaKeys.has(key)) return
    addIdea({
      title: idea.title,
      description: idea.hook ? `Gancho: "${idea.hook}"` : '',
      format: idea.format || 'reel',
      platform: idea.platform || 'instagram',
      priority: 'medium',
      status: 'idea',
      tags: ['video-viral-referencia', reference.topic].filter(Boolean),
    })
    setSavedIdeaKeys((prev) => new Set([...prev, key]))
  }

  const hasAnyPlatform = enabledPlatforms.length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
          <Flame size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Vídeos Virais</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Busca vídeos sobre os temas que você fala e analisa o padrão por trás deles.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          v1: a análise usa só título/legenda e métricas públicas (visualizações, curtidas) — não baixa o vídeo nem analisa frames.
          Isso evita depender de scraping pesado de vídeo, que estoura limite de servidor com frequência. Baixar de verdade pode virar v2.
        </p>
      </div>

      {!hasAnyPlatform && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">Nenhuma plataforma configurada ainda. Dailymotion não exige chave.</span>
          <Link to="/settings" className="text-xs font-semibold text-amber-700 underline">Configurações</Link>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Plataformas — escolha onde buscar</p>
        <div className="flex flex-wrap gap-2">
          {['youtube', 'dailymotion', 'tiktok', 'instagram'].map((id) => {
            const configured = enabledPlatforms.some((p) => p.id === id)
            const active = configured && selectedPlatforms.has(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => configured && togglePlatform(id)}
                disabled={!configured}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  active     ? 'border-orange-400 bg-orange-50 text-orange-700' :
                  configured ? 'border-gray-200 bg-white text-gray-500 hover:border-orange-300 hover:text-orange-600' :
                               'border-gray-200 bg-gray-50 text-gray-400 cursor-default'
                )}
              >
                {active && <Check size={11} />} {PLATFORM_LABELS[id]}
                {!configured && <Link to="/settings" onClick={(e) => e.stopPropagation()} className="ml-0.5 text-orange-500 hover:underline text-[10px] font-semibold">Configurar</Link>}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recência dos conteúdos</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={recencyDays}
              onChange={(e) => setRecencyDays(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-600 outline-none focus:border-orange-300"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
              <option value="any">Qualquer data</option>
            </select>
          </div>
          <select
            value={resultSort}
            onChange={(e) => setResultSort(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-600 outline-none focus:border-orange-300"
          >
            <option value="recent">Ordenar por mais recentes</option>
            <option value="views">Ordenar por mais vistos</option>
            <option value="relevance">Ordenar por relevância</option>
          </select>
          {recencyDays !== 'any' && (
            <span className="text-[10px] text-gray-400">Resultados sem data verificável ficam fora deste recorte.</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Temas (pilares do Posicionamento + banco de temas do Carrossel)
        </p>
        {topics.length === 0 ? (
          <p className="text-xs text-gray-400">
            Nenhum pilar definido em <Link to="/posicionamento" className="underline">Posicionamento</Link> — usando só o banco de temas.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {topics.map((t) => {
            const active = selectedTopics.has(t.query)
            return (
              <button
                key={t.query}
                type="button"
                onClick={() => toggleTopic(t.query)}
                className={clsx(
                  'text-left px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  active ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                )}
              >
                {t.label}
                <span className="ml-1.5 text-[9px] text-gray-400 capitalize">{t.source}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={searching || selectedTopics.size === 0 || platformsToSearch.length === 0}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
      >
        {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        {searching ? 'Buscando...' : 'Buscar vídeos virais'}
      </button>
      {hasAnyPlatform && platformsToSearch.length === 0 && (
        <p className="text-xs text-amber-600 -mt-4">Selecione ao menos uma plataforma configurada acima.</p>
      )}

      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {searchError}
        </div>
      )}
      {analyzeError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {analyzeError}
        </div>
      )}

      {hasSearched && results.length === 0 && !searchError && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <CalendarDays size={22} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Nenhum vídeo encontrado neste período.</p>
          <p className="text-xs text-gray-400 mt-1">Amplie o intervalo de datas ou escolha “Qualquer data”.</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {results.length} resultado{results.length !== 1 ? 's' : ''} no período selecionado
            </p>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Visão em grade"
                className={clsx('p-1.5 rounded-md', viewMode === 'grid' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600')}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Visão em lista"
                className={clsx('p-1.5 rounded-md', viewMode === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600')}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((video) => (
                <div key={video.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt="" className="w-full h-32 object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300 text-xs">Sem thumbnail</div>
                  )}
                  <div className="p-3 flex-1 flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-md self-start">
                      {PLATFORM_LABELS[video.platform] || video.platform}
                    </span>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{video.title}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-2">
                      {formatPublishedDate(video.publishedAt) && <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatPublishedDate(video.publishedAt)}</span>}
                      {formatCount(video.viewCount) && <span className="flex items-center gap-1"><Eye size={10} /> {formatCount(video.viewCount)}</span>}
                      {formatCount(video.likeCount) && <span className="flex items-center gap-1"><Heart size={10} /> {formatCount(video.likeCount)}</span>}
                    </p>
                    <div className="mt-auto flex items-center gap-1.5 pt-1.5">
                      {video.url && (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600" title="Abrir">
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => handleAnalyze(video)}
                        disabled={analyzingId === video.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-orange-500 text-white rounded-lg text-[11px] font-semibold hover:bg-orange-600 disabled:opacity-50"
                      >
                        {analyzingId === video.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {analyzingId === video.id ? 'Analisando...' : 'Analisar e salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {results.map((video) => (
                <div key={video.id} className="flex items-center gap-3 p-2.5">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt="" className="w-16 h-16 object-cover rounded-lg bg-gray-100 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-[9px] shrink-0">Sem thumb</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-md shrink-0">
                        {PLATFORM_LABELS[video.platform] || video.platform}
                      </span>
                      <p className="text-xs font-medium text-gray-800 truncate">{video.title}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                      {formatPublishedDate(video.publishedAt) && <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatPublishedDate(video.publishedAt)}</span>}
                      {formatCount(video.viewCount) && <span className="flex items-center gap-1"><Eye size={10} /> {formatCount(video.viewCount)}</span>}
                      {formatCount(video.likeCount) && <span className="flex items-center gap-1"><Heart size={10} /> {formatCount(video.likeCount)}</span>}
                      <span className="text-gray-300">·</span>
                      <span>{video.category}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {video.url && (
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600" title="Abrir">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      onClick={() => handleAnalyze(video)}
                      disabled={analyzingId === video.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[11px] font-semibold hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
                    >
                      {analyzingId === video.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {analyzingId === video.id ? 'Analisando...' : 'Analisar e salvar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viralReferences.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {viralReferences.length} referência{viralReferences.length !== 1 ? 's' : ''} analisada{viralReferences.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {viralReferences.map((ref) => (
              <SavedReferenceCard key={ref.id} reference={ref} onRemove={removeViralReference} onSaveIdea={handleSaveIdea} savedIdeaKeys={savedIdeaKeys} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
