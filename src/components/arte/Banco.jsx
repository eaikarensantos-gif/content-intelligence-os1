import { useEffect, useRef, useState } from 'react'
import { Film, Loader2, Upload, X } from 'lucide-react'
import { abrirVideo, bancoDisponivel, baixar, enviarParaBanco, listarBanco, quadroDoVideo } from './banco'

/** Janela do banco de fotos e vídeos. onEscolher recebe um Blob (foto) ou um data URL (quadro de vídeo). */
export default function Banco({ onEscolher, onFechar }) {
  const [itens, setItens] = useState(null)
  const [estado, setEstado] = useState('')
  const [erro, setErro] = useState('')
  const [video, setVideo] = useState(null)
  const [tempo, setTempo] = useState(0)
  const palco = useRef(null)

  const carregar = () => listarBanco().then(setItens).catch((e) => { setErro(e.message); setItens([]) })
  useEffect(() => { if (bancoDisponivel()) carregar() }, [])

  // O <video> é criado fora do React para já vir com crossOrigin; aqui só é colocado no palco.
  useEffect(() => {
    if (!video || !palco.current) return
    palco.current.replaceChildren(video.el)
    video.el.className = 'w-full max-h-[50vh] rounded-lg bg-black'
  }, [video])

  const enviar = async (e) => {
    const arquivos = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!arquivos.length) return
    setErro('')
    setEstado(`Enviando 0 de ${arquivos.length}…`)
    const { erros } = await enviarParaBanco(arquivos, (n, total) => setEstado(`Enviando ${n} de ${total}…`))
    setEstado('')
    if (erros.length) setErro(erros.join(' · '))
    carregar()
  }

  const escolher = async (item) => {
    setErro('')
    try {
      if (item.video) {
        setEstado('Abrindo vídeo…')
        const el = await abrirVideo(item.url)
        setTempo(0)
        setVideo({ el, duracao: el.duration || 0 })
      } else {
        setEstado('Trazendo a foto…')
        onEscolher(await baixar(item.url))
      }
    } catch (err) {
      setErro(err.message)
    } finally {
      setEstado('')
    }
  }

  const irPara = (t) => {
    setTempo(t)
    video.el.currentTime = t
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">{video ? 'Escolha o quadro do vídeo' : 'Meu banco de fotos e vídeos'}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-900"><X size={18} /></button>
        </div>

        {!bancoDisponivel() ? (
          <p className="text-sm text-gray-600">O banco usa o Supabase. Configure em Configurações → Supabase e volte aqui.</p>
        ) : video ? (
          <div className="space-y-3">
            <div ref={palco} />
            <input type="range" min={0} max={video.duracao} step={0.04} value={tempo} onChange={(e) => irPara(Number(e.target.value))} className="w-full" />
            <div className="flex gap-2">
              <button type="button" onClick={() => onEscolher(quadroDoVideo(video.el))} className="px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">Usar este quadro</button>
              <button type="button" onClick={() => setVideo(null)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Voltar ao banco</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <label className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 cursor-pointer">
                <Upload size={15} />Enviar fotos e vídeos
                <input type="file" accept="image/*,video/*" multiple onChange={enviar} className="hidden" />
              </label>
              <span className="text-xs text-gray-500">No celular, este botão abre a galeria e o Google Fotos.</span>
            </div>
            {itens === null ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" />Carregando…</div>
            ) : itens.length === 0 ? (
              <p className="text-sm text-gray-500">Seu banco está vazio. Envie as primeiras fotos.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {itens.map((it) => (
                  <button key={it.nome} type="button" onClick={() => escolher(it)} disabled={!!estado} title={it.nome}
                    className="relative aspect-[4/5] overflow-hidden rounded-lg border border-gray-200 hover:ring-2 hover:ring-orange-500 bg-gray-100">
                    {it.video ? (
                      <>
                        <video src={`${it.url}#t=0.5`} crossOrigin="anonymous" muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        <span className="absolute left-1.5 bottom-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white"><Film size={11} />vídeo</span>
                      </>
                    ) : (
                      <img src={it.url} crossOrigin="anonymous" alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {estado && <div className="mt-3 flex items-center gap-2 text-sm text-gray-600"><Loader2 size={15} className="animate-spin" />{estado}</div>}
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>
    </div>
  )
}
