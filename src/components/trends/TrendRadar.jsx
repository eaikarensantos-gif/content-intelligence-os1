import { useState } from 'react'
import { Search, Radar, Users, TrendingUp, Lightbulb, Plus, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import useStore from '../../store/useStore'
import { simulateTrendSearch } from '../../utils/trendSimulator'
import { PlatformBadge, FormatBadge } from '../common/Badge'

const PLATFORM_ICONS = {
  linkedin: '💼', instagram: '📸', tiktok: '🎵', youtube: '🎬', twitter: '𝕏',
}

const SUGGESTED = ['IA nos negócios', 'economia de criadores', 'carreira em tecnologia', 'marketing digital', 'marca pessoal', 'vida como solopreneur']

const POTENTIAL_LABELS = {
  'Very High': 'Muito Alto',
  'High': 'Alto',
  'Medium': 'Médio',
  'Low': 'Baixo',
}

const POTENTIAL_COLORS = {
  'Very High': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'High': 'bg-blue-100 text-blue-700 border-blue-200',
  'Medium': 'bg-gray-100 text-gray-500 border-gray-200',
  'Low': 'bg-gray-100 text-gray-400 border-gray-200',
}

function CreatorCard({ creator }) {
  return (
    <div className="card p-4 flex items-start gap-3 hover:border-orange-300 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
        {creator.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{creator.name}</span>
          <span className="text-base" title={creator.platform}>{PLATFORM_ICONS[creator.platform]}</span>
          {creator.profile_url && (
            <a
              href={creator.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-gray-400 hover:text-orange-500 transition-colors shrink-0"
              title="Ver perfil"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-1">{creator.handle} · {creator.followers} seguidores</p>
        <p className="text-[11px] text-gray-500 mb-2">{creator.niche}</p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {(creator.recent_topics || []).slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
            ))}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium shrink-0 ml-2">{creator.avg_engagement} eng.</span>
        </div>
      </div>
    </div>
  )
}

function OpportunityCard({ opp, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const potentialLabel = POTENTIAL_LABELS[opp.potential] || opp.potential
  const potentialColor = POTENTIAL_COLORS[opp.potential] || POTENTIAL_COLORS['Medium']

  return (
    <div className="card p-4 space-y-3 hover:border-orange-300 transition-all">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{opp.title}</h4>
        <span className={`chip border shrink-0 ${potentialColor}`}>
          {potentialLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PlatformBadge platform={opp.platform} />
        <FormatBadge format={opp.format} />
        <span className="chip bg-amber-100 text-amber-700 border border-amber-200">{opp.hook}</span>
      </div>

      {expanded && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-gray-500 leading-relaxed">{opp.description}</p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500 font-medium mb-0.5">Lacuna de Conteúdo Identificada:</p>
            <p className="text-xs text-gray-600">{opp.content_gap}</p>
          </div>
          {opp.hook_example && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-[11px] text-orange-600 font-medium mb-0.5">Exemplo de Gancho:</p>
              <p className="text-xs text-gray-700 italic">"{opp.hook_example}"</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <button
          onClick={() => setExpanded((x) => !x)}
          className="btn-ghost text-xs py-1 px-2"
        >
          {expanded ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Detalhes</>}
        </button>
        <button onClick={() => onSave(opp)} className="btn-primary text-xs py-1.5 px-3">
          <Plus size={12} /> Salvar em Ideias
        </button>
      </div>
    </div>
  )
}

export default function TrendRadar() {
  const setTrendResults = useStore((s) => s.setTrendResults)
  const trendResults = useStore((s) => s.trendResults)
  const addIdea = useStore((s) => s.addIdea)

  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())

  const handleSearch = async () => {
    if (!topic.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1800))
    const results = simulateTrendSearch(topic.trim())
    setTrendResults(results)
    setLoading(false)
    setSavedIds(new Set())
  }

  const handleSaveOpp = (opp) => {
    addIdea({
      title: opp.title,
      description: opp.description,
      topic: trendResults?.topic || opp.hook,
      format: opp.format,
      hook_type: opp.hook?.toLowerCase().replace(' hook', '') || 'lista',
      platform: opp.platform,
      priority: opp.potential === 'Very High' ? 'high' : opp.potential === 'High' ? 'medium' : 'low',
      status: 'idea',
      tags: ['tendencia', trendResults?.topic].filter(Boolean),
    })
    setSavedIds((s) => new Set([...s, opp.id]))
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Busca */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-orange-100">
            <Radar size={18} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Descubra Tendências no Seu Nicho</h2>
            <p className="text-xs text-gray-400">Digite um tópico para encontrar criadores, padrões e oportunidades de conteúdo</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder='Ex: "IA nos negócios", "marca pessoal", "carreira em tecnologia"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !topic.trim()}
            className="btn-primary shrink-0 min-w-[120px]"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Analisando...</> : <><Search size={14} /> Analisar</>}
          </button>
        </div>

        {/* Sugestões */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400">Tente:</span>
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="text-[11px] px-2 py-1 rounded-md bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-500 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Estado de carregamento */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Radar size={20} className="absolute inset-0 m-auto text-orange-500 animate-pulse-glow" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 mb-1">Escaneando o radar...</p>
            <p className="text-xs text-gray-400">Descobrindo criadores, padrões e oportunidades para "{topic}"</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {!loading && trendResults && (
        <div className="space-y-6 animate-slide-up">
          {/* Barra de resumo */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <Radar size={16} className="text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Resultados para </span>
              <span className="text-sm font-bold text-orange-600">"{trendResults.topic}"</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
              <span>{trendResults.creators?.length} criadores</span>
              <span>{trendResults.opportunities?.length} oportunidades</span>
            </div>
          </div>

          {/* Seção 1: Criadores */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Criadores Relevantes</h3>
              <span className="text-[11px] text-gray-400 ml-1">em diversas plataformas</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendResults.creators?.map((c) => <CreatorCard key={c.id} creator={c} />)}
            </div>
          </div>

          {/* Seção 2: Padrões */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">Padrões de Conteúdo</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Ganchos */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Ganchos Recorrentes</h4>
                <div className="space-y-2">
                  {trendResults.patterns?.recurring_hooks?.map((h, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800">{h.hook}</span>
                        <span className="text-[10px] text-orange-600 font-bold">{h.frequency}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 italic">{h.example}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formatos */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Formatos Dominantes</h4>
                <div className="space-y-3">
                  {trendResults.patterns?.dominant_formats?.map((pf, i) => (
                    <div key={i}>
                      <PlatformBadge platform={pf.platform} />
                      <div className="mt-1.5 space-y-1">
                        {pf.formats?.map((f, j) => (
                          <div key={j} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-600">{f.format}</span>
                            <div className="flex items-center gap-2">
                              <span className={f.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}>{f.trend}</span>
                              <span className="text-gray-400">{f.dominance}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tópicos emergentes */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Tópicos Emergentes</h4>
                <div className="flex flex-wrap gap-1.5">
                  {trendResults.patterns?.emerging_topics?.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Oportunidades */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Oportunidades de Conteúdo</h3>
              <span className="text-[11px] text-gray-400 ml-1">— salve ideias diretamente no Hub</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {trendResults.opportunities?.map((opp) => (
                <div key={opp.id} className="relative">
                  {savedIds.has(opp.id) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-600/90 rounded-xl backdrop-blur-sm">
                      <span className="text-white font-semibold text-sm">✓ Salvo no Hub de Ideias</span>
                    </div>
                  )}
                  <OpportunityCard opp={opp} onSave={handleSaveOpp} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!loading && !trendResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-4">
            <Radar size={28} className="text-orange-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Digite um tópico para começar</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            O Radar de Tendências vai descobrir criadores, padrões de conteúdo e oportunidades personalizadas para o seu nicho.
          </p>
        </div>
      )}
    </div>
  )
}
