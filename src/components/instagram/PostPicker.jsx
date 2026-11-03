import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Images, Loader2, X } from 'lucide-react'
import { tokenParaUso } from '../../lib/instagramAuth'
import { instagramListMedia } from '../../lib/aiService'
import { legendaCurta } from '../../lib/igMedia'

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : 'sem data')

/** Lista as publicações do Instagram conectado e devolve a escolhida pelo ID, sem a pessoa precisar caçar o número. */
export default function PostPicker({ value, onSelect, descricao = 'As 30 publicações mais recentes. Clique na que vai disparar a regra.' }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [posts, setPosts] = useState(null)
  const [erro, setErro] = useState('')

  const abrir = async () => {
    setAberto(true)
    setErro('')
    const { token, erro: semToken } = tokenParaUso()
    if (semToken) { setErro(semToken); return }
    setCarregando(true)
    try {
      setPosts(await instagramListMedia(token, 30))
    } catch (err) {
      setErro(err.message || 'Não foi possível listar as publicações.')
    } finally {
      setCarregando(false)
    }
  }

  const escolher = (post) => { onSelect(post); setAberto(false) }

  return (
    <div className="mt-2">
      <button type="button" onClick={() => (aberto ? setAberto(false) : abrir())} className="flex items-center gap-1.5 min-h-11 px-3 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
        <Images size={15} />{aberto ? 'Fechar a lista' : 'Escolher da lista de publicações'}
      </button>

      {aberto && (
        <div className="mt-2 rounded-xl border border-gray-200 p-3 space-y-3" aria-label="Publicações do Instagram">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{descricao}</p>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar a lista" className="flex items-center justify-center min-h-11 min-w-11 text-gray-500 hover:text-gray-900"><X size={16} /></button>
          </div>

          {carregando && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" />Buscando publicações…</div>}

          {erro && (
            <p role="alert" className="text-sm text-red-700">
              {erro} {/Configurações/.test(erro) && <Link to="/settings" className="underline">Abrir Configurações</Link>}
            </p>
          )}

          {!carregando && !erro && posts?.length === 0 && <p className="text-sm text-gray-500">Nenhuma publicação encontrada nessa conta.</p>}

          {!!posts?.length && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
              {posts.map((post) => {
                const escolhido = post.id === value
                const legenda = legendaCurta(post.legenda) || 'Sem legenda'
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => escolher(post)}
                    aria-pressed={escolhido}
                    aria-label={`${post.tipo} de ${formatarData(post.data)}: ${legenda}`}
                    className={`text-left rounded-lg border p-1.5 hover:bg-gray-50 ${escolhido ? 'border-orange-500 ring-2 ring-orange-500' : 'border-gray-200'}`}
                  >
                    <div className="aspect-square rounded-md bg-gray-100 overflow-hidden">
                      {post.miniatura ? <img src={post.miniatura} alt="" loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{post.tipo}</div>}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">{post.tipo} · {formatarData(post.data)}</p>
                    <p className="text-xs text-gray-800 leading-tight line-clamp-2">{legenda}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
