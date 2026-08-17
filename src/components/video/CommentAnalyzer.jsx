import { useState, useRef } from 'react'
import { Lightbulb, Sparkles, Zap, Plus, X, Upload, MessageSquare, Loader2, Info, Copy, Check } from 'lucide-react'
import useStore from '../../store/useStore'
import { LS_KEY } from './constants'

export default function CommentAnalyzer() {
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [error, setError] = useState('')
  const [replyContext, setReplyContext] = useState('')
  const [responsePaths, setResponsePaths] = useState('')
  const [generatedReply, setGeneratedReply] = useState('')
  const [generatingReply, setGeneratingReply] = useState(false)
  const [copied, setCopied] = useState(false)
  const addIdea = useStore(s => s.addIdea)
  const brandVoice = useStore(s => s.brandVoice)
  const fileRef = useRef(null)

  const generateReply = async () => {
    if (!replyContext.trim()) { setError('Preencha o contexto do comentário que você quer responder'); return }
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro'); return }

    setGeneratingReply(true)
    setError('')
    setGeneratedReply('')
    setCopied(false)
    try {
      const voiceContext = brandVoice?.prompt ? `\n\nVOZ DO CRIADOR:\n${brandVoice.prompt}` : ''
      const pathsList = responsePaths.split('\n').map(p => p.trim()).filter(Boolean)
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
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Você é um especialista em criar respostas autênticas para comentários em redes sociais.${voiceContext}

CONTEXTO:
${replyContext.trim()}
${pathsList.length ? `\nCAMINHOS DE RESPOSTA DESEJADOS:\n${pathsList.map(p => `- ${p}`).join('\n')}\n` : ''}
Escreva UMA resposta ao comentário indicado no contexto acima. A resposta deve ser curta, natural e, se houver caminhos de resposta desejados, alinhada a eles. Responda APENAS com o texto da resposta, sem aspas, sem markdown, sem explicações.`
          }]
        })
      })
      const data = await resp.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      setGeneratedReply(text.trim())
    } catch (e) { setError(e.message) }
    finally { setGeneratingReply(false) }
  }

  const copyReply = () => {
    navigator.clipboard.writeText(generatedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addComment = () => {
    if (!commentText.trim()) return
    setComments(prev => [...prev, { id: Date.now(), text: commentText.trim(), source: 'text' }])
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
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Extraia TODOS os comentários visíveis nesta imagem. Retorne APENAS um JSON array de strings, cada string sendo um comentário completo. Exemplo: ["comentário 1", "comentário 2"]. Se não houver comentários, retorne []. Sem markdown, sem explicação.' }
              ]
            }]
          })
        })
        const data = await resp.json()
        const text = data.content?.find(b => b.type === 'text')?.text || '[]'
        try {
          const clean = text.replace(/```json\n?|\n?```/g, '').trim()
          const extracted = JSON.parse(clean)
          if (Array.isArray(extracted)) {
            setComments(prev => [...prev, ...extracted.map(c => ({ id: Date.now() + Math.random(), text: c, source: 'image' }))])
          }
        } catch { setComments(prev => [...prev, { id: Date.now(), text: text, source: 'image' }]) }
      }
    } catch (e) { setError(e.message) }
    finally { setAnalyzing(false) }
    if (fileRef.current) fileRef.current.value = ''
  }

  const analyzeComments = async () => {
    if (!comments.length) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro'); return }

    setAnalyzing(true)
    setError('')
    setSuggestions(null)
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
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Você é um estrategista de conteúdo especializado em transformar dores e dúvidas reais da audiência em conteúdos de alto impacto.
${voiceContext}

COMENTÁRIOS DA AUDIÊNCIA:
${comments.map((c, i) => `${i + 1}. "${c.text}"`).join('\n')}

Analise esses comentários e identifique:
1. Os PERFIS DE DOR (agrupamento de problemas/frustrações similares)
2. Para CADA perfil de dor, sugira 2-3 conteúdos que resolvam, eduquem ou conectem com essa pessoa

Responda APENAS com JSON válido, sem markdown:
{
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
      const data = await resp.json()
      const text = data.content?.find(b => b.type === 'text')?.text || '{}'
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      setSuggestions(JSON.parse(clean))
    } catch (e) { setError(e.message) }
    finally { setAnalyzing(false) }
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

      {/* Reply context */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Info size={13} className="text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contexto e caminhos de resposta (opcional)</h4>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Contexto dos comentários</label>
          <textarea
            value={replyContext}
            onChange={(e) => setReplyContext(e.target.value)}
            placeholder="Cole aqui o contexto do vídeo e o comentário que você quer responder..."
            rows={6}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Caminhos de resposta desejados (um por linha)</label>
          <textarea
            value={responsePaths}
            onChange={(e) => setResponsePaths(e.target.value)}
            placeholder="educativa"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
        </div>

        <button
          onClick={generateReply}
          disabled={generatingReply || !replyContext.trim()}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {generatingReply ? (
            <><Loader2 size={16} className="animate-spin" /> Gerando resposta...</>
          ) : (
            <><Sparkles size={16} /> Gerar resposta</>
          )}
        </button>

        {generatedReply && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Resposta gerada</p>
              <button
                onClick={copyReply}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0"
              >
                {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
              </button>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{generatedReply}</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Adicionar comentários</h4>
        </div>

        {/* Upload image */}
        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-indigo-200 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
          >
            <Upload size={16} />
            {analyzing ? 'Extraindo comentários...' : 'Upload de print (imagem)'}
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

        {/* Manual text input */}
        <div className="flex gap-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Ou cole um comentário manualmente..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
          <button
            onClick={addComment}
            disabled={!commentText.trim()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="card p-5 space-y-3">
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
                <MessageSquare size={13} className={`mt-0.5 shrink-0 ${c.source === 'image' ? 'text-indigo-400' : 'text-gray-400'}`} />
                <p className="text-xs text-gray-700 flex-1 leading-relaxed">{c.text}</p>
                <button
                  onClick={() => removeComment(c.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Analyze button */}
          <button
            onClick={analyzeComments}
            disabled={analyzing}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analisando dores...</>
            ) : (
              <><Sparkles size={16} /> Analisar e Sugerir Conteúdos</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
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
    </div>
  )
}
