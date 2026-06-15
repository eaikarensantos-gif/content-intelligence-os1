import { Play, Eye, ThumbsUp } from 'lucide-react'

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  dailymotion: 'Dailymotion',
  vimeo: 'Vimeo',
  tiktok: 'TikTok',
}

// Build the player URL. For YouTube we turn captions on and prefer Portuguese,
// so international videos show auto-translated subtitles when available.
function playerSrc(video) {
  let src = `${video.embedUrl}?autoplay=1&rel=0`
  if (video.platform === 'youtube') {
    src += '&cc_load_policy=1&cc_lang_pref=pt&hl=pt'
  }
  return src
}

// Compact, human-readable count (e.g. 1.2M, 34K).
function formatCount(n) {
  const num = parseInt(n, 10)
  if (!num || Number.isNaN(num)) return null
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

// A single video card. `playing` swaps the thumbnail for the embedded player.
export default function VideoCard({ video, playing, onPlay }) {
  const views = formatCount(video.viewCount)
  const likes = formatCount(video.likeCount)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
      <div className="relative aspect-video w-full bg-gray-900">
        {playing ? (
          <iframe
            className="h-full w-full"
            src={playerSrc(video)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="group relative h-full w-full"
            aria-label="Reproduzir vídeo"
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110">
                <Play className="ml-1 text-orange-500" size={30} fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
            {video.category}
          </span>
          {PLATFORM_LABELS[video.platform] && (
            <span className="inline-flex w-fit rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {PLATFORM_LABELS[video.platform]}
            </span>
          )}
        </div>
        <h3 className="line-clamp-3 text-lg font-semibold leading-snug text-gray-900">{video.title}</h3>
        <p className="text-sm text-gray-500">{video.channelName}</p>

        <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-gray-400">
          {views && (
            <span className="flex items-center gap-1">
              <Eye size={13} /> {views}
            </span>
          )}
          {likes && (
            <span className="flex items-center gap-1">
              <ThumbsUp size={13} /> {likes}
            </span>
          )}
          {video.engagementRate && (
            <span className="flex items-center gap-1">{video.engagementRate} eng.</span>
          )}
        </div>
      </div>
    </div>
  )
}
