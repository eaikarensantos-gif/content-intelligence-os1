import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Sparkles, AlertCircle, Check } from 'lucide-react'
import clsx from 'clsx'
import CategorySelector from './CategorySelector'
import VideoSwipeStack from './VideoSwipeStack'
import ReactionQueue from './ReactionQueue'
import { useVideoSearch } from '../../hooks/useVideoSearch'
import useVideoSwipeStore from '../../store/useVideoSwipeStore'
import useAIStore from '../../store/useAIStore'

const DURATION_OPTIONS = [
  { id: 'any',    label: 'Qualquer' },
  { id: 'short',  label: '<4 min'   },
  { id: 'medium', label: '4–20 min' },
  { id: 'long',   label: '>20 min'  },
]

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevância' },
  { id: 'recent',    label: 'Recente'    },
  { id: 'views',     label: 'Mais visto' },
]

export default function VideoSwipe() {
  const selectedCategories = useVideoSwipeStore((s) => s.selectedCategories)
  const toggleCategory     = useVideoSwipeStore((s) => s.toggleCategory)
  const saveToQueue        = useVideoSwipeStore((s) => s.saveToQueue)
  const markSeen           = useVideoSwipeStore((s) => s.markSeen)
  const selectedPlatforms  = useVideoSwipeStore((s) => s.selectedPlatforms)
  const togglePlatform     = useVideoSwipeStore((s) => s.togglePlatform)
  const filterDuration     = useVideoSwipeStore((s) => s.filterDuration)
  const setFilterDuration  = useVideoSwipeStore((s) => s.setFilterDuration)
  const filterSort         = useVideoSwipeStore((s) => s.filterSort)
  const setFilterSort      = useVideoSwipeStore((s) => s.setFilterSort)

  const youtubeReady   = useAIStore((s) => !!s.youtubeApiKey?.trim())
  const vimeoReady     = useAIStore((s) => !!s.vimeoToken?.trim())
  const tiktokReady    = useAIStore((s) => !!s.rapidApiKey?.trim())
  const instagramReady = useAIStore((s) => s.isInstagramConfigured())

  const PLATFORMS = [
    { id: 'youtube',     label: 'YouTube',     ready: youtubeReady   },
    { id: 'dailymotion', label: 'Dailymotion', ready: true           },
    { id: 'vimeo',       label: 'Vimeo',       ready: vimeoReady     },
    { id: 'tiktok',      label: 'TikTok',      ready: tiktokReady    },
    { id: 'instagram',   label: 'Instagram',   ready: instagramReady },
  ]

  const activePlatforms    = selectedPlatforms.filter((p) => PLATFORMS.find((x) => x.id === p)?.ready)
  const hasActivePlatform  = activePlatforms.length > 0

  const { search, loading, error } = useVideoSearch()
  const [deck, setDeck]     = useState([])
  const [started, setStarted] = useState(false)

  const loadDeck = async () => {
    const results = await search(selectedCategories, {
      platforms: activePlatforms,
      filterDuration,
      filterSort,
    })
    setDeck(results)
    setStarted(true)
  }

  const handleSwipe = (video, dir) => {
    if (dir === 'right') saveToQueue(video)
    else markSeen(video.id)
    setDeck((d) => d.slice(1))
  }

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Sparkles className="text-orange-500" size={24} /> Video Swipe
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Combine perfil + tema para busca interseccional. Ex: Personalidade Negra + Tech → criadores negros falando sobre tecnologia.
        </p>
      </div>

      {!hasActivePlatform && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">Nenhuma plataforma ativa. Dailymotion não exige chave de API.</span>
          <Link to="/settings" className="text-xs font-semibold text-amber-700 underline">Configurações</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">

          {/* Category selector with identity/topic grouping */}
          <CategorySelector selected={selectedCategories} onToggle={toggleCategory} />

          {/* Platform selector */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Plataformas</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ id, label, ready }) => {
                const active = selectedPlatforms.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => ready && togglePlatform(id)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                      active && ready  ? 'border-orange-500 bg-orange-500 text-white' :
                      ready           ? 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600' :
                                        'border-gray-200 bg-gray-50 text-gray-400 cursor-default'
                    )}
                  >
                    {active && ready && <Check size={14} />}
                    {label}
                    {!ready && (
                      <Link
                        to="/settings"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-0.5 text-orange-500 hover:underline text-[10px] font-semibold"
                      >
                        Configurar
                      </Link>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-5">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Duração</p>
              <div className="flex gap-1.5 flex-wrap">
                {DURATION_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilterDuration(id)}
                    className={clsx(
                      'text-xs px-3 py-1 rounded-lg border font-medium transition-all',
                      filterDuration === id
                        ? 'bg-zinc-800 text-white border-zinc-800'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ordenar</p>
              <div className="flex gap-1.5">
                {SORT_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilterSort(id)}
                    className={clsx(
                      'text-xs px-3 py-1 rounded-lg border font-medium transition-all',
                      filterSort === id
                        ? 'bg-zinc-800 text-white border-zinc-800'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={loadDeck}
            disabled={loading || selectedCategories.length === 0 || !hasActivePlatform}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {started ? 'Buscar mais vídeos' : 'Buscar vídeos'}
          </button>

          {error && (
            <p className="flex items-center gap-2 text-sm text-rose-600">
              <AlertCircle size={16} /> {error}
            </p>
          )}

          <div className="mt-2 flex justify-center">
            {loading && deck.length === 0 ? (
              <div className="flex h-[460px] items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={28} />
              </div>
            ) : started ? (
              <VideoSwipeStack deck={deck} onSwipe={handleSwipe} onEmpty={loadDeck} />
            ) : (
              <div className="flex h-[460px] items-center justify-center text-center text-gray-400 px-4">
                <p>Selecione perfil e/ou temas, escolha as plataformas e clique em Buscar.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:border-l lg:border-gray-100 lg:pl-8">
          <ReactionQueue />
        </aside>
      </div>
    </div>
  )
}
