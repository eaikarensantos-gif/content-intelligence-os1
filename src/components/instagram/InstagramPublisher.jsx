import { useState } from 'react'
import { Instagram, Upload, Loader2, CheckCircle2, AlertCircle, ExternalLink, Image as ImageIcon, X, Info } from 'lucide-react'
import { getConnection } from '../../lib/instagramAuth'
import { instagramPublishPost } from '../../lib/aiService'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

const BUCKET = 'cio-media'

export default function InstagramPublisher() {
  const connection = getConnection()
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [step, setStep] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Envie um arquivo de imagem (JPG ou PNG).'); return }
    setError(null)
    setResult(null)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const clearFile = () => { setFile(null); setPreviewUrl(null) }

  const handlePublish = async () => {
    if (!file) { setError('Selecione uma imagem para publicar.'); return }
    if (!isSupabaseConfigured()) {
      setError('Configure o Supabase em Configurações — é usado para hospedar a imagem numa URL pública, que a API do Instagram exige antes de publicar.')
      return
    }

    setPublishing(true)
    setError(null)
    setResult(null)

    try {
      setStep('upload')
      const supabase = getSupabase()
      const path = `instagram/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
      })
      if (uploadError) {
        throw new Error(`Falha ao hospedar a imagem no Supabase (bucket "${BUCKET}"): ${uploadError.message}. Crie um bucket público com esse nome no seu projeto Supabase (Storage → New bucket → Public bucket) se ainda não existir.`)
      }
      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const imageUrl = publicUrlData?.publicUrl
      if (!imageUrl) throw new Error('Não foi possível obter a URL pública da imagem no Supabase.')

      setStep('publish')
      const published = await instagramPublishPost(connection.accessToken, imageUrl, caption)
      setResult(published)
      clearFile()
      setCaption('')
    } catch (err) {
      setError(err.message)
    } finally {
      setPublishing(false)
      setStep(null)
    }
  }

  if (!connection) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-4">
          <Instagram size={28} className="text-pink-400" />
        </div>
        <h3 className="text-gray-700 font-semibold mb-2">Instagram não conectado</h3>
        <p className="text-gray-400 text-sm max-w-sm">Conecte sua conta do Instagram em Configurações para publicar posts direto por aqui.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 via-fuchsia-600 to-orange-500 p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Instagram size={18} />
          <h2 className="text-base font-bold">Publicar no Instagram</h2>
        </div>
        <p className="text-sm text-white/85 max-w-xl">
          Publica direto na sua conta conectada (@{connection.username}).
        </p>
      </div>

      {/* Aviso sobre o passo extra de hospedagem */}
      <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
        <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
        <p>A API do Instagram exige que a imagem esteja numa URL pública antes de publicar. Por isso, ao clicar em publicar, a imagem é enviada primeiro para um bucket público chamado <code className="font-mono bg-white px-1 rounded border border-gray-200">{BUCKET}</code> no seu Supabase (configurado em Configurações) — crie esse bucket como público em Storage, caso ainda não exista.</p>
      </div>

      {/* Upload */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">Imagem</label>
          {previewUrl ? (
            <div className="relative w-full max-w-xs">
              <img src={previewUrl} alt="" className="w-full rounded-xl border border-gray-200 object-cover aspect-square" />
              <button onClick={clearFile} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80" type="button">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-colors">
              <ImageIcon size={24} className="text-gray-300" />
              <span className="text-xs text-gray-400">Clique para selecionar uma imagem (JPG ou PNG)</span>
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">Legenda</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="Escreva a legenda do post..."
            className="input w-full text-sm resize-none"
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={publishing || !file}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-40 transition-colors"
        >
          {publishing ? (
            <><Loader2 size={15} className="animate-spin" /> {step === 'upload' ? 'Hospedando imagem...' : 'Publicando...'}</>
          ) : (
            <><Upload size={15} /> Publicar no Instagram</>
          )}
        </button>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="card p-4 border-emerald-200 bg-emerald-50 flex items-start gap-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-700 font-medium">Publicado com sucesso!</p>
            {result.permalink && (
              <a href={result.permalink} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 underline inline-flex items-center gap-1 mt-1">
                Ver no Instagram <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
