import { ExternalLink, Play, Eye, ThumbsUp } from 'lucide-react'

const PLATFORM_BADGE = {
  youtube:     { label: 'YouTube',     bg: 'bg-red-500'   },
  dailymotion: { label: 'Dailymotion', bg: 'bg-blue-600'  },
  vimeo:       { label: 'Vimeo',       bg: 'bg-teal-500'  },
  tiktok:      { label: 'TikTok',      bg: 'bg-zinc-900'  },
}

function formatCount(n) {
  const num = parseInt(n, 10)
  if (!num || Number.isNaN(num)) return null
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

export default function VideoCard({ video, playing, onPlay }) {
  const views    = formatCount(video.viewCount)
  const likes    = formatCount(video.likeCount)
  const badge    = PLATFORM_BADGE[video.platform] || PLATFORM_BADGE.youtube
  const canEmbed = !!video.embedUrl

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
      <div className="relative aspect-video w-full bg-gray-900">
        {playing && canEmbed ? (
          <iframe
            className="h-full w-full"
            src={`${video.embedUrl}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : playing && !canEmbed ? (
          <div className="flex h-full flex-col items-center justify-center bg-gray-900 gap-3 p-4">
            <p className="text-white text-sm text-center">Embed não disponível para {badge.label}</p>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
            >
              <ExternalLink size={15} /> Abrir no {badge.label}
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="group relative h-full w-full"
            aria-label="Reproduzir vídeo"
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full bg-gray-800 flex items-center justify-center">
                <Play className="text-gray-500" size={32} />
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110">
                <Play className="ml-1 text-orange-500" size={26} fill="currentColor" />
              </span>
            </span>
          </button>
        )}

        {/* Platform badge */}
        <span className={`absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg} text-white select-none`}>
          {badge.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="inline-flex w-fit rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
          {video.category}
        </span>
        <h3 className="line-clamp-2 font-semibold text-gray-900">{video.title}</h3>
        <p className="text-sm text-gray-500">{video.channelName}</p>

        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-gray-400">
          {views && (
            <span className="flex items-center gap-1"><Eye size={13} /> {views}</span>
          )}
          {likes && (
            <span className="flex items-center gap-1"><ThumbsUp size={13} /> {likes}</span>
          )}
          {video.engagementRate && (
            <span className="flex items-center gap-1">{video.engagementRate} eng.</span>
          )}
        </div>
      </div>
    </div>
  )
}
