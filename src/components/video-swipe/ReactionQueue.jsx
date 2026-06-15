import { ExternalLink, Trash2, Inbox } from 'lucide-react'
import useVideoSwipeStore from '../../store/useVideoSwipeStore'

// The list of videos the user swiped right on, queued up to react to.
export default function ReactionQueue() {
  const queue = useVideoSwipeStore((s) => s.queue)
  const removeFromQueue = useVideoSwipeStore((s) => s.removeFromQueue)
  const clearQueue = useVideoSwipeStore((s) => s.clearQueue)

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
        <Inbox size={28} />
        <p className="text-sm">Nenhum vídeo salvo ainda. Deslize para a direita para adicionar.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Fila de reação · {queue.length}
        </h3>
        <button
          type="button"
          onClick={clearQueue}
          className="text-xs text-gray-400 hover:text-rose-500"
        >
          Limpar tudo
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {queue.map((video) => (
          <li
            key={video.id}
            className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-gray-100"
          >
            <img
              src={video.thumbnailUrl}
              alt=""
              className="h-12 w-20 flex-shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium text-gray-800">{video.title}</p>
              <p className="truncate text-xs text-gray-400">{video.channelName}</p>
            </div>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-orange-500"
              aria-label="Abrir vídeo"
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              onClick={() => removeFromQueue(video.id)}
              className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-rose-500"
              aria-label="Remover da fila"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
