import { useEffect, useState } from 'react'
import { Instagram, RefreshCw, Loader2, ExternalLink, Heart, MessageCircle, Bookmark, Repeat2, Eye, Users, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getConnection } from '../../lib/instagramAuth'
import { instagramFetchPosts, instagramFetchComments } from '../../lib/aiService'
import Modal from '../common/Modal'

const POST_TYPE_LABEL = { reel: 'Reel', carousel: 'Carrossel', image: 'Foto', video: 'Vídeo' }

function StatChip({ icon: Icon, value, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500" title={label}>
      <Icon size={11} /> {value.toLocaleString('pt-BR')}
    </span>
  )
}

export default function InstagramStudio() {
  const connection = getConnection()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState(null)
  const [insightsAvailable, setInsightsAvailable] = useState(true)
  const [selected, setSelected] = useState(null)

  const fetchPosts = async () => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      const { posts: fetched, insightsAvailable: ia } = await instagramFetchPosts(connection.accessToken)
      setPosts(fetched)
      setInsightsAvailable(ia)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!connection) {
    return (
      <div className="p-6 max-w-2xl animate-fade-in">
        <div className="card p-8 text-center space-y-3">
          <Instagram size={32} className="text-pink-400 mx-auto" />
          <p className="text-sm text-gray-700">Nenhuma conta do Instagram conectada ainda.</p>
          <Link to="/settings" className="btn-primary inline-flex">Conectar Instagram</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Instagram size={18} className="text-pink-500" /> Posts do Instagram
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            @{connection.accounts?.[0]?.username || connection.accounts?.[0]?.id}
          </p>
        </div>
        <button onClick={fetchPosts} disabled={loading} className="btn-secondary text-xs">
          {loading ? <><Loader2 size={13} className="animate-spin" /> Atualizando...</> : <><RefreshCw size={13} /> Atualizar</>}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {!insightsAvailable && posts && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2.5 border border-amber-200 mb-4">
          ⚠️ Conexão sem permissão de Insights — alcance, visualizações, salvamentos e compartilhamentos não disponíveis. <Link to="/settings" className="underline">Reconecte o Instagram</Link> pra liberar esses números.
        </p>
      )}

      {loading && !posts && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-pink-400" />
        </div>
      )}

      {posts && posts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">Nenhum post encontrado nessa conta.</p>
      )}

      {posts && posts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="card p-0 overflow-hidden text-left hover:shadow-lg transition-shadow group"
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {post.thumbnailUrl ? (
                  <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Instagram size={28} />
                  </div>
                )}
                <span className="absolute top-2 left-2 chip border text-[10px] bg-white/90 text-gray-700 border-gray-200 capitalize">
                  {POST_TYPE_LABEL[post.postType] || post.postType || 'Post'}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[11px] text-gray-400">
                  {post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR') : ''}
                </p>
                {post.caption && (
                  <p className="text-xs text-gray-600 line-clamp-2">{post.caption}</p>
                )}
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 pt-1 border-t border-gray-100">
                  <StatChip icon={Eye} value={post.views || post.reach} label="Visualizações" />
                  <StatChip icon={Users} value={post.reach} label="Alcance" />
                  <StatChip icon={Heart} value={post.likes} label="Curtidas" />
                  <StatChip icon={MessageCircle} value={post.comments} label="Comentários" />
                  <StatChip icon={Bookmark} value={post.saves} label="Salvamentos" />
                  <StatChip icon={Repeat2} value={post.shares} label="Compartilhamentos" />
                  {post.avgWatchTimeSec > 0 && (
                    <StatChip icon={Clock} value={post.avgWatchTimeSec} label="Tempo médio assistido (s)" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <PostDetailModal post={selected} accessToken={connection.accessToken} onClose={() => setSelected(null)} />
    </div>
  )
}

function PostDetailModal({ post, accessToken, onClose }) {
  const [comments, setComments] = useState(null)
  const [commentsError, setCommentsError] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    if (!post) { setComments(null); setCommentsError(null); return }
    setCommentsLoading(true)
    setCommentsError(null)
    instagramFetchComments(accessToken, post.id)
      .then(setComments)
      .catch((err) => setCommentsError(err.message))
      .finally(() => setCommentsLoading(false))
  }, [post, accessToken])

  if (!post) return null

  return (
    <Modal open={!!post} onClose={onClose} title={POST_TYPE_LABEL[post.postType] || 'Post'} maxWidth="max-w-xl">
      <div className="space-y-4">
        {post.thumbnailUrl && (
          <img src={post.thumbnailUrl} alt="" className="w-full max-h-64 object-cover rounded-xl" />
        )}
        {post.caption && <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.caption}</p>}

        <div className="flex flex-wrap gap-3 py-2 border-y border-gray-100">
          <StatChip icon={Eye} value={post.views || post.reach} label="Visualizações" />
          <StatChip icon={Users} value={post.reach} label="Alcance" />
          <StatChip icon={Heart} value={post.likes} label="Curtidas" />
          <StatChip icon={MessageCircle} value={post.comments} label="Comentários" />
          <StatChip icon={Bookmark} value={post.saves} label="Salvamentos" />
          <StatChip icon={Repeat2} value={post.shares} label="Compartilhamentos" />
          {post.avgWatchTimeSec > 0 && (
            <StatChip icon={Clock} value={post.avgWatchTimeSec} label="Tempo médio assistido (s)" />
          )}
        </div>

        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-pink-600 hover:underline">
            <ExternalLink size={11} /> Ver no Instagram
          </a>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Comentários</p>
          {commentsLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
              <Loader2 size={13} className="animate-spin" /> Carregando comentários...
            </div>
          )}
          {commentsError && <p className="text-xs text-red-500">{commentsError}</p>}
          {comments && comments.length === 0 && (
            <p className="text-xs text-gray-400">Nenhum comentário ainda.</p>
          )}
          {comments && comments.length > 0 && (
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="text-xs bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-gray-700">@{c.username || 'usuário'}</span>
                    <span className="text-gray-400">{c.timestamp ? new Date(c.timestamp).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <p className="text-gray-600">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
