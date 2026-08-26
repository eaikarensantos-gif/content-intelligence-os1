import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Eye, MessageCircle, LogOut, ChevronRight, ChevronLeft, Clock, Instagram, MousePointerClick } from 'lucide-react'
import { Link } from 'react-router-dom'
import { instagramFetchStories } from '../../lib/aiService'

function StatChip({ icon: Icon, value, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500" title={label}>
      <Icon size={11} /> {value.toLocaleString('pt-BR')}
    </span>
  )
}

function timeLeft(timestamp) {
  if (!timestamp) return null
  const expiresAt = new Date(timestamp).getTime() + 24 * 60 * 60 * 1000
  const msLeft = expiresAt - Date.now()
  if (msLeft <= 0) return null
  const hours = Math.floor(msLeft / (60 * 60 * 1000))
  const minutes = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000))
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

export default function StoriesGrid({ accessToken }) {
  const [stories, setStories] = useState(null)
  const [insightsAvailable, setInsightsAvailable] = useState(true)
  const [linkClicksAvailable, setLinkClicksAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStories = () => {
    setLoading(true)
    setError(null)
    instagramFetchStories(accessToken)
      .then(({ stories: fetched, insightsAvailable: ia, linkClicksAvailable: lca }) => {
        setStories(fetched)
        setInsightsAvailable(ia)
        setLinkClicksAvailable(lca !== false)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStories() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          Stories somem 24h depois de publicados — isso reflete só o que está no ar agora.
        </p>
        <button onClick={fetchStories} disabled={loading} className="btn-secondary text-xs shrink-0">
          {loading ? <><Loader2 size={13} className="animate-spin" /> Atualizando...</> : <><RefreshCw size={13} /> Atualizar</>}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {!insightsAvailable && stories && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2.5 border border-amber-200 mb-4">
          ⚠️ Conexão sem permissão de Insights — alcance, respostas e navegação não disponíveis. <Link to="/settings" className="underline">Reconecte o Instagram</Link> pra liberar esses números.
        </p>
      )}

      {insightsAvailable && !linkClicksAvailable && stories?.length > 0 && (
        <p className="text-[11px] text-blue-600 bg-blue-50 rounded-lg p-2.5 border border-blue-200 mb-4">
          A Meta não liberou a métrica de cliques no link para esta conexão. Os demais números dos Stories continuam disponíveis. O app mostrará “Cliques no link” automaticamente quando a API devolver essa métrica.
        </p>
      )}

      {loading && !stories && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={26} className="animate-spin text-pink-400" />
        </div>
      )}

      {stories && stories.length === 0 && (
        <div className="text-center py-12">
          <Instagram size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum Story ativo agora.</p>
        </div>
      )}

      {stories && stories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stories.map((story) => {
            const left = timeLeft(story.timestamp)
            return (
              <a
                key={story.id}
                href={story.permalink || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-0 overflow-hidden hover:shadow-lg transition-shadow group block"
              >
                <div className="aspect-[9/16] bg-gray-100 relative overflow-hidden">
                  {story.thumbnailUrl ? (
                    <img src={story.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Instagram size={24} />
                    </div>
                  )}
                  {left && (
                    <span className="absolute top-2 left-2 chip border text-[10px] bg-black/60 text-white border-transparent flex items-center gap-1">
                      <Clock size={10} /> {left}
                    </span>
                  )}
                </div>
                <div className="p-2.5 flex flex-wrap gap-x-2 gap-y-1">
                  <StatChip icon={Eye} value={story.reach} label="Alcance" />
                  <StatChip icon={MessageCircle} value={story.replies} label="Respostas" />
                  {story.linkClicks !== null && story.linkClicks !== undefined && (
                    <StatChip icon={MousePointerClick} value={story.linkClicks} label="Cliques no link" />
                  )}
                  <StatChip icon={LogOut} value={story.exits} label="Saídas" />
                  <StatChip icon={ChevronRight} value={story.tapsForward} label="Avançou" />
                  <StatChip icon={ChevronLeft} value={story.tapsBack} label="Voltou" />
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
