import { useState } from 'react'
import {
  Search, Radar, Users, TrendingUp, Lightbulb, Plus, ExternalLink,
  ChevronDown, ChevronUp, Loader2, Zap, Settings, Youtube, AlertCircle,
  Eye, ThumbsUp, MessageCircle, Link2,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import useStore from '../../store/useStore'
import useAIStore from '../../store/useAIStore'
import { youtubeSearch, aiTrendSearch } from '../../lib/aiService'
import { PlatformBadge, FormatBadge } from '../common/Badge'

const PLATFORM_ICONS = {
  linkedin: '💼', instagram: '📸', tiktok: '🎵', youtube: '🎬', twitter: '𝕏',
}

// ─── Real YouTube video card ──────────────────────────────────────────────────

function VideoCard({ video }) {
  const fmt = (n) => {
    if (!n) return '—'
    const num = parseInt(n)
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return String(num)
  }

  const relativeDate = (iso) => {
    if (!iso) return ''
    const diff = (Date.now() - new Date(iso)) / 1000
    if (diff < 3600) return `${Math.round(diff / 60)}min atrás`
    if (diff < 86400) return `${Math.round(diff / 3600)}h atrás`
    if (diff < 2592000) return `${Math.round(diff / 86400)}d atrás`
    if (diff < 31536000) return `${Math.round(diff / 2592000)}m atrás`
    return `${Math.round(diff / 31536000)}a atrás`
  }

  return (
    <div className="card p-4 space-y-3 hover:border-orange-300 transition-colors">
      {/* Thumbnail */}
      {video.thumbnail && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
          <img
            src={video.thumbnail}
            alt={video.videoTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            YouTube
          </div>
        </div>
      )}

      {/* Title */}
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-semibold text-gray-900 leading-snug hover:text-orange-600 transition-colors line-clamp-2"
        title={video.videoTitle}
      >
        {video.videoTitle}
      </a>

      {/* Channel */}
      <div className="flex items-center justify-between">
        <a
          href={video.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1 truncate"
        >
          <Youtube size={11} className="text-red-500 shrink-0" />
          <span className="truncate">{video.name}</span>
        </a>
        {video.publishedAt && (
          <span className="text-[10px] text-gray-400 shrink-0 ml-2">{relativeDate(video.publishedAt)}</span>
        )}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-3 flex-wrap">
        {video.viewCount && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Eye size={11} className="text-blue-400" />
            <span>{fmt(video.viewCount)} views</span>
          </div>
        )}
        {video.likeCount && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <ThumbsUp size={11} className="text-emerald-400" />
            <span>{fmt(video.likeCount)} likes</span>
          </div>
        )}
        {video.commentCount && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <MessageCircle size={11} className="text-orange-400" />
            <span>{fmt(video.commentCount)}</span>
          </div>
        )}
        {video.engagementRate && (
          <span className="text-[11px] text-emerald-600 font-medium ml-auto">
            {video.engagementRate} eng.
          </span>
        )}
      </div>

      {/* Direct link */}
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] text-orange-600 hover:text-orange-700 font-medium"
      >
        <Link2 size={11} /> Abrir original para validar
      </a>
    </div>
  )
}

// ─── Opportunity card ─────────────────────────────────────────────────────────

function OpportunityCard({ opp, onSave }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card p-4 space-y-3 hover:border-orange-300 transition-all">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{opp.title}</h4>
        <span className={`chip border shrink-0 ${opp.potential === 'Very High' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : opp.potential === 'High' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {opp.potential}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PlatformBadge platform={opp.platform} />
        <FormatBadge format={opp.format} />
        {opp.hook && <span className="chip bg-amber-100 text-amber-700 border border-amber-200">{opp.hook}</span>}
      </div>

      {expanded && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-gray-500 leading-relaxed">{opp.description}</p>
          {opp.content_gap && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] text-gray-500 font-medium mb-0.5">Gap de conteúdo:</p>
              <p className="text-xs text-gray-600">{opp.content_gap}</p>
            </div>
          )}
          {opp.hook_example && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-[11px] text-orange-600 font-medium mb-0.5">Exemplo de hook:</p>
              <p className="text-xs text-gray-700 italic">"{opp.hook_example}"</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <button onClick={() => setExpanded((x) => !x)} className="btn-ghost text-xs py-1 px-2">
          {expanded ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Detalhes</>}
        </button>
        <button onClick={() => onSave(opp)} className="btn-primary text-xs py-1.5 px-3">
          <Plus size={12} /> Salvar ideia
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrendRadar() {
  const setTrendResults = useStore((s) => s.setTrendResults)
  const trendResults    = useStore((s) => s.trendResults)
  const addIdea         = useStore((s) => s.addIdea)

  const aiSettings         = useAIStore((s) => s.getSettings())
  const isAIConfigured     = useAIStore((s) => s.isConfigured())
  const youtubeApiKey      = useAIStore((s) => s.youtubeApiKey)
  const isYoutubeConfigured = useAIStore((s) => s.isYoutubeConfigured())

  const [topic, setTopic]     = useState('')
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [errors, setErrors]   = useState({ youtube: '', ai: '' })

  const SUGGESTED = [
    'marketing de conteúdo', 'IA para criadores', 'empreendedorismo digital',
    'personal branding', 'criador de conteúdo', 'solopreneur',
  ]

  const nothingConfigured = !isYoutubeConfigured && !isAIConfigured

  const handleSearch = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setErrors({ youtube: '', ai: '' })

    let youtubeResults = []
    let aiData = null
    const newErrors = { youtube: '', ai: '' }

    // ── 1. Real YouTube search ──────────────────────────────────────────────
    if (isYoutubeConfigured) {
      try {
        youtubeResults = await youtubeSearch(youtubeApiKey, topic.trim())
      } catch (err) {
        newErrors.youtube = `Não foi possível acessar dados reais do YouTube: ${err.message}`
      }
    }

    // ── 2. AI opportunity analysis ──────────────────────────────────────────
    if (isAIConfigured) {
      try {
        aiData = await aiTrendSearch(aiSettings, topic.trim())
      } catch (err) {
        newErrors.ai = `Análise de IA indisponível: ${err.message}`
      }
    }

    setErrors(newErrors)

    // Only store results if we got actual data from at least one real source
    const hasRealData = youtubeResults.length > 0 || aiData !== null

    if (hasRealData) {
      setTrendResults({
        topic: topic.trim(),
        searched_at: new Date().toISOString(),
        videos: youtubeResults,
        opportunities: aiData?.opportunities || [],
        patterns: {
          recurring_hooks: aiData?.recurring_hooks || [],
          emerging_topics: aiData?.emerging_topics || [],
        },
        youtube_powered: youtubeResults.length > 0,
        ai_powered: aiData !== null,
      })
      setSavedIds(new Set())
    }

    setLoading(false)
  }

  const handleSaveOpp = (opp) => {
    addIdea({
      title: opp.title,
      description: opp.description,
      topic: trendResults?.topic || opp.hook,
      format: opp.format,
      hook_type: opp.hook?.toLowerCase().replace(' hook', '') || 'list',
      platform: opp.platform,
      priority: opp.potential === 'Very High' ? 'high' : opp.potential === 'High' ? 'medium' : 'low',
      status: 'idea',
      tags: ['trend', trendResults?.topic].filter(Boolean),
    })
    setSavedIds((s) => new Set([...s, opp.id]))
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Search */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100">
              <Radar size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Explorar Referências Reais</h2>
              <p className="text-xs text-gray-400">Busca vídeos reais do YouTube + análise de oportunidades via IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isYoutubeConfigured && (
              <span className="chip bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <Youtube size={10} /> YouTube ativo
              </span>
            )}
            {isAIConfigured && (
              <span className="chip bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
                <Zap size={10} /> IA ativa
              </span>
            )}
            {nothingConfigured && (
              <NavLink to="/settings" className="chip bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 hover:bg-amber-200 transition-colors">
                <Settings size={10} /> Configurar APIs
              </NavLink>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder='Ex: "marketing de conteúdo", "criador de conteúdo", "empreendedorismo"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !nothingConfigured && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !topic.trim() || nothingConfigured}
            className="btn-primary shrink-0 min-w-[120px]"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Buscando...</> : <><Search size={14} /> Analisar</>}
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-400">Sugestões:</span>
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

      {/* "Nothing configured" banner */}
      {nothingConfigured && (
        <div className="card p-6 flex flex-col items-center gap-4 text-center border-amber-200 bg-amber-50">
          <AlertCircle size={28} className="text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">APIs não configuradas</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Configure pelo menos uma API para ver dados reais:
              <br />
              <strong>YouTube API Key</strong> para buscar vídeos reais de criadores,
              <br />
              <strong>AI API Key</strong> para analisar oportunidades de conteúdo.
            </p>
          </div>
          <NavLink to="/settings" className="btn-primary text-xs">
            <Settings size={12} /> Ir para Configurações
          </NavLink>
        </div>
      )}

      {/* Error banners */}
      {(errors.youtube || errors.ai) && !loading && (
        <div className="space-y-2">
          {errors.youtube && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{errors.youtube}</p>
            </div>
          )}
          {errors.ai && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">{errors.ai}</p>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Radar size={20} className="absolute inset-0 m-auto text-orange-500 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 mb-1">
              {isYoutubeConfigured && isAIConfigured
                ? 'Buscando vídeos reais e analisando com IA...'
                : isYoutubeConfigured
                ? 'Buscando vídeos reais no YouTube...'
                : 'IA analisando oportunidades de conteúdo...'}
            </p>
            <p className="text-xs text-gray-400">Aguardando dados reais para "{topic}"</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && trendResults && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary bar */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <Radar size={16} className="text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Resultados para </span>
              <span className="text-sm font-bold text-orange-600">"{trendResults.topic}"</span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {trendResults.youtube_powered && (
                  <span className="chip bg-red-100 text-red-700 border border-red-200 text-[10px]">
                    <Youtube size={9} /> Dados reais do YouTube
                  </span>
                )}
                {trendResults.ai_powered && (
                  <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px]">
                    <Zap size={9} /> Análise IA
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
              {trendResults.videos?.length > 0 && (
                <span>{trendResults.videos.length} vídeos reais</span>
              )}
              {trendResults.opportunities?.length > 0 && (
                <span>{trendResults.opportunities.length} oportunidades</span>
              )}
            </div>
          </div>

          {/* Section 1: Real YouTube videos */}
          {trendResults.videos?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Youtube size={15} className="text-red-500" />
                <h3 className="text-sm font-semibold text-gray-900">Vídeos Reais Encontrados</h3>
                <span className="text-[11px] text-gray-400 ml-1">— clique para validar na fonte</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trendResults.videos.map((v) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}

          {/* No YouTube results state */}
          {trendResults.youtube_powered === false && isYoutubeConfigured && (
            <div className="card p-4 border-dashed text-center">
              <p className="text-xs text-gray-400">Nenhum vídeo encontrado no YouTube para este tópico.</p>
            </div>
          )}

          {/* Section 2: AI Patterns */}
          {(trendResults.patterns?.recurring_hooks?.length > 0 || trendResults.patterns?.emerging_topics?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-900">Padrões de Conteúdo</h3>
                <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px]">
                  <Zap size={9} /> Gerado pela IA
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {trendResults.patterns?.recurring_hooks?.length > 0 && (
                  <div className="card p-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Hooks Recorrentes</h4>
                    <div className="space-y-2">
                      {trendResults.patterns.recurring_hooks.map((h, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-800">{h.hook}</span>
                            {h.frequency && <span className="text-[10px] text-orange-600 font-bold">{h.frequency}</span>}
                          </div>
                          {h.example && <p className="text-[11px] text-gray-400 italic">{h.example}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trendResults.patterns?.emerging_topics?.length > 0 && (
                  <div className="card p-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Tópicos Emergentes</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {trendResults.patterns.emerging_topics.map((t, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-gray-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: AI Opportunities */}
          {trendResults.opportunities?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={15} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Oportunidades de Conteúdo</h3>
                <span className="text-[11px] text-gray-400 ml-1">— salve direto no Hub de Ideias</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {trendResults.opportunities.map((opp) => (
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
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !trendResults && !nothingConfigured && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-4">
            <Radar size={28} className="text-orange-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Digite um tópico para começar</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            {isYoutubeConfigured
              ? 'Buscará vídeos reais do YouTube com métricas e links diretos para validação.'
              : 'A IA irá analisar oportunidades de conteúdo para o seu nicho.'}
          </p>
        </div>
      )}
    </div>
  )
}
