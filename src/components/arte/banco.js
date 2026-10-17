// Banco de fotos e vídeos dela no Supabase Storage (bucket público "cio-media", pasta "banco/").
// O mesmo bucket já guarda as imagens dos templates de carrossel e do publicador.
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

const BUCKET = 'cio-media'
const PASTA = 'banco'
const VIDEO = /\.(mp4|mov|m4v|webm)$/i

export const bancoDisponivel = () => isSupabaseConfigured()

const nomeSeguro = (nome) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)

/** Itens do banco, mais recentes primeiro. */
export async function listarBanco() {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).list(PASTA, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw new Error(`Não consegui abrir o banco: ${error.message}`)
  return (data ?? [])
    .filter((o) => o.id && o.name !== '.emptyFolderPlaceholder')
    .map((o) => ({
      nome: o.name,
      url: supabase.storage.from(BUCKET).getPublicUrl(`${PASTA}/${o.name}`).data.publicUrl,
      video: (o.metadata?.mimetype ?? '').startsWith('video/') || VIDEO.test(o.name),
    }))
}

/** Sobe os arquivos escolhidos; devolve quantos entraram e os erros dos que falharam. */
export async function enviarParaBanco(arquivos, aoAvancar) {
  const supabase = getSupabase()
  const erros = []
  let feitos = 0
  for (const f of arquivos) {
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      erros.push(`${f.name}: não é foto nem vídeo`)
      continue
    }
    const caminho = `${PASTA}/${Date.now()}-${nomeSeguro(f.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, f, { cacheControl: '31536000', contentType: f.type })
    if (error) erros.push(`${f.name}: ${error.message}`)
    else feitos++
    aoAvancar?.(feitos + erros.length, arquivos.length)
  }
  return { feitos, erros }
}

/** Baixa uma foto do banco como Blob (CORS), para seguir o mesmo caminho de um arquivo enviado. */
export async function baixar(url) {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Não consegui baixar a foto (${res.status}).`)
  return res.blob()
}

/** Abre um vídeo do banco pronto para escolher o quadro. */
export function abrirVideo(url) {
  return new Promise((ok, erro) => {
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onloadeddata = () => ok(v)
    v.onerror = () => erro(new Error('Não consegui abrir o vídeo.'))
    v.src = url
  })
}

/** Quadro atual do vídeo como JPEG, já no tamanho que o Studio usa. */
export function quadroDoVideo(video) {
  const k = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(video.videoWidth * k)
  c.height = Math.round(video.videoHeight * k)
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.9)
}
