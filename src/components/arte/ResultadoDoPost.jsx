import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import PostPicker from '../instagram/PostPicker'
import { instagramFetchPosts } from '../../lib/aiService'
import { tokenParaUso } from '../../lib/instagramAuth'
import { BASE_SALVAMENTO, META_SALVAMENTO, MIN_AMOSTRAS, acharPost, formatarRazao, razaoSalvamento } from './resultadoPost'
import { legendaCurta } from '../../lib/igMedia'

const numero = (v) => (v == null ? 'indisponível' : Number(v).toLocaleString('pt-BR'))

/** Liga a arte ao post publicado e busca o resultado ao vivo (nada é guardado: o dado vem sempre do Instagram). */
export default function ResultadoDoPost({ publicacao, onPublicacao }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [post, setPost] = useState(null)

  const buscar = async () => {
    setErro('')
    const { token, erro: semToken } = tokenParaUso()
    if (semToken) { setErro(semToken); return }
    setCarregando(true)
    try {
      const { posts } = await instagramFetchPosts(token, 30)
      const achado = acharPost(posts, publicacao.mediaId)
      if (!achado) setErro('Esse post não está entre os 30 mais recentes da conta, então não consigo ler o resultado dele daqui.')
      setPost(achado)
    } catch (err) {
      setErro(err.message || 'Não foi possível buscar o resultado.')
    } finally {
      setCarregando(false)
    }
  }

  const razao = razaoSalvamento(post)

  return (
    <section aria-label="Resultado do post" className="space-y-2">
      <h3 className="text-sm font-medium">Depois de publicar · resultado do post</h3>
      {!publicacao ? (
        <>
          <p className="text-xs text-gray-500">Ligue esta arte ao post publicado para ver quanto ele salvou e comparar os modelos em Artes salvas.</p>
          <PostPicker value="" descricao="As 30 publicações mais recentes. Clique na que foi feita com esta arte." onSelect={(p) => onPublicacao({ mediaId: p.id, permalink: p.link, legenda: legendaCurta(p.legenda, 80), data: p.data })} />
        </>
      ) : (
        <>
          <p className="text-sm">
            Ligada ao post de {publicacao.data ? new Date(publicacao.data).toLocaleDateString('pt-BR') : 'data desconhecida'}: {publicacao.legenda || 'sem legenda'}.{' '}
            {publicacao.permalink && <a href={publicacao.permalink} target="_blank" rel="noreferrer" className="text-orange-800 underline">Abrir no Instagram</a>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={buscar} disabled={carregando} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg bg-orange-700 text-white hover:bg-orange-800 disabled:opacity-40">
              {carregando && <Loader2 size={15} className="animate-spin" />}{carregando ? 'Buscando…' : 'Buscar resultado'}
            </button>
            <button type="button" onClick={() => { setPost(null); setErro(''); onPublicacao(undefined) }} className="min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Desligar do post</button>
          </div>
          {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
          {post && (
            <div role="status" className="rounded-lg border border-gray-200 p-3 space-y-2">
              <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                {[['Curtidas', post.likes], ['Comentários', post.comments], ['Salvamentos', post.saves], ['Compartilhamentos', post.shares], ['Alcance', post.reach]].map(([rotulo, valor]) => (
                  <div key={rotulo}><dt className="text-xs text-gray-500">{rotulo}</dt><dd className="font-medium">{numero(valor)}</dd></div>
                ))}
              </dl>
              <p className="text-sm">Salvamento ÷ curtida: <strong>{formatarRazao(razao)}</strong> <span className="text-xs text-gray-500">(base {formatarRazao(BASE_SALVAMENTO)} · meta {formatarRazao(META_SALVAMENTO)})</span></p>
              {razao == null && <p className="text-xs text-gray-500">O Instagram não devolveu salvamentos para esse post. Reconectar o Instagram pode liberar essa métrica.</p>}
              <p className="text-xs text-gray-500">Um post é uma amostra. O sistema pede no mínimo {MIN_AMOSTRAS} antes de decidir qualquer coisa sobre um formato.</p>
            </div>
          )}
          <p className="text-xs text-gray-500">Para guardar esse vínculo, salve uma nova versão em Artes salvas.</p>
        </>
      )}
    </section>
  )
}
