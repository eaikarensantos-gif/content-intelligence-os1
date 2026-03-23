import { useState, useMemo } from 'react'
import {
  Loader2, Sparkles, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Copy, Save, BarChart2, TrendingUp, Zap, Eye, Heart, MessageSquare,
  Share2, Bookmark, ArrowRight, RotateCcw, Wand2, FileText, Layers,
  Target, Brain, AlertCircle, Check, Image as ImageIcon, Type, User, Settings,
} from 'lucide-react'
import useStore from '../../store/useStore'

const LS_KEY = 'cio-anthropic-key'

// ─── Carousel templates ──────────────────────────────────────────────────────
const CAROUSEL_TYPES = [
  { id: 'educational', label: 'Educativo', emoji: '📚', desc: 'Ensina algo passo a passo', slides: '7-10' },
  { id: 'storytelling', label: 'Storytelling', emoji: '📖', desc: 'Conta uma história que conecta', slides: '8-12' },
  { id: 'listicle', label: 'Lista / Top X', emoji: '📋', desc: 'X dicas, erros, ferramentas...', slides: '7-10' },
  { id: 'myth-busting', label: 'Mitos vs Verdades', emoji: '🔥', desc: 'Derruba crenças limitantes', slides: '6-8' },
  { id: 'before-after', label: 'Antes x Depois', emoji: '🔄', desc: 'Transformação com prova', slides: '6-8' },
  { id: 'controversial', label: 'Opinião Polêmica', emoji: '💣', desc: 'Posicionamento forte que gera debate', slides: '5-7' },
  { id: 'framework', label: 'Framework / Método', emoji: '🧩', desc: 'Apresenta um método exclusivo', slides: '7-10' },
  { id: 'case-study', label: 'Estudo de Caso', emoji: '🔬', desc: 'Resultado real com análise', slides: '8-10' },
]

const TONES = [
  { id: 'autoridade', label: 'Autoridade', emoji: '👑' },
  { id: 'empático', label: 'Empático', emoji: '🤝' },
  { id: 'provocativo', label: 'Provocativo', emoji: '🔥' },
  { id: 'inspirador', label: 'Inspirador', emoji: '✨' },
  { id: 'humor', label: 'Humor', emoji: '😄' },
  { id: 'didático', label: 'Didático', emoji: '📐' },
]

// ─── AI call ─────────────────────────────────────────────────────────────────
async function generateCarouselWithAI(apiKey, { type, topic, tone, topCarousels, trendContext, niche, nicheContext, customInstructions }) {
  const carouselInspo = topCarousels?.length
    ? `\n\nCARROSSÉIS DE ALTA PERFORMANCE DO CRIADOR (use como inspiração de estrutura e abordagem):\n${topCarousels.map((c, i) => `${i + 1}. "${c.description?.slice(0, 120)}..." — Eng: ${c.engagement_rate ? (c.engagement_rate * 100).toFixed(1) + '%' : 'N/A'}, Saves: ${c.saves || 0}, Shares: ${c.shares || 0}`).join('\n')}`
    : ''

  const trendInspo = trendContext
    ? `\n\nTENDÊNCIAS E PADRÕES DETECTADOS NO NICHO:\n${trendContext}`
    : ''

  const prompt = `Você é o maior especialista em carrosseis virais do Instagram e LinkedIn no Brasil. Crie um roteiro COMPLETO de carrossel com POTENCIAL VIRAL.

CONTEXTO:
- Tipo: ${CAROUSEL_TYPES.find(t => t.id === type)?.label || type}
- Tema: ${topic}
- Tom: ${tone}
- Nicho do criador: ${niche || 'não especificado'}
${nicheContext ? `\nPERFIL COMPLETO DO CRIADOR:\n${nicheContext}` : ''}
${customInstructions ? `- Instruções extras: ${customInstructions}` : ''}
${carouselInspo}
${trendInspo}

REGRAS CRÍTICAS:
1. O SLIDE 1 (capa) é O MAIS IMPORTANTE — deve ter um hook IRRESISTÍVEL que gere salvamento e compartilhamento
2. Use técnicas comprovadas de retenção: loops abertos, micro-cliffhangers entre slides, padrão de interrupção
3. Cada slide deve ter um PROPÓSITO claro e progredir a narrativa
4. O penúltimo slide deve criar URGÊNCIA/ESCASSEZ/FOMO
5. O último slide deve ter CTA forte com call-to-action duplo (salvar + compartilhar)
6. Adapte ao ${tone} sem perder autoridade
7. Use dados, números e exemplos específicos — evite genérico
8. Cada slide: máximo 3-4 linhas de texto principal + 1 linha de subtexto
9. Indique elementos visuais sugeridos para cada slide (ícone, imagem, cor destaque)
10. Tudo em português brasileiro coloquial e profissional

Responda APENAS com JSON válido:
{
  "title": "título do carrossel",
  "hook": "frase de capa (slide 1) — a mais impactante possível",
  "concept": "conceito geral do carrossel em 1-2 frases",
  "estimated_saves": "potencial de salvamento (baixo/médio/alto/viral)",
  "estimated_shares": "potencial de compartilhamento (baixo/médio/alto/viral)",
  "why_viral": "por que esse carrossel tem potencial viral — explicação estratégica",
  "target_audience": "público-alvo específico",
  "best_time": "melhor horário para postar",
  "slides": [
    {
      "number": 1,
      "type": "capa",
      "headline": "texto principal do slide (gancho irresistível)",
      "subtext": "subtexto ou complemento",
      "visual_suggestion": "sugestão visual (cor de fundo, ícone, elemento gráfico)",
      "technique": "técnica usada (ex: curiosity gap, pattern interrupt, etc)",
      "notes": "nota estratégica do porquê esse slide funciona"
    }
  ],
  "caption": "legenda completa para o post (com hashtags estratégicas)",
  "cta_comment": "comentário fixado sugerido para engajamento",
  "alternative_hooks": ["hook alternativo 1", "hook alternativo 2", "hook alternativo 3"]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: 'Você é um expert em carrosseis virais. Responda APENAS com JSON válido, sem markdown, sem code blocks.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(response)
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta da IA não contém JSON válido')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ─── Slide editor card ───────────────────────────────────────────────────────
function SlideCard({ slide, index, total, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(true)
  const typeColors = {
    capa: 'from-orange-500 to-red-500',
    conteúdo: 'from-blue-500 to-blue-600',
    conteudo: 'from-blue-500 to-blue-600',
    transição: 'from-purple-500 to-purple-600',
    transicao: 'from-purple-500 to-purple-600',
    cta: 'from-emerald-500 to-emerald-600',
    encerramento: 'from-emerald-500 to-emerald-600',
  }
  const gradient = typeColors[slide.type?.toLowerCase()] || 'from-gray-500 to-gray-600'

  return (
    <div className="card border-l-4 border-l-orange-400 hover:border-l-orange-500 transition-all">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{slide.type || 'Slide'}</span>
            {slide.technique && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">{slide.technique}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate">{slide.headline || `Slide ${index + 1}`}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {index > 0 && <button onClick={(e) => { e.stopPropagation(); onMoveUp() }} className="p-1 hover:bg-gray-100 rounded"><ChevronUp size={14} className="text-gray-400" /></button>}
          {index < total - 1 && <button onClick={(e) => { e.stopPropagation(); onMoveDown() }} className="p-1 hover:bg-gray-100 rounded"><ChevronDown size={14} className="text-gray-400" /></button>}
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-300 hover:text-red-500" /></button>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Texto Principal</label>
            <textarea
              value={slide.headline || ''}
              onChange={(e) => onUpdate({ headline: e.target.value })}
              className="input mt-1 text-sm min-h-[60px]"
              rows={2}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Subtexto</label>
            <input
              value={slide.subtext || ''}
              onChange={(e) => onUpdate({ subtext: e.target.value })}
              className="input mt-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Visual Sugerido</label>
              <input
                value={slide.visual_suggestion || ''}
                onChange={(e) => onUpdate({ visual_suggestion: e.target.value })}
                className="input mt-1 text-[11px]"
                placeholder="Ex: fundo escuro, ícone de..."
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Técnica</label>
              <input
                value={slide.technique || ''}
                onChange={(e) => onUpdate({ technique: e.target.value })}
                className="input mt-1 text-[11px]"
                placeholder="Ex: curiosity gap, cliffhanger"
              />
            </div>
          </div>
          {slide.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
              <p className="text-[10px] font-semibold text-amber-600 mb-0.5">💡 Estratégia</p>
              <p className="text-[11px] text-gray-600">{slide.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Mini preview ────────────────────────────────────────────────────────────
function SlidePreview({ slides }) {
  const [current, setCurrent] = useState(0)
  const slide = slides[current]
  if (!slide) return null

  return (
    <div className="space-y-3">
      <div className="aspect-[4/5] max-w-[280px] mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-3 right-3 text-[10px] text-white/40 font-mono">{current + 1}/{slides.length}</div>
        {current === 0 && <div className="absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold">CAPA</div>}
        <p className="text-white font-bold text-base leading-snug mb-2">{slide.headline || 'Texto do slide...'}</p>
        {slide.subtext && <p className="text-white/60 text-xs">{slide.subtext}</p>}
        {slide.visual_suggestion && (
          <div className="absolute bottom-3 left-3 right-3 text-[9px] text-white/30 text-center truncate">
            🎨 {slide.visual_suggestion}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all">
          <ChevronUp size={16} className="text-gray-500 rotate-[-90deg]" />
        </button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-orange-500 w-5' : 'bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>
        <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} disabled={current === slides.length - 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all">
          <ChevronDown size={16} className="text-gray-500 rotate-[-90deg]" />
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
// ─── Profile setup component ─────────────────────────────────────────────────
function ProfileSetup({ profile, onSave }) {
  const [form, setForm] = useState({
    niche: profile.niche || '',
    subNiches: profile.subNiches?.join(', ') || '',
    targetAudience: profile.targetAudience || '',
    tone: profile.tone || '',
    platforms: profile.platforms || [],
    description: profile.description || '',
  })

  const PLATFORM_OPTIONS = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Twitter/X']

  const togglePlatform = (p) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }))
  }

  const handleSubmit = () => {
    if (!form.niche.trim()) return
    onSave({
      niche: form.niche.trim(),
      subNiches: form.subNiches.split(',').map((s) => s.trim()).filter(Boolean),
      targetAudience: form.targetAudience.trim(),
      tone: form.tone.trim(),
      platforms: form.platforms,
      description: form.description.trim(),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-md shadow-orange-200">
          <User size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Configure seu Perfil de Criador</h2>
          <p className="text-xs text-gray-400">Isso calibra toda a inteligencia do Carousel Studio para o SEU nicho</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Nicho principal *</label>
          <input
            value={form.niche}
            onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
            placeholder='Ex: "Carreira em Tecnologia", "Marketing Digital", "Fitness para mulheres 30+"'
            className="input w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Sub-nichos <span className="font-normal text-gray-400">(separados por virgula)</span></label>
          <input
            value={form.subNiches}
            onChange={(e) => setForm((f) => ({ ...f, subNiches: e.target.value }))}
            placeholder='Ex: "lideranca feminina, transicao de carreira, marca pessoal, IA no trabalho"'
            className="input w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Publico-alvo</label>
          <input
            value={form.targetAudience}
            onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
            placeholder='Ex: "Profissionais de tech 25-40, buscando crescer na carreira"'
            className="input w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Tom de voz predominante</label>
          <input
            value={form.tone}
            onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
            placeholder='Ex: "Autoridade com empatia, direto ao ponto, leve mas profissional"'
            className="input w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Plataformas</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  form.platforms.includes(p)
                    ? 'border-orange-300 bg-orange-50 text-orange-700 font-semibold'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Descricao do posicionamento <span className="font-normal text-gray-400">(opcional)</span></label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder='Ex: "Ajudo profissionais de tecnologia a crescerem na carreira com estrategias praticas de marca pessoal e lideranca"'
            className="input w-full text-sm min-h-[70px]"
            rows={2}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.niche.trim()}
          className="btn-primary w-full py-3 text-sm justify-center"
        >
          <Check size={16} /> Salvar Perfil e Comecar
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function CarouselStudio() {
  const metrics = useStore((s) => s.metrics)
  const trendResults = useStore((s) => s.trendResults)
  const addIdea = useStore((s) => s.addIdea)
  const creatorProfile = useStore((s) => s.creatorProfile)
  const setCreatorProfile = useStore((s) => s.setCreatorProfile)

  const [step, setStep] = useState('config') // config | generating | editor
  const [carouselType, setCarouselType] = useState('')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('autoridade')
  const [customInstructions, setCustomInstructions] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savedToHub, setSavedToHub] = useState(false)
  const [editCaption, setEditCaption] = useState(false)
  const [history, setHistory] = useState([])
  const [editingProfile, setEditingProfile] = useState(false)

  // Show profile setup if no niche configured
  const hasProfile = creatorProfile?.niche?.trim()

  // Get top-performing carousels from analytics
  const topCarousels = useMemo(() => {
    return metrics
      .filter((m) => m.post_type === 'carousel' || m.post_type === 'carrossel')
      .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
      .slice(0, 5)
  }, [metrics])

  // Build trend context from trendResults (only if same niche)
  const trendContext = useMemo(() => {
    if (!trendResults) return ''
    const parts = []
    if (trendResults.patterns?.recurring_hooks?.length) {
      parts.push('Ganchos que funcionam: ' + trendResults.patterns.recurring_hooks.slice(0, 3).map(h => `"${h.example}"`).join(', '))
    }
    if (trendResults.patterns?.narrative_styles?.length) {
      parts.push('Estilos narrativos top: ' + trendResults.patterns.narrative_styles.slice(0, 3).map(s => s.style).join(', '))
    }
    if (trendResults.content_gaps?.length) {
      parts.push('Lacunas de conteúdo: ' + trendResults.content_gaps.slice(0, 3).map(g => g.gap).join(', '))
    }
    if (trendResults.patterns?.emerging_topics?.length) {
      parts.push('Subtópicos emergentes: ' + trendResults.patterns.emerging_topics.slice(0, 4).join(', '))
    }
    return parts.join('\n')
  }, [trendResults])

  // Use creatorProfile as niche source, fallback to trendResults
  const niche = creatorProfile?.niche || trendResults?.topic || ''
  const nicheContext = useMemo(() => {
    if (!creatorProfile?.niche) return ''
    const parts = [`Nicho: ${creatorProfile.niche}`]
    if (creatorProfile.subNiches?.length) parts.push(`Sub-nichos: ${creatorProfile.subNiches.join(', ')}`)
    if (creatorProfile.targetAudience) parts.push(`Publico-alvo: ${creatorProfile.targetAudience}`)
    if (creatorProfile.tone) parts.push(`Tom de voz: ${creatorProfile.tone}`)
    if (creatorProfile.description) parts.push(`Posicionamento: ${creatorProfile.description}`)
    if (creatorProfile.platforms?.length) parts.push(`Plataformas: ${creatorProfile.platforms.join(', ')}`)
    return parts.join('\n')
  }, [creatorProfile])

  // Profile setup or editing
  if (!hasProfile || editingProfile) {
    return (
      <ProfileSetup
        profile={creatorProfile || {}}
        onSave={(p) => {
          setCreatorProfile(p)
          setEditingProfile(false)
        }}
      />
    )
  }

  const handleGenerate = async () => {
    if (!topic.trim() || !carouselType) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua chave Anthropic primeiro.'); return }

    setLoading(true)
    setError(null)
    setStep('generating')

    try {
      const data = await generateCarouselWithAI(apiKey, {
        type: carouselType,
        topic: topic.trim(),
        tone,
        topCarousels,
        trendContext,
        niche,
        nicheContext,
        customInstructions: customInstructions.trim(),
      })
      setResult(data)
      setStep('editor')
    } catch (e) {
      setError(e.message || 'Erro ao gerar carrossel')
      setStep('config')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSlide = (idx, updates) => {
    setResult((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
    }))
  }

  const handleDeleteSlide = (idx) => {
    setResult((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, number: i + 1 })),
    }))
  }

  const handleAddSlide = () => {
    setResult((prev) => ({
      ...prev,
      slides: [...prev.slides, {
        number: prev.slides.length + 1,
        type: 'conteúdo',
        headline: '',
        subtext: '',
        visual_suggestion: '',
        technique: '',
        notes: '',
      }],
    }))
  }

  const handleMoveSlide = (idx, dir) => {
    setResult((prev) => {
      const arr = [...prev.slides]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...prev, slides: arr.map((s, i) => ({ ...s, number: i + 1 })) }
    })
  }

  const handleSaveToHub = () => {
    if (!result) return
    addIdea({
      title: result.title,
      description: result.concept,
      format: 'carousel',
      platform: 'instagram',
      hook_type: result.slides?.[0]?.technique || 'curiosity',
      priority: result.estimated_saves === 'viral' ? 'high' : 'medium',
      status: 'ready',
      tags: ['carrossel', 'roteiro-completo'],
      script: result.slides.map((s, i) => `[Slide ${i + 1} — ${s.type || 'conteúdo'}]\n${s.headline}${s.subtext ? '\n' + s.subtext : ''}`).join('\n\n'),
      caption: result.caption || '',
      cta: result.cta_comment || '',
    })
    setSavedToHub(true)
  }

  const handleSaveToHistory = () => {
    if (!result) return
    const entry = { ...result, saved_at: new Date().toISOString(), type: carouselType, topic, tone }
    setHistory((prev) => [entry, ...prev])
  }

  const handleCopyScript = () => {
    if (!result) return
    const text = result.slides.map((s, i) =>
      `📌 SLIDE ${i + 1} (${s.type || 'conteúdo'})\n${s.headline}${s.subtext ? '\n→ ' + s.subtext : ''}${s.visual_suggestion ? '\n🎨 ' + s.visual_suggestion : ''}`
    ).join('\n\n') + '\n\n📝 LEGENDA:\n' + (result.caption || '') + '\n\n💬 COMENTÁRIO FIXADO:\n' + (result.cta_comment || '')
    navigator.clipboard.writeText(text)
  }

  const handleRegenerate = () => {
    setResult(null)
    setSavedToHub(false)
    setStep('config')
  }

  const hasApiKey = !!localStorage.getItem(LS_KEY)

  // ── Config step ────────────────────────────────────────────────────────────
  if (step === 'config' || step === 'generating') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-md shadow-orange-200">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Carousel Studio</h2>
            <p className="text-xs text-gray-400">Roteiros de carrossel com potencial viral — inspirados nos seus dados + tendências</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setEditingProfile(true)}
              className="flex items-center gap-1 text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full hover:bg-gray-200 transition-all"
              title="Editar perfil do criador"
            >
              <Settings size={9} /> {creatorProfile.niche}
            </button>
            {hasApiKey ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Brain size={9} /> IA Ativa
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                <AlertCircle size={9} /> Chave necessária
              </span>
            )}
          </div>
        </div>

        {/* Creator profile banner */}
        {creatorProfile?.niche && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 space-y-1">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <User size={13} className="text-orange-500" /> Perfil calibrado
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white border border-orange-100 text-orange-700 font-medium">
                {creatorProfile.niche}
              </span>
              {creatorProfile.subNiches?.map((s, i) => (
                <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-white border border-gray-100 text-gray-600 font-medium">
                  {s}
                </span>
              ))}
              {creatorProfile.targetAudience && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-white border border-blue-100 text-blue-600 font-medium">
                  {creatorProfile.targetAudience}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Data insights banner */}
        {(topCarousels.length > 0 || trendResults) && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 space-y-2">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <BarChart2 size={13} className="text-blue-500" /> Dados que serão usados como inspiração
            </p>
            <div className="flex flex-wrap gap-2">
              {topCarousels.length > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-white border border-blue-100 text-blue-700 font-medium">
                  📊 {topCarousels.length} carrosseis top do seu Analytics
                </span>
              )}
              {trendResults && (
                <>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-white border border-purple-100 text-purple-700 font-medium">
                    🔥 Tendências de "{trendResults.topic}"
                  </span>
                  {trendResults.patterns?.recurring_hooks?.length > 0 && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-white border border-orange-100 text-orange-700 font-medium">
                      🎣 {trendResults.patterns.recurring_hooks.length} ganchos mapeados
                    </span>
                  )}
                  {trendResults.content_gaps?.length > 0 && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-white border border-emerald-100 text-emerald-700 font-medium">
                      🎯 {trendResults.content_gaps.length} lacunas detectadas
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Type selection */}
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">1. Tipo de carrossel</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CAROUSEL_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setCarouselType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  carouselType === t.id
                    ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <p className="text-xs font-semibold text-gray-800 mt-1">{t.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                <p className="text-[9px] text-gray-300 mt-1">{t.slides} slides</p>
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">2. Tema do carrossel</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder='Ex: "5 erros que impedem promoção na tech", "Como usei IA pra triplicar minha produtividade"'
            className="input w-full"
          />
        </div>

        {/* Tone */}
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">3. Tom</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  tone === t.id
                    ? 'border-orange-300 bg-orange-50 text-orange-700 font-semibold'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom instructions */}
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">4. Instruções extras <span className="font-normal text-gray-400">(opcional)</span></label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Ex: Foque em profissionais 25-35, use dados do mercado brasileiro, mencione a metodologia XYZ..."
            className="input w-full text-sm min-h-[70px]"
            rows={2}
          />
        </div>

        {/* Generate button */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim() || !carouselType || !hasApiKey}
          className="btn-primary w-full py-3 text-sm justify-center"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Criando roteiro com IA...</span>
            </>
          ) : (
            <>
              <Wand2 size={16} />
              <span>Gerar Roteiro de Carrossel</span>
            </>
          )}
        </button>

        {/* Loading state */}
        {loading && (
          <div className="card p-10 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
              <Layers size={20} className="absolute inset-0 m-auto text-orange-500 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold text-gray-800">Criando roteiro viral...</p>
              <p className="text-xs text-gray-400">Analisando seus dados, tendências e criando cada slide com estratégia</p>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <RotateCcw size={12} /> Roteiros anteriores ({history.length})
            </h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setResult(h); setStep('editor'); setSavedToHub(false) }}
                  className="w-full text-left card p-3 hover:border-orange-200 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800 truncate">{h.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{h.slides?.length} slides · {CAROUSEL_TYPES.find(t => t.id === h.type)?.label} · {new Date(h.saved_at).toLocaleDateString('pt-BR')}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Editor step ────────────────────────────────────────────────────────────
  if (step === 'editor' && result) {
    return (
      <div className="space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleRegenerate} className="btn-ghost text-xs border border-gray-200">
              <RotateCcw size={12} /> Novo
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-900">{result.title}</h2>
              <p className="text-xs text-gray-400">{result.slides?.length} slides · {result.target_audience}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyScript} className="btn-ghost text-xs border border-gray-200">
              <Copy size={12} /> Copiar
            </button>
            <button onClick={handleSaveToHistory} className="btn-ghost text-xs border border-blue-200 text-blue-700 hover:bg-blue-50">
              <Save size={12} /> Salvar
            </button>
            <button
              onClick={handleSaveToHub}
              disabled={savedToHub}
              className={savedToHub ? 'flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-3 py-1.5' : 'btn-primary text-xs'}
            >
              {savedToHub ? <><Check size={12} /> No Hub</> : <><Plus size={12} /> Hub de Ideias</>}
            </button>
          </div>
        </div>

        {/* Metrics cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Potencial Saves', value: result.estimated_saves, icon: Bookmark, color: 'text-orange-500' },
            { label: 'Potencial Shares', value: result.estimated_shares, icon: Share2, color: 'text-blue-500' },
            { label: 'Melhor Horário', value: result.best_time, icon: Eye, color: 'text-purple-500' },
            { label: 'Slides', value: result.slides?.length, icon: Layers, color: 'text-emerald-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className={color} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase">{label}</span>
              </div>
              <p className="text-sm font-bold text-gray-800 capitalize">{value || '—'}</p>
            </div>
          ))}
        </div>

        {/* Why viral */}
        {result.why_viral && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
            <p className="text-[10px] font-semibold text-orange-600 mb-1 flex items-center gap-1">
              <Zap size={10} /> Por que tem potencial viral
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">{result.why_viral}</p>
          </div>
        )}

        {/* Main layout: slides + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Slides editor */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={14} className="text-orange-500" /> Roteiro ({result.slides?.length} slides)
              </h3>
              <button onClick={handleAddSlide} className="btn-ghost text-xs border border-gray-200">
                <Plus size={12} /> Adicionar Slide
              </button>
            </div>
            <div className="space-y-2">
              {(result.slides || []).map((slide, idx) => (
                <SlideCard
                  key={idx}
                  slide={slide}
                  index={idx}
                  total={result.slides.length}
                  onUpdate={(u) => handleUpdateSlide(idx, u)}
                  onDelete={() => handleDeleteSlide(idx)}
                  onMoveUp={() => handleMoveSlide(idx, -1)}
                  onMoveDown={() => handleMoveSlide(idx, 1)}
                />
              ))}
            </div>
          </div>

          {/* Preview + extras */}
          <div className="space-y-5">
            <div className="card p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Eye size={12} /> Preview
              </h4>
              <SlidePreview slides={result.slides || []} />
            </div>

            {/* Alternative hooks */}
            {result.alternative_hooks?.length > 0 && (
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Target size={12} className="text-purple-500" /> Hooks Alternativos
                </h4>
                <div className="space-y-2">
                  {result.alternative_hooks.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleUpdateSlide(0, { headline: h })}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-xs text-gray-700"
                    >
                      <span className="text-[10px] text-gray-400 font-semibold">Opção {i + 1}:</span>
                      <p className="font-medium mt-0.5">"{h}"</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caption + CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Type size={12} className="text-blue-500" /> Legenda
              </h4>
              <button onClick={() => setEditCaption(!editCaption)} className="text-[10px] text-orange-600 font-medium">
                {editCaption ? 'Concluir' : 'Editar'}
              </button>
            </div>
            {editCaption ? (
              <textarea
                value={result.caption || ''}
                onChange={(e) => setResult((prev) => ({ ...prev, caption: e.target.value }))}
                className="input text-xs min-h-[120px] w-full"
                rows={5}
              />
            ) : (
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{result.caption || 'Sem legenda gerada'}</p>
            )}
          </div>
          <div className="card p-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-emerald-500" /> Comentário Fixado (CTA)
            </h4>
            <textarea
              value={result.cta_comment || ''}
              onChange={(e) => setResult((prev) => ({ ...prev, cta_comment: e.target.value }))}
              className="input text-xs min-h-[80px] w-full"
              rows={3}
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}
