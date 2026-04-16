// src/components/video/VideoEditor.jsx
// Editor de cortes — upload de arquivo ou URL pública
// Upload vai direto do browser para o Cloudinary (unsigned), retorna URL pública para o Shotstack

import { useState, useRef, useEffect } from 'react'
import {
  Scissors, Plus, Trash2, Download, Loader2,
  Play, Pause, AlertCircle, Film, Upload, Link2, Settings2, Eye, EyeOff,
} from 'lucide-react'
import clsx from 'clsx'

const LS_CLOUDINARY_CLOUD = 'cio-cloudinary-cloud'
const LS_CLOUDINARY_PRESET = 'cio-cloudinary-preset'

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

// ─── Cloudinary unsigned upload ───────────────────────────────────────────────
async function uploadToCloudinary(file, cloudName, uploadPreset, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 400) reject(new Error(data.error?.message || `Erro ${xhr.status}`))
        else resolve(data.secure_url)
      } catch {
        reject(new Error('Resposta inválida do Cloudinary'))
      }
    }

    xhr.onerror = () => reject(new Error('Erro de rede ao fazer upload'))
    xhr.send(formData)
  })
}

export default function VideoEditor() {
  // Cloudinary credentials
  const [cloudName, setCloudName] = useState(() => localStorage.getItem(LS_CLOUDINARY_CLOUD) || '')
  const [uploadPreset, setUploadPreset] = useState(() => localStorage.getItem(LS_CLOUDINARY_PRESET) || '')
  const [showSettings, setShowSettings] = useState(false)
  const [showPreset, setShowPreset] = useState(false)

  // Source mode
  const [inputMode, setInputMode] = useState('file') // 'file' | 'url'
  const [urlInput, setUrlInput] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null) // null | 0-100
  const fileInputRef = useRef(null)

  // Video
  const [loadedUrl, setLoadedUrl] = useState('')
  const [duration, setDuration] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)

  // Cuts
  const [cuts, setCuts] = useState([])
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [addError, setAddError] = useState('')

  // Render
  const [status, setStatus] = useState('idle') // idle | rendering | done | error
  const [statusMsg, setStatusMsg] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)

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
  }, [loadedUrl])

  const saveCredentials = () => {
    localStorage.setItem(LS_CLOUDINARY_CLOUD, cloudName.trim())
    localStorage.setItem(LS_CLOUDINARY_PRESET, uploadPreset.trim())
    setShowSettings(false)
  }

  const credentialsOk = cloudName.trim() && uploadPreset.trim()

  const resetVideo = () => {
    setLoadedUrl('')
    setDuration(null)
    setCuts([])
    setDownloadUrl(null)
    setStatus('idle')
    setStatusMsg('')
  }

  const handleFileSelect = async (file) => {
    if (!file) return
    if (!credentialsOk) { setShowSettings(true); return }
    resetVideo()
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, cloudName.trim(), uploadPreset.trim(), setUploadProgress)
      setLoadedUrl(url)
    } catch (e) {
      setStatusMsg(e.message)
      setStatus('error')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleLoadUrl = () => {
    const url = urlInput.trim()
    if (!url) return
    resetVideo()
    setLoadedUrl(url)
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

  const keptDuration = segments.filter(s => s.keep).reduce((acc, s) => acc + (s.end - s.start), 0)

  const handleRender = async () => {
    if (!loadedUrl) return
    setStatus('rendering')
    setStatusMsg('Enviando para renderização...')
    setDownloadUrl(null)
    try {
      const res = await fetch('/api/renderVideo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: loadedUrl, cuts, videoDuration: duration }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erro ${res.status}`)
      }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setStatusMsg(e.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200">
            <Scissors size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Editor de Cortes</h1>
            <p className="text-xs text-gray-500">Marque os trechos para remover e baixe o vídeo editado</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          className={clsx(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
            showSettings
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
          )}
        >
          <Settings2 size={13} /> Cloudinary
        </button>
      </div>

      {/* Cloudinary settings */}
      {showSettings && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Configuração do Cloudinary</p>
          <p className="text-xs text-gray-500">
            Crie uma conta gratuita em cloudinary.com, depois crie um <strong>Upload Preset</strong> do tipo <em>Unsigned</em> nas configurações de upload.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Cloud Name</label>
              <input
                type="text"
                value={cloudName}
                onChange={e => setCloudName(e.target.value)}
                placeholder="meu-cloud"
                className="w-full text-sm border border-orange-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Upload Preset (Unsigned)</label>
              <div className="relative">
                <input
                  type={showPreset ? 'text' : 'password'}
                  value={uploadPreset}
                  onChange={e => setUploadPreset(e.target.value)}
                  placeholder="ml_default"
                  className="w-full text-sm border border-orange-200 rounded-xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                />
                <button
                  onClick={() => setShowPreset(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPreset ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={saveCredentials}
            disabled={!cloudName.trim() || !uploadPreset.trim()}
            className="px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-40 transition-colors"
          >
            Salvar
          </button>
        </div>
      )}

      {/* Input mode toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setInputMode('file')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              inputMode === 'file'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            <Upload size={14} /> Subir arquivo
          </button>
          <button
            onClick={() => setInputMode('url')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              inputMode === 'url'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            <Link2 size={14} /> URL pública
          </button>
        </div>

        {inputMode === 'file' ? (
          <div className="space-y-3">
            {!credentialsOk && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <AlertCircle size={12} /> Configure o Cloudinary acima antes de subir arquivos.
              </p>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!credentialsOk || uploadProgress !== null}
              className={clsx(
                'w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-2 transition-colors',
                credentialsOk
                  ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer text-orange-500'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              )}
            >
              {uploadProgress !== null ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-sm font-medium">{uploadProgress}% enviado...</span>
                </>
              ) : (
                <>
                  <Upload size={24} />
                  <span className="text-sm font-medium">Clique para selecionar o vídeo</span>
                  <span className="text-xs text-gray-400">MP4, MOV, AVI, WebM</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0])}
            />
            {uploadProgress !== null && (
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/video.mp4"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
              />
              <button
                onClick={handleLoadUrl}
                disabled={!urlInput.trim()}
                className="px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-40 transition-colors"
              >
                Carregar
              </button>
            </div>
            <p className="text-xs text-gray-400">URL direta de arquivo MP4 público. YouTube não é suportado.</p>
          </div>
        )}
      </div>

      {/* Video player */}
      {loadedUrl && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <video
            ref={videoRef}
            src={loadedUrl}
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
                    className={clsx('absolute top-0 h-full rounded-full', seg.keep ? 'bg-emerald-400' : 'bg-red-400 opacity-70')}
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
                usar como início do corte
              </button>
              <span>·</span>
              <button onClick={() => setNewEnd(currentTime.toFixed(1))} className="text-orange-600 hover:underline">
                usar como fim do corte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add cut */}
      {loadedUrl && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Adicionar corte</p>
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
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
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
            <p className="text-sm font-semibold text-gray-700">Cortes marcados</p>
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
                <button onClick={() => removeCut(i)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-1 space-y-1">
            <p className="text-xs text-gray-400 mb-1.5">O que fica:</p>
            {segments.filter(s => s.keep).map((seg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-emerald-700">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono">{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                <span className="text-emerald-500">({(seg.end - seg.start).toFixed(1)}s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render */}
      {loadedUrl && (
        <div className="space-y-3">
          <button
            onClick={handleRender}
            disabled={status === 'rendering' || cuts.length === 0}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all',
              status === 'rendering'
                ? 'bg-orange-100 text-orange-400 cursor-not-allowed'
                : cuts.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200'
            )}
          >
            {status === 'rendering'
              ? <><Loader2 size={16} className="animate-spin" /> Renderizando...</>
              : <><Film size={16} /> Renderizar vídeo</>}
          </button>

          {cuts.length === 0 && (
            <p className="text-xs text-center text-gray-400">Adicione pelo menos um corte para renderizar</p>
          )}

          {status === 'rendering' && (
            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <Loader2 size={12} className="animate-spin" />
              {statusMsg} — isso pode levar alguns minutos, não feche a aba.
            </div>
          )}

          {status === 'done' && downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-md shadow-emerald-100"
            >
              <Download size={16} /> Baixar vídeo editado
            </a>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={12} /> {statusMsg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
