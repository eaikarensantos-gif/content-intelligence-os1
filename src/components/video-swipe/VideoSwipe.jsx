import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Sparkles, AlertCircle, Settings } from 'lucide-react'
import CategorySelector from './CategorySelector'
import VideoSwipeStack from './VideoSwipeStack'
import ReactionQueue from './ReactionQueue'
import { useVideoSearch } from '../../hooks/useVideoSearch'
import useVideoSwipeStore from '../../store/useVideoSwipeStore'
import { enabledPlatformLabels } from '../../lib/videoPlatforms'

// Main page for the video swipe feature: pick categories, fetch a deck, and
// swipe right (save) / left (skip). Saved videos land in the reaction queue.
export default function VideoSwipe() {
  const selectedCategories = useVideoSwipeStore((s) => s.selectedCategories)
  const toggleCategory = useVideoSwipeStore((s) => s.toggleCategory)
  const saveToQueue = useVideoSwipeStore((s) => s.saveToQueue)
  const markSeen = useVideoSwipeStore((s) => s.markSeen)

  const { search, loading, error } = useVideoSearch()
  const [deck, setDeck] = useState([])
  const [started, setStarted] = useState(false)

  // Dailymotion needs no key, so search always works; YouTube/Vimeo/TikTok join
  // when their credentials are configured.
  const sources = enabledPlatformLabels()
  const hasYoutube = sources.includes('YouTube')

  const loadDeck = async () => {
    const results = await search(selectedCategories)
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
          Escolha categorias, deslize pelos vídeos e salve os melhores para reagir.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <AlertCircle size={18} className="flex-shrink-0 text-gray-400" />
        <span className="flex-1">
          Buscando em: <strong>{sources.join(', ')}</strong>.
          {!hasYoutube && ' Adicione a YouTube API key para mais resultados.'}
        </span>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 font-medium text-white hover:bg-gray-800"
        >
          <Settings size={15} /> Configurações
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left: selector + swipe stack */}
        <div className="flex flex-col gap-6">
          <CategorySelector selected={selectedCategories} onToggle={toggleCategory} />

          <button
            type="button"
            onClick={loadDeck}
            disabled={loading || selectedCategories.length === 0}
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
              <div className="flex h-[560px] items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={28} />
              </div>
            ) : started ? (
              <VideoSwipeStack deck={deck} onSwipe={handleSwipe} onEmpty={loadDeck} />
            ) : (
              <div className="flex h-[560px] items-center justify-center text-center text-gray-400">
                <p>Selecione ao menos uma categoria e busque vídeos para começar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: reaction queue */}
        <aside className="lg:border-l lg:border-gray-100 lg:pl-8">
          <ReactionQueue />
        </aside>
      </div>
    </div>
  )
}
