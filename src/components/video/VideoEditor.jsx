// src/components/video/VideoEditor.jsx
// Corta vídeos localmente com FFmpeg.wasm — sem Cloudinary, sem Shotstack, sem configuração

import { useState, useRef, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import {
  Scissors, Plus, Trash2, Download, Loader2,
  Play, Pause, AlertCircle, Film, Upload,
} from 'lucide-react'
import clsx from 'clsx'

const CDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTime(str) {
  if (!str) return NaN
  if (str.includes(':')) {
    const [m, s] = str.split(':').map(Number)
    return m * 60 + s
  }
  return parseFloat(str)
}

function buildFFmpegArgs(segments) {
  if (segments.length === 1) {
    // Nenhum corte — só reencoda
    return ['-i', 'input.mp4', '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', 'output.mp4']
  }

  const filterParts = segments.map((seg, i) => {
    const trimEnd = seg.end != null ? `:end=${seg.end}` : ''
    return [
      `[0:v]trim=start=${seg.start}${trimEnd},setpts=PTS-STARTPTS[v${i}]`,
      `[0:a]atrim=start=${seg.start}${trimEnd},asetpts=PTS-STARTPTS[a${i}]`,
    ].join(';')
  })

  const concatInputs = segments.map((_, i) => `[v${i}][a${i}]`).join('')
  const filterComplex = [
    ...filterParts,
    `${concatInputs}concat=n=${segments.length}:v=1:a=1[outv][outa]`,
  ].join(';')

  return [
    '-i', 'input.mp4',
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    'output.mp4',
  ]
}

export default function VideoEditor() {
  const [file, setFile] = useState(null)
  const [localUrl, setLocalUrl] = useState('')
  const [duration, setDuration] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)

  const [cuts, setCuts] = useState([])
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [addError, setAddError] = useState('')

  const [phase, setPhase] = useState('idle') // idle | loading-ffmpeg | processing | done | error
  const [progress, setProgress] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const ffmpegRef = useRef(null)

  // Cleanup blob URLs
  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl)
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setCurrentTime(v.currentTime)
    const onLoaded = () => setDuration(v.duration)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onLoaded)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onLoaded)
    }
  }, [localUrl])

  const handleFileSelect = (f) => {
    if (!f) return
    if (localUrl) URL.revokeObjectURL(localUrl)
    setFile(f)
    setLocalUrl(URL.createObjectURL(f))
    setDuration(null)
    setCuts([])
    setDownloadUrl(null)
    setPhase('idle')
    setProgress('')
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  const seekTo = (sec) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = sec
    setCurrentTime(sec)
  }

  const addCut = () => {
    setAddError('')
    const start = parseTime(newStart)
    const end = parseTime(newEnd)
    if (isNaN(start) || isNaN(end)) { setAddError('Informe início e fim válidos'); return }
    if (start >= end) { setAddError('Início deve ser menor que o fim'); return }
    if (duration && end > duration) { setAddError(`Fim não pode ultrapassar ${formatTime(duration)}`); return }
    if (cuts.some(c => !(end <= c.start || start >= c.end))) {
      setAddError('Este trecho se sobrepõe a um corte existente'); return
    }
    setCuts(prev => [...prev, { start, end }].sort((a, b) => a.start - b.start))
    setNewStart('')
    setNewEnd('')
  }

  const removeCut = (i) => setCuts(prev => prev.filter((_, idx) => idx !== i))

  const segments = (() => {
    const segs = []
    let cursor = 0
    for (const cut of cuts) {
      if (cursor < cut.start) segs.push({ start: cursor, end: cut.start, keep: true })
      segs.push({ start: cut.start, end: cut.end, keep: false })
      cursor = cut.end
    }
    segs.push({ start: cursor, end: duration || cursor + 1, keep: true })
    return segs
  })()

  const keepSegments = segments.filter(s => s.keep)
  const keptDuration = keepSegments.reduce((acc, s) => acc + (s.end - s.start), 0)

  const handleProcess = async () => {
    if (!file || cuts.length === 0) return

    try {
      // Carrega o FFmpeg na primeira vez
      if (!ffmpegRef.current) {
        setPhase('loading-ffmpeg')
        setProgress('Carregando FFmpeg (primeira vez pode demorar ~10s)...')
        const ffmpeg = new FFmpeg()
        ffmpeg.on('log', ({ message }) => setProgress(message))
        ffmpeg.on('progress', ({ progress: p }) => setProgress(`Processando... ${Math.round(p * 100)}%`))
        await ffmpeg.load({ coreURL: `${CDN}/ffmpeg-core.js`, wasmURL: `${CDN}/ffmpeg-core.wasm` })
        ffmpegRef.current = ffmpeg
      }

      const ffmpeg = ffmpegRef.current
      setPhase('processing')
      setProgress('Lendo arquivo...')

      await ffmpeg.writeFile('input.mp4', await fetchFile(file))

      const args = buildFFmpegArgs(keepSegments)
      setProgress('Processando cortes...')
      await ffmpeg.exec(args)

      setProgress('Finalizando...')
      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data.buffer], { type: 'video/mp4' })

      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(URL.createObjectURL(blob))
      setPhase('done')
      setProgress('')

      // Limpa arquivos temporários
      await ffmpeg.deleteFile('input.mp4').catch(() => {})
      await ffmpeg.deleteFile('output.mp4').catch(() => {})

    } catch (e) {
      setPhase('error')
      setProgress(e.message)
    }
  }

  const busy = phase === 'loading-ffmpeg' || phase === 'processing'

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200">
          <Scissors size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editor de Cortes</h1>
          <p className="text-xs text-gray-500">Processa no seu navegador — sem upload, sem serviço externo</p>
        </div>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className={clsx(
            'w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-2 transition-colors',
            busy
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer text-orange-500'
          )}
        >
          <Upload size={24} />
          <span className="text-sm font-medium">
            {file ? file.name : 'Clique para selecionar o vídeo'}
          </span>
          <span className="text-xs text-gray-400">MP4, MOV, AVI, WebM</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />
      </div>

      {/* Player */}
      {localUrl && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <video
            ref={videoRef}
            src={localUrl}
            className="w-full max-h-72 bg-black"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center justify-center transition-colors"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div
                className="flex-1 relative h-2 bg-gray-100 rounded-full cursor-pointer"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  seekTo(((e.clientX - rect.left) / rect.width) * (duration || 0))
                }}
              >
                {duration && segments.map((seg, i) => (
                  <div
                    key={i}
                    className={clsx('absolute top-0 h-full', i === 0 ? 'rounded-l-full' : '', seg.keep ? 'bg-emerald-400' : 'bg-red-400 opacity-80')}
                    style={{ left: `${(seg.start / duration) * 100}%`, width: `${((seg.end - seg.start) / duration) * 100}%` }}
                  />
                ))}
                {duration && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow"
                    style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: -6 }}
                  />
                )}
              </div>
              <span className="text-xs text-gray-500 tabular-nums w-20 text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{currentTime.toFixed(1)}s</span>
              <button onClick={() => setNewStart(currentTime.toFixed(1))} className="text-orange-600 hover:underline">
                início do corte
              </button>
              <span>·</span>
              <button onClick={() => setNewEnd(currentTime.toFixed(1))} className="text-orange-600 hover:underline">
                fim do corte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add cut */}
      {localUrl && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Marcar corte</p>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-500">Início (s ou m:ss)</label>
              <input
                type="text"
                value={newStart}
                onChange={e => setNewStart(e.target.value)}
                placeholder="ex: 5.2 ou 0:05"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="pb-2 text-gray-400">→</div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-500">Fim (s ou m:ss)</label>
              <input
                type="text"
                value={newEnd}
                onChange={e => setNewEnd(e.target.value)}
                placeholder="ex: 8.1 ou 0:08"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <button
              onClick={addCut}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl transition-colors"
            >
              <Plus size={14} /> Cortar
            </button>
          </div>
          {addError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle size={12} /> {addError}
            </p>
          )}
        </div>
      )}

      {/* Cuts list */}
      {cuts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Cortes</p>
            <p className="text-xs text-gray-400">
              {formatTime((duration || 0) - keptDuration)} removido ·{' '}
              <span className="text-emerald-600">{formatTime(keptDuration)} fica</span>
            </p>
          </div>
          <div className="space-y-2">
            {cuts.map((cut, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span className="text-sm text-red-700 font-mono flex-1">
                  {formatTime(cut.start)} → {formatTime(cut.end)}
                  <span className="text-xs text-red-400 ml-2">({(cut.end - cut.start).toFixed(1)}s)</span>
                </span>
                <button onClick={() => removeCut(i)} disabled={busy} className="text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-1 space-y-1">
            <p className="text-xs text-gray-400 mb-1.5">O que fica:</p>
            {keepSegments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-emerald-700">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono">{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                <span className="text-emerald-500">({(seg.end - seg.start).toFixed(1)}s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process button */}
      {localUrl && (
        <div className="space-y-3">
          <button
            onClick={handleProcess}
            disabled={busy || cuts.length === 0}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all',
              busy
                ? 'bg-orange-100 text-orange-400 cursor-not-allowed'
                : cuts.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200'
            )}
          >
            {busy
              ? <><Loader2 size={16} className="animate-spin" /> Processando...</>
              : <><Film size={16} /> Gerar vídeo sem os cortes</>}
          </button>

          {cuts.length === 0 && !busy && (
            <p className="text-xs text-center text-gray-400">Adicione pelo menos um corte para processar</p>
          )}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <Loader2 size={12} className="animate-spin" /> {progress}
            </div>
          )}

          {phase === 'done' && downloadUrl && (
            <a
              href={downloadUrl}
              download={`${file?.name?.replace(/\.[^/.]+$/, '') || 'video'}-editado.mp4`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-md shadow-emerald-100"
            >
              <Download size={16} /> Baixar vídeo editado
            </a>
          )}

          {phase === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={12} /> {progress}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
