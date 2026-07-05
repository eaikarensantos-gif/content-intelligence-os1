import { useRef, useState } from 'react'
import { X, Heart, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import VideoCard from './VideoCard'

// Lightweight Tinder-style swipe stack built on pointer events (no extra deps).
// The top card follows the pointer; releasing past a threshold (or using the
// buttons) commits a swipe. right = save, left = skip.
const SWIPE_THRESHOLD = 110

export default function VideoSwipeStack({ deck, onSwipe, onEmpty }) {
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [leaving, setLeaving] = useState(null) // { dir } while a card animates out
  const [playing, setPlaying] = useState(false)
  const start = useRef(null)

  const top = deck[0]
  const next = deck[1]

  if (!top) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">Acabaram os vídeos deste lote.</p>
        {onEmpty && (
          <button
            type="button"
            onClick={onEmpty}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <RotateCcw size={16} /> Buscar mais
          </button>
        )}
      </div>
    )
  }

  const commit = (dir) => {
    if (leaving) return
    setPlaying(false)
    setLeaving({ dir })
    // Let the exit animation play before removing the card from the deck.
    setTimeout(() => {
      onSwipe(top, dir)
      setDrag({ x: 0, y: 0 })
      setLeaving(null)
    }, 220)
  }

  const onPointerDown = (e) => {
    if (playing) return // don't hijack drags meant for the player
    start.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!start.current) return
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }
  const onPointerUp = () => {
    if (!start.current) return
    start.current = null
    if (drag.x > SWIPE_THRESHOLD) commit('right')
    else if (drag.x < -SWIPE_THRESHOLD) commit('left')
    else setDrag({ x: 0, y: 0 })
  }

  const offset = leaving
    ? { x: leaving.dir === 'right' ? 600 : -600, y: drag.y }
    : drag
  const rotation = offset.x / 18
  const likeOpacity = Math.min(1, Math.max(0, drag.x / SWIPE_THRESHOLD))
  const nopeOpacity = Math.min(1, Math.max(0, -drag.x / SWIPE_THRESHOLD))

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-[560px] w-[400px] max-w-full select-none">
        {/* Next card peeking behind */}
        {next && (
          <div className="absolute inset-0 scale-[0.96] opacity-60">
            <VideoCard video={next} playing={false} onPlay={() => {}} />
          </div>
        )}

        {/* Top, draggable card */}
        <div
          className={clsx(
            'absolute inset-0 touch-none',
            (leaving || !start.current) && 'transition-transform duration-200 ease-out',
            !playing && 'cursor-grab active:cursor-grabbing'
          )}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Swipe intent badges */}
          <span
            className="pointer-events-none absolute left-4 top-4 z-10 rotate-[-12deg] rounded-lg border-4 border-emerald-500 px-3 py-1 text-xl font-extrabold uppercase text-emerald-500"
            style={{ opacity: likeOpacity }}
          >
            Salvar
          </span>
          <span
            className="pointer-events-none absolute right-4 top-4 z-10 rotate-[12deg] rounded-lg border-4 border-rose-500 px-3 py-1 text-xl font-extrabold uppercase text-rose-500"
            style={{ opacity: nopeOpacity }}
          >
            Pular
          </span>

          <VideoCard video={top} playing={playing} onPlay={() => setPlaying(true)} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => commit('left')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-500 shadow-md ring-1 ring-gray-200 transition hover:scale-105 hover:bg-rose-50"
          aria-label="Pular"
        >
          <X size={26} />
        </button>
        <button
          type="button"
          onClick={() => commit('right')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition hover:scale-105 hover:bg-emerald-600"
          aria-label="Salvar na fila de reação"
        >
          <Heart size={26} />
        </button>
      </div>
    </div>
  )
}
