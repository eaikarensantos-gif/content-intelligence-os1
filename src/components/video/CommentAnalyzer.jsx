import { useState, useRef } from 'react'
import { Lightbulb, Sparkles, Zap, Plus, X, Upload, MessageSquare, Loader2, Copy, Check, Compass, Minimize2, Bookmark, RefreshCw, Instagram, Send } from 'lucide-react'
import useStore from '../../store/useStore'
import { LS_KEY } from './constants'
import { extractJsonObject, extractJsonArray, assertNotTruncated } from '../../utils/aiJson'
import { handleApiError } from '../../utils/apiError'
import { getConnection } from '../../lib/instagramAuth'
import { instagramFetchPosts, instagramFetchComments, instagramReplyComment } from '../../lib/aiService'
import Modal from '../common/Modal'

export default function CommentAnalyzer() {
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [context, setContext] = useState('')
  const [responsePaths, setResponsePaths] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [shorteningId, setShorteningId] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [analyzedComments, setAnalyzedComments] = useState([])
  const connection = getConnection()
  const [igModalOpen, setIgModalOpen] = useState(false)
  const [igPosts, setIgPosts] = useState(null)
  const [igPostsLoading, setIgPostsLoading] = useState(false)
  const [igPostsError, setIgPostsError] = useState(null)
  const [igCommentsLoadingFor, setIgCommentsLoadingFor] = useState(null)
  const [publishingId, setPublishingId] = useState(null)
  const [publishedId, setPublishedId] = useState(null)
  const [publishError, setPublishError] = useState(null)
  const addIdea = useStore(s => s.addIdea)
  const brandVoice = useStore(s => s.brandVoice)
  const commentContexts = useStore(s => s.commentContexts)
  const addCommentContext = useStore(s => s.addCommentContext)
  const deleteCommentContext = useStore(s => s.deleteCommentContext)
  const fileRef = useRef(null)

  const saveContext = () => {
    if (!context.trim()) return
    addCommentContext({
      title: context.trim().split('\n')[0].slice(0, 60),
      context: context.trim(),
      responsePaths,
    })
  }

  const loadContext = (ctx) => {
    setContext(ctx.context)
    setResponsePaths(ctx.responsePaths || '')
  }

  const copyReply = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const addComment = () => {
    if (!commentText.trim()) return
    setComments(prev => [{ id: Date.now(), text: commentText.trim(), source: 'text' }, ...prev])
    setCommentText('')
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro'); return }

    setAnalyzing(true)
    setError('')
    try {
      for (const file of files) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.readAsDataURL(file)
        })
        const mediaType = file.type || 'image/png'

        const resp = await fetch('/api/ai?action=gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-5',
            thinking: { type: 'adaptive' },
            output_config: { effort: 'medium' },
            max_tokens: 3000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Extraia TODOS os comentários visíveis nesta imagem. Retorne APENAS um JSON array de strings, cada string sendo um comentário completo. Exemplo: ["comentário 1", "comentário 2"]. Se não houver comentários, retorne []. Sem markdown, sem explicação.' }
              ]
            }]
          })
        })
        if (!resp.ok) await handleApiError(resp)
        const data = await resp.json()
        assertNotTruncated(data, 'A imagem tem texto demais e a extração foi cortada antes de terminar. Tente uma imagem com menos comentários por vez.')
        const text = data.content?.find(b => b.type === 'text')?.text
        const extracted = extractJsonArray(text, 'Não consegui ler os comentários dessa imagem. Tente uma imagem mais nítida ou com menos texto.')
        setComments(prev => [...extracted.map(c => ({ id: Date.now() + Math.random(), text: c, source: 'image' })), ...prev])
      }
    } catch (e) { setError(e.message) }
    finally { setAnalyzing(false) }
    if (fileRef.current) fileRef.current.value = ''
  }

  const analyzeComments = async () => {
    const pendingText = commentText.trim()
    const allComments = pendingText
      ? [{ id: Date.now(), text: pendingText, source: 'text' }, ...comments]
      : comments
    if (!allComments.length) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro'); return }

    if (pendingText) { setComments(allComments); setCommentText('') }
    setAnalyzedComments(allComments)
    setAnalyzing(true)
    setError('')
    setSuggestions(null)
    try {
      const voiceContext = brandVoice?.prompt ? `\n\nVOZ DO CRIADOR:\n${brandVoice.prompt}` : ''
      const contextSection = context.trim() ? `\n\nCONTEXTO DOS COMENTÁRIOS:\n${context.trim()}` : ''
      const pathsList = responsePaths.split('\n').map(s => s.trim()).filter(Boolean)
      const pathsSection = pathsList.length
        ? `\n\nCAMINHOS DE RESPOSTA DESEJADOS:\nSiga estritamente estes caminhos/direções ao gerar as respostas:\n${pathsList.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
        : '\n\nNenhum caminho de resposta específico foi definido: gere respostas variando o tom (ex: empática, direta, educativa).'
      const resp = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 6000,
          messages: [{
            role: 'user',
            content: `Você é a própria pessoa respondendo os comentários do seu post/vídeo — não um assistente de marketing escrevendo texto genérico.
${voiceContext}${contextSection}${pathsSection}

COMENTÁRIOS DA AUDIÊNCIA:
${allComments.map((c, i) => `${i + 1}. "${c.text}"`).join('\n')}

Tarefa PRIORITÁRIA: para CADA comentário da lista, gere 2-3 sugestões de RESPOSTA prontas para postar, seguindo os caminhos de resposta pedidos acima.

Regras para as respostas:
- Tom conversacional e informal por padrão (a menos que a voz do criador ou os caminhos pedidos indiquem outro tom) — nada de linguagem corporativa ou de "discurso de vendas".
- Responda especificamente ao que ESSA pessoa disse, retomando o ponto que ela trouxe — nunca uma resposta padrão que serviria pra qualquer comentário.
- Se o CONTEXTO DOS COMENTÁRIOS trouxer o vídeo/post original, dados, ou um exemplo de resposta já escrita pela própria pessoa, use isso para aprofundar o raciocínio e espelhar o tom, vocabulário e nível de formalidade desse exemplo.
- Respostas podem ser curtas — nem toda resposta precisa de parágrafos longos.

Tarefa secundária: agrupe os comentários em PERFIS DE DOR (problemas/frustrações similares) e sugira 2-3 ideias de conteúdo por perfil.

Responda APENAS com JSON válido, sem markdown:
{
  "replies": [
    {
      "comment_index": 1,
      "comment_excerpt": "trecho do comentário original (até 140 caracteres)",
      "suggestions": [
        {
          "path": "qual caminho de resposta pedido esta sugestão segue (ou o tom usado, se nenhum caminho foi pedido)",
          "reply": "texto de resposta pronto para postar"
        }
      ]
    }
  ],
  "pain_profiles": [
    {
      "name": "nome do perfil de dor",
      "description": "o que essas pessoas sentem/enfrentam",
      "comments_count": 3,
      "intensity": "alta|média|baixa",
      "content_ideas": [
        {
          "title": "título do conteúdo sugerido",
          "format": "carrossel|reel|stories|thread|artigo",
          "hook": "frase de abertura sugerida",
          "angle": "abordagem/ângulo do conteúdo",
          "why": "por que esse conteúdo resolve essa dor"
        }
      ]
    }
  ],
  "meta_insight": "insight geral sobre o que a audiência está pedindo entre linhas"
}`
          }]
        })
      })
      if (!resp.ok) await handleApiError(resp)
      const data = await resp.json()
      assertNotTruncated(data, 'A análise ficou grande demais e foi cortada antes de terminar. Tente novamente com menos comentários.')
      const text = data.content?.find(b => b.type === 'text')?.text
      setSuggestions(extractJsonObject(text))
    } catch (e) { setError(e.message) }
    finally { setAnalyzing(false) }
  }

  const shortenReply = async (ci, si) => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro'); return }
    const current = suggestions.replies[ci].suggestions[si].reply
    const replyId = `${ci}-${si}`
    setShorteningId(replyId)
    setError('')
    try {
      const resp = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'disabled' },
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Reescreva a resposta abaixo de forma mais curta e direta, mantendo o mesmo sentido, tom e nível de informalidade. Responda APENAS com o novo texto da resposta, sem aspas, sem explicação.\n\nResposta original:\n${current}`,
          }]
        })
      })
      if (!resp.ok) await handleApiError(resp)
      const data = await resp.json()
      assertNotTruncated(data)
      const shortened = data.content?.find(b => b.type === 'text')?.text?.trim()
      if (shortened) {
        setSuggestions(prev => {
          const next = { ...prev, replies: prev.replies.map((r, i) => {
            if (i !== ci) return r
            return { ...r, suggestions: r.suggestions.map((s, j) => j === si ? { ...s, reply: shortened } : s) }
          }) }
          return next
        })
      }
    } catch (e) { setError(e.message) }
    finally { setShorteningId(null) }
  }

  const regenerateReply = async (ci, si) => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro'); return }
    const replyEntry = suggestions.replies[ci]
    const current = replyEntry.suggestions[si]
    const replyId = `${ci}-${si}`
    setRegeneratingId(replyId)
    setError('')
    try {
      const voiceContext = brandVoice?.prompt ? `\n\nVOZ DO CRIADOR:\n${brandVoice.prompt}` : ''
      const resp = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'disabled' },
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Você é a própria pessoa respondendo comentários do seu post/vídeo.${voiceContext}

COMENTÁRIO ORIGINAL:
"${replyEntry.comment_excerpt}"

RESPOSTA ATUAL (a pessoa não gostou, quer uma alternativa):
"${current.reply}"

Gere uma NOVA sugestão de resposta pra esse mesmo comentário${current.path ? `, seguindo o mesmo caminho/direção: "${current.path}"` : ''}. Precisa ser genuinamente diferente da atual — outro ângulo, outra abertura, outra forma de dizer — mas manter o mesmo tom conversacional e informal. Responda APENAS com o novo texto da resposta, sem aspas, sem explicação.`,
          }]
        })
      })
      if (!resp.ok) await handleApiError(resp)
      const data = await resp.json()
      assertNotTruncated(data)
      const regenerated = data.content?.find(b => b.type === 'text')?.text?.trim()
      if (regenerated) {
        setSuggestions(prev => ({
          ...prev,
          replies: prev.replies.map((r, i) => i !== ci ? r : {
            ...r,
            suggestions: r.suggestions.map((s, j) => j === si ? { ...s, reply: regenerated } : s),
          }),
        }))
      }
    } catch (e) { setError(e.message) }
    finally { setRegeneratingId(null) }
  }

  const handleSaveIdea = (idea, profileName) => {
    addIdea({
      title: idea.title,
      description: `Ângulo: ${idea.angle}\n\nGancho: ${idea.hook}\n\nPor quê: ${idea.why}\n\nPerfil de dor: ${profileName}`,
      format: idea.format,
      hook_type: 'pain-point',
      priority: 'high',
      status: 'idea',
      tags: ['comentarios', 'dor-audiencia'],
    })
  }

  const removeComment = (id) => setComments(prev => prev.filter(c => c.id !== id))

  const openIgPicker = () => {
    setIgModalOpen(true)
    if (!igPosts && connection) {
      setIgPostsLoading(true)
      setIgPostsError(null)
      instagramFetchPosts(connection.accessToken, 12)
        .then(({ posts }) => setIgPosts(posts))
        .catch((e) => setIgPostsError(e.message))
        .finally(() => setIgPostsLoading(false))
    }
  }

  const pickIgPost = async (post) => {
    setIgCommentsLoadingFor(post.id)
    setIgPostsError(null)
    try {
      const igComments = await instagramFetchComments(connection.accessToken, post.id)
      if (!igComments.length) {
        setIgPostsError('Esse post não tem comentários ainda.')
        return
      }
      setComments(prev => [
        ...igComments.map(c => ({
          id: `ig-${c.id}`,
          text: c.text,
          source: 'instagram',
          username: c.username,
          igCommentId: c.id,
        })),
        ...prev,
      ])
      setIgModalOpen(false)
    } catch (e) {
      setIgPostsError(e.message)
    } finally {
      setIgCommentsLoadingFor(null)
    }
  }

  const publishReply = async (ci, si) => {
    if (!connection) return
    const original = analyzedComments[suggestions.replies[ci].comment_index - 1]
    if (!original?.igCommentId) return
    const replyText = suggestions.replies[ci].suggestions[si].reply
    const replyId = `${ci}-${si}`
    setPublishingId(replyId)
    setPublishError(null)
    try {
      await instagramReplyComment(connection.accessToken, original.igCommentId, replyText)
      setPublishedId(replyId)
      setTimeout(() => setPublishedId(null), 3000)
    } catch (e) {
      setPublishError(e.message)
    } finally {
      setPublishingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            <MessageSquare size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Analisador de Comentários</h3>
            <p className="text-[11px] text-gray-500">Printe comentários do seu nicho e a IA sugere conteúdos para resolver essas dores</p>
          </div>
        </div>
      </div>

      {/* Unified input block */}
      <div className="card p-5 space-y-4">
        {/* Context & response paths */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-indigo-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contexto e caminhos de resposta (opcional)</h4>
          </div>
          <button
            onClick={saveContext}
            disabled={!context.trim()}
            title="Salvar este contexto para reabrir depois"
            className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Bookmark size={12} /> Salvar contexto
          </button>
        </div>

        {commentContexts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {commentContexts.map((ctx) => (
              <div key={ctx.id} className="flex items-center gap-1 bg-gray-100 rounded-full pl-2.5 pr-1 py-1 group">
                <button
                  onClick={() => loadContext(ctx)}
                  title={ctx.context}
                  className="text-[11px] text-gray-600 hover:text-indigo-700 font-medium max-w-[180px] truncate"
                >
                  {ctx.title || 'Contexto salvo'}
                </button>
                <button
                  onClick={() => deleteCommentContext(ctx.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">Contexto dos comentários</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ex: comentários do meu vídeo sobre X, público é iniciante, tom da marca é..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">Caminhos de resposta desejados (um por linha)</label>
          <textarea
            value={responsePaths}
            onChange={(e) => setResponsePaths(e.target.value)}
            placeholder={'Ex:\nResposta empática, acolhendo a dor\nResposta educativa, explicando o porquê\nResposta com CTA convidando pro produto'}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
        </div>

        {/* Add comments */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Adicionar comentários</h4>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={analyzing}
              title="Upload de print (imagem)"
              className="shrink-0 w-9 h-9 self-end flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            </button>
            {connection && (
              <button
                onClick={openIgPicker}
                title="Puxar comentários reais de um post do Instagram"
                className="shrink-0 w-9 h-9 self-end flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50 transition-colors"
              >
                <Instagram size={15} />
              </button>
            )}
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() }
              }}
              placeholder="Cole um comentário aqui, ou envie um print. Pode clicar direto em Analisar — só use o + se quiser adicionar mais de um antes de analisar."
              rows={2}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
            <button
              onClick={addComment}
              disabled={!commentText.trim()}
              className="shrink-0 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
            >
              <Plus size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Comments list */}
        {comments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {comments.length} comentário{comments.length !== 1 ? 's' : ''} coletado{comments.length !== 1 ? 's' : ''}
              </h4>
              <button
                onClick={() => setComments([])}
                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
              >
                Limpar todos
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg group">
                  {c.source === 'instagram'
                    ? <Instagram size={13} className="mt-0.5 shrink-0 text-pink-400" />
                    : <MessageSquare size={13} className={`mt-0.5 shrink-0 ${c.source === 'image' ? 'text-indigo-400' : 'text-gray-400'}`} />
                  }
                  <p className="text-xs text-gray-700 flex-1 leading-relaxed">
                    {c.username && <span className="font-medium text-pink-600">@{c.username} </span>}
                    {c.text}
                  </p>
                  <button
                    onClick={() => removeComment(c.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analyze button */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={analyzeComments}
            disabled={analyzing || (!comments.length && !commentText.trim())}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analisando dores...</>
            ) : (
              <><Sparkles size={16} /> Analisar e Sugerir Conteúdos</>
            )}
          </button>
          {!comments.length && !commentText.trim() && (
            <p className="text-[11px] text-gray-400 text-center mt-2">Escreva ou cole pelo menos um comentário para habilitar a análise</p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
      )}

      {publishError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
          Falha ao publicar no Instagram: {publishError}
        </div>
      )}

      {/* Results */}
      {suggestions && (
        <div className="space-y-4">
          {/* Meta insight */}
          {suggestions.meta_insight && (
            <div className="card p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-2">
                <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Insight geral da audiência</p>
                  <p className="text-xs text-gray-700">{suggestions.meta_insight}</p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested replies per comment (priority) */}
          {(suggestions.replies || []).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Respostas sugeridas</h4>
              {suggestions.replies.map((r, ci) => (
                <div key={ci} className="card p-4 space-y-3">
                  <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">"{r.comment_excerpt}"</p>
                  <div className="space-y-2">
                    {(r.suggestions || []).map((s, si) => {
                      const replyId = `${ci}-${si}`
                      const originalComment = analyzedComments[r.comment_index - 1]
                      const canPublish = connection && originalComment?.igCommentId
                      return (
                        <div key={si} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {s.path && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{s.path}</span>}
                            <div className="flex items-center gap-1 ml-auto flex-wrap justify-end">
                              <button
                                onClick={() => regenerateReply(ci, si)}
                                disabled={regeneratingId === replyId}
                                className="text-[11px] text-gray-500 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                              >
                                {regeneratingId === replyId ? <><Loader2 size={11} className="animate-spin" /> Gerando...</> : <><RefreshCw size={11} /> Regenerar</>}
                              </button>
                              <button
                                onClick={() => shortenReply(ci, si)}
                                disabled={shorteningId === replyId}
                                className="text-[11px] text-gray-500 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                              >
                                {shorteningId === replyId ? <><Loader2 size={11} className="animate-spin" /> Diminuindo...</> : <><Minimize2 size={11} /> Diminuir</>}
                              </button>
                              <button
                                onClick={() => copyReply(replyId, s.reply)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                              >
                                {copiedId === replyId ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                              </button>
                              {canPublish && (
                                <button
                                  onClick={() => publishReply(ci, si)}
                                  disabled={publishingId === replyId}
                                  className="text-[11px] text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-pink-100 disabled:opacity-50 transition-colors"
                                >
                                  {publishingId === replyId
                                    ? <><Loader2 size={11} className="animate-spin" /> Publicando...</>
                                    : publishedId === replyId
                                      ? <><Check size={11} /> Publicado</>
                                      : <><Send size={11} /> Publicar no Instagram</>
                                  }
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">{s.reply}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pain profiles */}
          {(suggestions.pain_profiles || []).map((profile, pi) => (
            <div key={pi} className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      profile.intensity === 'alta' ? 'bg-red-500' :
                      profile.intensity === 'média' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <h4 className="text-sm font-bold text-gray-900">{profile.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {profile.comments_count} comentário{profile.comments_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{profile.description}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  profile.intensity === 'alta' ? 'bg-red-100 text-red-700' :
                  profile.intensity === 'média' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  Dor {profile.intensity}
                </span>
              </div>

              <div className="space-y-2">
                {(profile.content_ideas || []).map((idea, ii) => (
                  <div key={ii} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lightbulb size={13} className="text-indigo-500" />
                          <span className="text-sm font-semibold text-gray-900">{idea.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{idea.format}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveIdea(idea, profile.name)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Plus size={12} /> Salvar
                      </button>
                    </div>
                    {idea.hook && (
                      <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Gancho:</span> "{idea.hook}"</p>
                    )}
                    {idea.angle && (
                      <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Ângulo:</span> {idea.angle}</p>
                    )}
                    {idea.why && (
                      <p className="text-xs text-gray-500 italic">{idea.why}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instagram post picker */}
      <Modal open={igModalOpen} onClose={() => setIgModalOpen(false)} title="Puxar comentários de um post">
        {igPostsLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-pink-400" />
          </div>
        )}
        {igPostsError && <p className="text-xs text-red-500 mb-3">{igPostsError}</p>}
        {igPosts && igPosts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum post encontrado nessa conta.</p>
        )}
        {igPosts && igPosts.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {igPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => pickIgPost(post)}
                disabled={igCommentsLoadingFor === post.id}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group border border-transparent hover:border-pink-300 transition-colors disabled:opacity-50"
                title={post.caption?.slice(0, 80)}
              >
                {post.thumbnailUrl
                  ? <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300"><Instagram size={20} /></div>
                }
                {igCommentsLoadingFor === post.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
