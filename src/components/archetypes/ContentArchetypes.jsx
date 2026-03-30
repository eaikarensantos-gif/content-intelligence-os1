import { useState, useMemo } from 'react'
import {
  Shapes, Sparkles, RefreshCw, Plus, Trash2, Check, Copy, Save,
  ChevronDown, ChevronUp, AlertCircle, Layers, Zap, BookOpen,
  Target, Eye, MessageCircle, ArrowRight, Combine, Lightbulb,
  Search, X, Edit3, Star, Flame, Hash, Globe, Send, ExternalLink, CheckCircle2,
} from 'lucide-react'
import useStore from '../../store/useStore'

const LS_KEY = 'cio-anthropic-key'

const TABS = [
  { id: 'benchmark', label: 'Benchmark', icon: Globe },
  { id: 'extract', label: 'Extrair Padrões', icon: Search },
  { id: 'library', label: 'Biblioteca', icon: BookOpen },
  { id: 'generate', label: 'Gerar Conteúdo', icon: Sparkles },
  { id: 'hybridize', label: 'Hibridizar', icon: Combine },
]

const WEBHOOK_KEY = 'cio-benchmark-webhook-url'

const PHASES = [
  'Analisando referências de criadores...',
  'Identificando pilares de conteúdo...',
  'Mapeando estruturas de gancho...',
  'Extraindo padrões de engajamento...',
  'Classificando formatos e tons...',
  'Construindo arquétipos...',
]

const GEN_PHASES = [
  'Analisando o arquétipo selecionado...',
  'Construindo variações de gancho...',
  'Criando estruturas narrativas...',
  'Gerando ideias de conteúdo...',
  'Refinando títulos e hooks...',
]

// ── API helpers ────────────────────────────────────────────────────────────────

async function callClaude(apiKey, systemPrompt, userPrompt, maxTokens = 5000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const { showApiError } = await import('../../utils/apiError.js')
    showApiError(res.status, err)
    throw new Error(err?.error?.message || `API ${res.status}`)
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  const cleaned = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(cleaned)
}

// ── Prompts ────────────────────────────────────────────────────────────────────

const SYSTEM = `Você é um analista de conteúdo digital de elite com conhecimento profundo sobre criadores de conteúdo reais — brasileiros e internacionais — em todas as plataformas (Instagram, YouTube, TikTok, LinkedIn, Twitter/X).

REGRA FUNDAMENTAL: Você DEVE analisar os criadores REAIS mencionados pelo usuário. Use seu conhecimento de treinamento sobre esses criadores para identificar padrões REAIS e VERIFICÁVEIS do conteúdo deles.

Quando o usuário mencionar um criador (por nome, @handle, ou descrição), você deve:
1. Identificar QUEM é esse criador (nome, plataforma, nicho, tamanho)
2. Analisar os padrões REAIS de conteúdo que esse criador usa
3. Citar EXEMPLOS REAIS de posts/vídeos conhecidos desse criador
4. Extrair as fórmulas REAIS que fizeram esse conteúdo funcionar

NUNCA invente criadores genéricos. NUNCA crie arquétipos abstratos desconectados das referências. Cada arquétipo deve ser claramente rastreável ao criador mencionado.

Escreva em português brasileiro natural. Responda SOMENTE com JSON válido.`

function buildExtractPrompt(input, niche, platform) {
  return `Analise os criadores e referências abaixo e extraia os ARQUÉTIPOS DE CONTEÚDO REAIS — os modelos por trás do sucesso deles.

REFERÊNCIAS DO USUÁRIO:
${input}
${niche ? `\nNICHO/ÁREA: ${niche}` : ''}
${platform ? `\nPLATAFORMA PRINCIPAL: ${platform}` : ''}

INSTRUÇÕES CRÍTICAS:
1. Para cada criador mencionado, identifique os padrões REAIS de conteúdo que ele usa
2. Cite EXEMPLOS CONCRETOS de posts, vídeos ou formatos que esse criador realmente fez
3. A fórmula de gancho deve ser extraída de ganchos REAIS que o criador usou
4. Os exemplos de gancho devem ser baseados em posts REAIS ou no estilo exato do criador
5. Se o usuário mencionou um @handle, identifique o criador e analise seu conteúdo real

Para cada padrão identificado, crie um ARQUÉTIPO com:
1. Nome: baseado no estilo REAL do criador (ex: "O Storytelling Data-Driven do @thiagonigro", "O Provocador Reflexivo do @arthurpetry")
2. Criador de origem: quem inspira este arquétipo (nome real e @handle)
3. Descrição: o que define este padrão no conteúdo REAL do criador
4. Pilar de conteúdo: o tema central deste criador
5. Fórmula de gancho: a estrutura REAL que este criador usa com [variáveis]
6. Exemplos de ganchos: 3 exemplos concretos baseados no estilo REAL do criador
7. Estrutura do conteúdo: passos que este criador REALMENTE segue
8. Tom: como este criador REALMENTE se comunica
9. Estratégia de engajamento: como este criador gera interação
10. Formatos e plataformas onde o criador atua
11. Posts de referência: exemplos de posts REAIS ou típicos deste criador
12. Caso de uso: quando e por que replicar este modelo

Extraia de 2 a 5 arquétipos distintos. Cada um DEVE ser rastreável a um criador real.

Responda SOMENTE com JSON:
{
  "archetypes": [
    {
      "name": "Nome do Arquétipo — baseado no criador real",
      "creator_ref": "@handle ou nome do criador real que inspira este arquétipo",
      "creator_info": "Breve bio: quem é, quantos seguidores tem, qual plataforma principal",
      "description": "O que define este modelo de conteúdo no trabalho REAL do criador...",
      "content_pillar": "O pilar central do conteúdo deste criador",
      "hook_formula": "[Estrutura] + [Variável] — fórmula extraída do criador real",
      "hook_examples": ["Gancho real ou no estilo do criador 1", "Gancho 2", "Gancho 3"],
      "content_structure": ["Passo real 1", "Passo 2", "Passo 3", "Passo 4"],
      "tone": "Descrição do tom REAL de voz deste criador",
      "engagement_strategy": "Como este criador REALMENTE gera engajamento",
      "formats": ["Formato 1", "Formato 2"],
      "reference_posts": ["Exemplo de post real 1", "Exemplo de post real 2"],
      "use_case": "Quando usar este modelo e para qual tipo de conteúdo"
    }
  ]
}`
}

function buildGeneratePrompt(archetype, topic, count) {
  const p = archetype.patterns || archetype
  return `Você tem este ARQUÉTIPO DE CONTEÚDO como modelo — baseado em um criador REAL:

NOME: ${archetype.name}
CRIADOR DE REFERÊNCIA: ${p.creator_ref || 'Não especificado'}
INFO DO CRIADOR: ${p.creator_info || ''}
DESCRIÇÃO: ${archetype.description || p.description || ''}
PILAR: ${p.content_pillar || ''}
FÓRMULA DE GANCHO: ${p.hook_formula || ''}
EXEMPLOS DE GANCHO DO CRIADOR: ${(p.hook_examples || []).join(' | ')}
ESTRUTURA REAL: ${(p.content_structure || []).join(' → ')}
TOM: ${p.tone || ''}
ESTRATÉGIA: ${p.engagement_strategy || ''}
FORMATOS: ${(p.formats || []).join(', ')}
POSTS DE REFERÊNCIA: ${(p.reference_posts || []).join(' | ')}
${topic ? `\nTÓPICO ESPECÍFICO: ${topic}` : ''}

Gere exatamente ${count} ideias de conteúdo que SEGUEM o estilo e padrão REAL deste criador. Cada ideia deve:
- Usar a fórmula de gancho REAL do criador (como ele realmente faz)
- Seguir a estrutura de conteúdo que este criador REALMENTE usa
- Manter o tom REAL do criador — como ele fala, escreve, se comunica
- Ser prática, aplicável e no nível de qualidade do criador original
- Se o tópico for diferente do nicho original, adapte o ESTILO mantendo o modelo
- VARIAR A ENERGIA: nem todas as ideias devem ser pesadas ou pessimistas. Misture ideias reflexivas com provocadoras, leves, curiosas e inspiradoras. Conteúdo bom tem variedade emocional.

REGRAS DE TÍTULOS:
- Máximo 12 palavras — curtos, diretos, impactantes
- Persuasivos sem clickbait
- Devem soar como frase dita numa conversa

Responda SOMENTE com JSON:
{
  "ideas": [
    {
      "title": "Título curto e viral",
      "hook": "Primeira frase usando a fórmula do arquétipo",
      "core_argument": "Argumento central em 2-3 frases",
      "structure": {
        "observation": "O que está acontecendo",
        "tension": "O conflito ou contradição",
        "interpretation": "A leitura do criador",
        "conclusion": "A reflexão final"
      },
      "format": "Formato ideal",
      "platform": "Plataforma ideal",
      "why_now": "Por que esta conversa importa agora"
    }
  ]
}`
}

function buildHybridPrompt(archetypes) {
  const descriptions = archetypes.map((a, i) => {
    const p = a.patterns || a
    return `ARQUÉTIPO ${i + 1}: "${a.name}"
- Criador de referência: ${p.creator_ref || 'N/A'}
- Pilar: ${p.content_pillar || ''}
- Fórmula: ${p.hook_formula || ''}
- Estrutura: ${(p.content_structure || []).join(' → ')}
- Tom: ${p.tone || ''}
- Estratégia: ${p.engagement_strategy || ''}`
  }).join('\n\n')

  return `Combine estes arquétipos (baseados em criadores REAIS) em um HÍBRIDO único:

${descriptions}

Crie um novo arquétipo que:
1. Misture os melhores elementos de cada criador de referência
2. Tenha uma identidade própria — como se fosse um novo criador que aprendeu com todos
3. Resolva limitações de cada estilo individual
4. Seja prático e aplicável — alguém consegue usar amanhã

Responda SOMENTE com JSON:
{
  "hybrid": {
    "name": "Nome criativo do híbrido",
    "description": "O que define esta combinação única",
    "content_pillar": "Pilar central do híbrido",
    "hook_formula": "Nova fórmula combinada com [variáveis]",
    "hook_examples": ["Exemplo 1", "Exemplo 2", "Exemplo 3"],
    "content_structure": ["Passo 1", "Passo 2", "Passo 3", "Passo 4", "Passo 5"],
    "tone": "Tom de voz do híbrido",
    "engagement_strategy": "Estratégia de engajamento combinada",
    "formats": ["Formato 1", "Formato 2"],
    "use_case": "Quando usar este híbrido"
  }
}`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ArchetypeCard({ arch, onDelete, onGenerate, onSelect, selected, selectable, compact }) {
  const [open, setOpen] = useState(!compact)
  const p = arch.patterns || arch

  return (
    <div className={`bg-white rounded-xl border ${selected ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'} p-4 transition-all ${selectable ? 'cursor-pointer hover:border-orange-300' : ''}`}
      onClick={selectable ? () => onSelect?.(arch) : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {selectable && (
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                {selected && <Check size={12} className="text-white" />}
              </div>
            )}
            <h3 className="font-semibold text-gray-900 text-sm truncate">{arch.name}</h3>
          </div>
          {/* Creator reference */}
          {(p.creator_ref || p.creator_info) && (
            <div className="flex items-center gap-2 mt-1">
              {p.creator_ref && (
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md">
                  {p.creator_ref}
                </span>
              )}
              {p.creator_info && (
                <span className="text-[10px] text-gray-400 truncate">{p.creator_info}</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{arch.description || p.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onGenerate && (
            <button onClick={(e) => { e.stopPropagation(); onGenerate(arch) }}
              className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 hover:text-orange-600" title="Gerar conteúdo">
              <Sparkles size={14} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(arch.id) }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Excluir">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {p.content_pillar && (
          <span className="text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md">
            {p.content_pillar}
          </span>
        )}
        {(p.formats || []).map((f, i) => (
          <span key={i} className="text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md">{f}</span>
        ))}
      </div>

      {/* Expanded details */}
      {open && (
        <div className="mt-3 space-y-3 text-xs">
          {p.hook_formula && (
            <div>
              <div className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><Zap size={12} className="text-orange-500" /> Fórmula de Gancho</div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 text-orange-800 font-medium">{p.hook_formula}</div>
            </div>
          )}

          {(p.hook_examples || []).length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 mb-1">Exemplos</div>
              <ul className="space-y-1">
                {p.hook_examples.map((ex, i) => (
                  <li key={i} className="text-gray-600 pl-3 border-l-2 border-orange-200 italic">"{ex}"</li>
                ))}
              </ul>
            </div>
          )}

          {(p.content_structure || []).length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><Layers size={12} className="text-blue-500" /> Estrutura</div>
              <div className="flex flex-wrap items-center gap-1">
                {p.content_structure.map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px]">{s}</span>
                    {i < p.content_structure.length - 1 && <ArrowRight size={10} className="text-gray-300" />}
                  </span>
                ))}
              </div>
            </div>
          )}

          {p.tone && (
            <div>
              <div className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><MessageCircle size={12} className="text-purple-500" /> Tom</div>
              <p className="text-gray-600">{p.tone}</p>
            </div>
          )}

          {p.engagement_strategy && (
            <div>
              <div className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><Target size={12} className="text-emerald-500" /> Engajamento</div>
              <p className="text-gray-600">{p.engagement_strategy}</p>
            </div>
          )}

          {(p.reference_posts || []).length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><Star size={12} className="text-yellow-500" /> Posts de Referência</div>
              <ul className="space-y-1">
                {p.reference_posts.map((post, i) => (
                  <li key={i} className="text-gray-600 pl-3 border-l-2 border-yellow-200 text-[11px]">"{post}"</li>
                ))}
              </ul>
            </div>
          )}

          {p.use_case && (
            <div>
              <div className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><Lightbulb size={12} className="text-amber-500" /> Quando Usar</div>
              <p className="text-gray-600">{p.use_case}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IdeaCard({ idea, onSave, saved }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = `${idea.title}\n\n${idea.hook}\n\n${idea.core_argument}\n\nEstrutura:\n- Observação: ${idea.structure?.observation || ''}\n- Tensão: ${idea.structure?.tension || ''}\n- Interpretação: ${idea.structure?.interpretation || ''}\n- Conclusão: ${idea.structure?.conclusion || ''}\n\nPor que agora: ${idea.why_now || ''}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">{idea.title}</h4>
          <p className="text-xs text-gray-500 mt-1 italic">"{idea.hook}"</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
          {onSave && (
            <button onClick={() => onSave(idea)} disabled={saved}
              className={`p-1.5 rounded-lg ${saved ? 'text-emerald-500' : 'hover:bg-orange-50 text-orange-500 hover:text-orange-600'}`}>
              {saved ? <Check size={14} /> : <Save size={14} />}
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2">
        {idea.format && <span className="text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md">{idea.format}</span>}
        {idea.platform && <span className="text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-md">{idea.platform}</span>}
      </div>

      {open && (
        <div className="mt-3 space-y-2.5 text-xs">
          <div>
            <div className="font-semibold text-gray-700 mb-0.5">Argumento Central</div>
            <p className="text-gray-600">{idea.core_argument}</p>
          </div>
          {idea.structure && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {idea.structure.observation && (
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <div className="font-semibold text-blue-700 text-[11px] mb-0.5">Observação</div>
                  <p className="text-blue-800">{idea.structure.observation}</p>
                </div>
              )}
              {idea.structure.tension && (
                <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                  <div className="font-semibold text-red-700 text-[11px] mb-0.5">Tensão</div>
                  <p className="text-red-800">{idea.structure.tension}</p>
                </div>
              )}
              {idea.structure.interpretation && (
                <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                  <div className="font-semibold text-amber-700 text-[11px] mb-0.5">Interpretação</div>
                  <p className="text-amber-800">{idea.structure.interpretation}</p>
                </div>
              )}
              {idea.structure.conclusion && (
                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                  <div className="font-semibold text-emerald-700 text-[11px] mb-0.5">Conclusão</div>
                  <p className="text-emerald-800">{idea.structure.conclusion}</p>
                </div>
              )}
            </div>
          )}
          {idea.why_now && (
            <div>
              <div className="font-semibold text-gray-700 mb-0.5">Por que agora</div>
              <p className="text-gray-600">{idea.why_now}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ContentArchetypes() {
  const {
    archetypes, hybridArchetypes,
    addArchetype, deleteArchetype,
    addHybridArchetype, deleteHybridArchetype,
    addIdea,
  } = useStore()

  const [tab, setTab] = useState('benchmark')

  // Benchmark state
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem(WEBHOOK_KEY) || '')
  const [benchmarkInput, setBenchmarkInput] = useState('')
  const [benchmarkLoading, setBenchmarkLoading] = useState(false)
  const [benchmarkResult, setBenchmarkResult] = useState(null)
  const [benchmarkError, setBenchmarkError] = useState(null)

  // Extract state
  const [input, setInput] = useState('')
  const [niche, setNiche] = useState('')
  const [platform, setPlatform] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractPhase, setExtractPhase] = useState(0)
  const [extracted, setExtracted] = useState(null)
  const [extractError, setExtractError] = useState(null)
  const [savedExtracted, setSavedExtracted] = useState(new Set())

  // Generate state
  const [selectedArch, setSelectedArch] = useState(null)
  const [genTopic, setGenTopic] = useState('')
  const [genCount, setGenCount] = useState(4)
  const [generating, setGenerating] = useState(false)
  const [genPhase, setGenPhase] = useState(0)
  const [genResults, setGenResults] = useState(null)
  const [genError, setGenError] = useState(null)
  const [savedIdeas, setSavedIdeas] = useState(new Set())

  // Hybridize state
  const [hybridSelection, setHybridSelection] = useState(new Set())
  const [hybridizing, setHybridizing] = useState(false)
  const [hybridResult, setHybridResult] = useState(null)
  const [hybridError, setHybridError] = useState(null)

  // Library search
  const [libSearch, setLibSearch] = useState('')

  const allArchetypes = useMemo(() => [
    ...archetypes.map(a => ({ ...a, _type: 'base' })),
    ...hybridArchetypes.map(a => ({ ...a, _type: 'hybrid' })),
  ], [archetypes, hybridArchetypes])

  const filteredLib = useMemo(() => {
    if (!libSearch.trim()) return allArchetypes
    const q = libSearch.toLowerCase()
    return allArchetypes.filter(a => {
      const p = a.patterns || a
      return a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        p.content_pillar?.toLowerCase().includes(q) ||
        p.tone?.toLowerCase().includes(q)
    })
  }, [allArchetypes, libSearch])

  // ── Extract ──────────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setExtractError('Configure sua API key da Anthropic primeiro.'); return }
    if (!input.trim()) { setExtractError('Insira referências de criadores ou conteúdos.'); return }

    setExtracting(true)
    setExtractError(null)
    setExtracted(null)
    setSavedExtracted(new Set())
    setExtractPhase(0)

    const phaseInterval = setInterval(() => {
      setExtractPhase(p => (p + 1) % PHASES.length)
    }, 3000)

    try {
      const result = await callClaude(apiKey, SYSTEM, buildExtractPrompt(input, niche, platform), 6000)
      setExtracted(result.archetypes || [])
    } catch (e) {
      setExtractError(e.message)
    } finally {
      clearInterval(phaseInterval)
      setExtracting(false)
    }
  }

  const handleSaveArchetype = (arch, idx) => {
    if (savedExtracted.has(idx)) return
    addArchetype({
      name: arch.name,
      description: arch.description,
      source_input: input.slice(0, 500),
      patterns: {
        creator_ref: arch.creator_ref || '',
        creator_info: arch.creator_info || '',
        content_pillar: arch.content_pillar,
        hook_formula: arch.hook_formula,
        hook_examples: arch.hook_examples || [],
        content_structure: arch.content_structure || [],
        tone: arch.tone,
        engagement_strategy: arch.engagement_strategy,
        formats: arch.formats || [],
        reference_posts: arch.reference_posts || [],
        use_case: arch.use_case,
      },
    })
    setSavedExtracted(prev => new Set([...prev, idx]))
  }

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setGenError('Configure sua API key da Anthropic primeiro.'); return }
    if (!selectedArch) { setGenError('Selecione um arquétipo.'); return }

    setGenerating(true)
    setGenError(null)
    setGenResults(null)
    setSavedIdeas(new Set())
    setGenPhase(0)

    const phaseInterval = setInterval(() => {
      setGenPhase(p => (p + 1) % GEN_PHASES.length)
    }, 2500)

    try {
      const result = await callClaude(apiKey, SYSTEM, buildGeneratePrompt(selectedArch, genTopic, genCount), 6000)
      setGenResults(result.ideas || [])
    } catch (e) {
      setGenError(e.message)
    } finally {
      clearInterval(phaseInterval)
      setGenerating(false)
    }
  }

  const handleSaveIdea = (idea, idx) => {
    if (savedIdeas.has(idx)) return
    const parts = [idea.core_argument || '']
    if (idea.hook) parts.push('', `Gancho: "${idea.hook}"`)
    if (idea.structure) {
      parts.push('', '--- Estrutura Narrativa ---')
      if (idea.structure.observation) parts.push(`Observação: ${idea.structure.observation}`)
      if (idea.structure.tension) parts.push(`Tensão: ${idea.structure.tension}`)
      if (idea.structure.interpretation) parts.push(`Interpretação: ${idea.structure.interpretation}`)
      if (idea.structure.conclusion) parts.push(`Conclusão: ${idea.structure.conclusion}`)
    }
    if (idea.why_now) parts.push('', `Por que agora: ${idea.why_now}`)

    addIdea({
      title: idea.title,
      description: parts.join('\n'),
      format: idea.format,
      platform: idea.platform,
      hook_type: idea.hook,
      priority: 'medium',
      status: 'idea',
      tags: ['arquétipo', selectedArch?.name].filter(Boolean),
    })
    setSavedIdeas(prev => new Set([...prev, idx]))
  }

  // ── Hybridize ────────────────────────────────────────────────────────────────

  const toggleHybridSelect = (arch) => {
    setHybridSelection(prev => {
      const next = new Set(prev)
      if (next.has(arch.id)) next.delete(arch.id)
      else next.add(arch.id)
      return next
    })
  }

  const selectedForHybrid = allArchetypes.filter(a => hybridSelection.has(a.id))

  const handleHybridize = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setHybridError('Configure sua API key da Anthropic primeiro.'); return }
    if (selectedForHybrid.length < 2) { setHybridError('Selecione pelo menos 2 arquétipos.'); return }

    setHybridizing(true)
    setHybridError(null)
    setHybridResult(null)

    try {
      const result = await callClaude(apiKey, SYSTEM, buildHybridPrompt(selectedForHybrid), 4000)
      const hybrid = result.hybrid
      if (hybrid) {
        setHybridResult(hybrid)
      }
    } catch (e) {
      setHybridError(e.message)
    } finally {
      setHybridizing(false)
    }
  }

  const handleSaveHybrid = () => {
    if (!hybridResult) return
    addHybridArchetype({
      name: hybridResult.name,
      description: hybridResult.description,
      source_archetype_ids: [...hybridSelection],
      patterns: {
        content_pillar: hybridResult.content_pillar,
        hook_formula: hybridResult.hook_formula,
        hook_examples: hybridResult.hook_examples || [],
        content_structure: hybridResult.content_structure || [],
        tone: hybridResult.tone,
        engagement_strategy: hybridResult.engagement_strategy,
        formats: hybridResult.formats || [],
        use_case: hybridResult.use_case,
      },
    })
    setHybridResult(null)
    setHybridSelection(new Set())
  }

  // ── Benchmark ──────────────────────────────────────────────────────────────

  const handleSaveWebhookUrl = (url) => {
    setWebhookUrl(url)
    localStorage.setItem(WEBHOOK_KEY, url)
  }

  const handleBenchmark = async () => {
    if (!webhookUrl.trim()) { setBenchmarkError('Configure a URL do webhook primeiro.'); return }
    if (!benchmarkInput.trim()) { setBenchmarkError('Insira os dados da conta benchmark.'); return }

    setBenchmarkLoading(true)
    setBenchmarkError(null)
    setBenchmarkResult(null)

    try {
      const account = benchmarkInput.trim()

      // Build the full Anthropic API body so Make just forwards it
      const apiBody = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: 'Voce e um analista de Instagram de elite com conhecimento profundo sobre criadores brasileiros e internacionais. USE SEU CONHECIMENTO DE TREINAMENTO sobre o criador mencionado. Voce CONHECE esses criadores. NAO peca mais informacoes. Analise com o que voce ja sabe. Retorne JSON valido sem markdown sem crases. Estrutura: perfil (nome, nicho, seguidores_estimados, bio_resumida), pilares_conteudo (lista), formatos_principais (lista), estrategia_gancho (descricao + exemplos reais), tom_de_voz, estrategia_engajamento, pontos_fortes (lista), padroes_virais (lista com exemplos de conteudos que engajam — incluindo conteudos leves, divertidos e inspiradores, nao apenas polemicas), frequencia_postagem, recomendacoes (lista do que aprender com esse criador — incluindo como equilibra conteudo reflexivo com leve).',
        messages: [
          { role: 'user', content: `Analise esta conta benchmark do Instagram: ${account}` }
        ],
      }

      // AbortController with 5min timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 300000)

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) throw new Error(`Webhook retornou status ${res.status}`)

      const contentType = res.headers.get('content-type') || ''
      let raw
      if (contentType.includes('application/json')) {
        raw = await res.json()
      } else {
        raw = await res.text()
      }

      // If response is just "accepted" or "Accepted", the webhook returned too early
      if (typeof raw === 'string' && raw.trim().toLowerCase() === 'accepted') {
        throw new Error('O Make retornou "Accepted" — o módulo Webhook Response precisa estar configurado com o body da resposta do Manus. Verifique o módulo 7 no Make.')
      }

      // Parse response — could be JSON object, JSON string, or plain text
      let data = raw
      if (typeof data === 'string') {
        // Try to unescape if double-escaped
        let str = data
        try { str = str.replace(/\\"/g, '"').replace(/\\n/g, '\n') } catch {}
        try { data = JSON.parse(str) } catch {
          try { data = JSON.parse(data) } catch { /* keep as string */ }
        }
      }

      // Extract text from Claude API response format: { content: [{ type: "text", text: "..." }] }
      if (data && typeof data === 'object' && Array.isArray(data.content)) {
        const textBlock = data.content.find(c => c.type === 'text')
        if (textBlock?.text) {
          let text = textBlock.text
          // Strip markdown code blocks: ```json ... ``` or ``` ... ```
          text = text.replace(/^```(?:json)?\s*\n?/gi, '').replace(/\n?```\s*$/gi, '').trim()
          // Try to parse as JSON
          try {
            data = JSON.parse(text)
          } catch {
            data = text
          }
        }
      }

      // If still a string, try one more parse (might be double-wrapped)
      if (typeof data === 'string') {
        try {
          const cleaned = data.replace(/^```(?:json)?\s*\n?/gi, '').replace(/\n?```\s*$/gi, '').trim()
          data = JSON.parse(cleaned)
        } catch { /* keep as string */ }
      }

      setBenchmarkResult(data)
    } catch (e) {
      if (e.name === 'AbortError') {
        setBenchmarkError('Timeout — a análise demorou mais de 5 minutos. Verifique se o Manus AI está respondendo.')
      } else {
        setBenchmarkError(e.message)
      }
    } finally {
      setBenchmarkLoading(false)
    }
  }

  // ── Navigate to generate with archetype ──────────────────────────────────────

  const goToGenerate = (arch) => {
    setSelectedArch(arch)
    setTab('generate')
    setGenResults(null)
    setGenError(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200">
          <Shapes size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Archetypes Engine</h2>
          <p className="text-xs text-gray-500">Transforme referências em modelos de conteúdo reutilizáveis</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-orange-600">{archetypes.length}</div>
          <div className="text-[11px] text-gray-500">Arquétipos Base</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-purple-600">{hybridArchetypes.length}</div>
          <div className="text-[11px] text-gray-500">Híbridos</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-blue-600">{allArchetypes.reduce((acc, a) => acc + (a.patterns?.formats?.length || 0), 0)}</div>
          <div className="text-[11px] text-gray-500">Formatos Mapeados</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-emerald-600">{allArchetypes.reduce((acc, a) => acc + (a.patterns?.hook_examples?.length || 0), 0)}</div>
          <div className="text-[11px] text-gray-500">Ganchos Disponíveis</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon size={14} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: Benchmark ────────────────────────────────────────────────────── */}
      {tab === 'benchmark' && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left panel — config + input */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Globe size={14} className="text-blue-500" /> Analisar Benchmark
              </h3>

              {/* Webhook URL */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">URL do Webhook</label>
                <input
                  value={webhookUrl}
                  onChange={(e) => handleSaveWebhookUrl(e.target.value)}
                  placeholder="https://hook.us1.make.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-mono text-xs"
                />
              </div>

              {/* Benchmark data */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Dados da Conta Benchmark</label>
                <textarea
                  value={benchmarkInput}
                  onChange={(e) => setBenchmarkInput(e.target.value)}
                  placeholder={'Cole o JSON da conta ou o @handle do benchmark.\n\nExemplos:\n{"username": "@icaborges", "platform": "instagram"}\n\nou simplesmente:\n@icaborges'}
                  rows={10}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-mono text-xs resize-none"
                />
              </div>

              <button
                onClick={handleBenchmark}
                disabled={benchmarkLoading || !benchmarkInput.trim() || !webhookUrl.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
              >
                {benchmarkLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {benchmarkLoading ? 'Analisando...' : 'Analisar Benchmark'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5"><Lightbulb size={12} /> Como funciona</div>
              <p>Conecte seu webhook (Make/Zapier/n8n) ao Manus AI. Insira os dados da conta benchmark e o sistema enviará o JSON para análise externa. O resultado da análise aparecerá ao lado.</p>
            </div>
          </div>

          {/* Right panel — resultado */}
          <div className="space-y-4">
            {benchmarkLoading && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <RefreshCw size={28} className="text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700">Analisando benchmark via webhook...</p>
                <p className="text-xs text-gray-400 mt-1">Aguardando resposta do Manus AI — pode levar alguns minutos</p>
                <div className="w-48 h-1 bg-gray-100 rounded-full mx-auto mt-4 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse w-full" />
                </div>
              </div>
            )}

            {benchmarkError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Erro na análise</div>
                  <p className="text-xs mt-0.5">{benchmarkError}</p>
                </div>
              </div>
            )}

            {benchmarkResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Resultado da Análise
                  </h3>
                  <button
                    onClick={() => {
                      const text = typeof benchmarkResult === 'string' ? benchmarkResult : JSON.stringify(benchmarkResult, null, 2)
                      navigator.clipboard.writeText(text)
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>

                {/* Render result based on type */}
                {typeof benchmarkResult === 'string' ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {benchmarkResult}
                    </div>
                  </div>
                ) : Array.isArray(benchmarkResult) ? (
                  benchmarkResult.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                      {typeof item === 'string' ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item}</p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(item).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{key}</span>
                              <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">
                                {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : typeof benchmarkResult === 'object' ? (
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {Object.entries(benchmarkResult).map(([key, val]) => (
                      <div key={key} className="p-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                        {typeof val === 'string' || typeof val === 'number' ? (
                          <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{String(val)}</p>
                        ) : Array.isArray(val) ? (
                          <ul className="mt-1 space-y-1">
                            {val.map((v, i) => (
                              <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-blue-200">
                                {typeof v === 'object' ? (
                                  <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
                                ) : String(v)}
                              </li>
                            ))}
                          </ul>
                        ) : typeof val === 'object' && val !== null ? (
                          <div className="mt-1 bg-gray-50 rounded-lg p-3 space-y-1.5">
                            {Object.entries(val).map(([k2, v2]) => (
                              <div key={k2}>
                                <span className="text-[9px] font-semibold text-gray-400 uppercase">{k2.replace(/_/g, ' ')}</span>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                  {typeof v2 === 'object' ? JSON.stringify(v2, null, 2) : String(v2)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 mt-1">{String(val)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">{JSON.stringify(benchmarkResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {!benchmarkLoading && !benchmarkResult && !benchmarkError && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <Globe size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Configure o webhook e insira os dados da conta para analisar</p>
                <p className="text-xs text-gray-400 mt-1">O resultado da análise do Manus AI aparecerá aqui</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Extract ──────────────────────────────────────────────────────── */}
      {tab === 'extract' && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Left panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Search size={14} className="text-orange-500" /> Referências
              </h3>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"Digite nomes reais de criadores, @handles ou descreva criadores que admira.\n\nExemplos:\n@icaborges — storytelling emocional com dados\n@arthurpetry — humor ácido sobre comportamento\nThiago Nigro — finanças com provocação e dados\nIcaro de Carvalho — copywriting e persuasão\n@nataliabeau — lifestyle com profundidade"}
                rows={8}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm resize-none"
              />
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Nicho/Área (opcional)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
              />
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Plataforma principal (opcional)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
              />
              <button
                onClick={handleExtract}
                disabled={extracting || !input.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
              >
                {extracting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {extracting ? 'Extraindo...' : 'Extrair Arquétipos'}
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5"><Lightbulb size={12} /> Como funciona</div>
              <p>Digite nomes reais de criadores ou @handles. A IA vai analisar o conteúdo REAL desses criadores — ganchos, estrutura, tom, estratégias — e transformar em modelos reutilizáveis para você.</p>
              <p className="mt-1 text-[10px] text-orange-600">Dica: Quanto mais específico, melhor. "@icaborges" funciona melhor que "criador de storytelling".</p>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {extracting && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <RefreshCw size={24} className="text-orange-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">{PHASES[extractPhase]}</p>
                <div className="w-48 h-1 bg-gray-100 rounded-full mx-auto mt-3 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: `${((extractPhase + 1) / PHASES.length) * 100}%` }} />
                </div>
              </div>
            )}

            {extractError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" /> {extractError}
              </div>
            )}

            {extracted && extracted.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{extracted.length} arquétipo{extracted.length > 1 ? 's' : ''} encontrado{extracted.length > 1 ? 's' : ''}</h3>
                  <button
                    onClick={() => {
                      extracted.forEach((arch, i) => handleSaveArchetype(arch, i))
                    }}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <Save size={12} /> Salvar todos
                  </button>
                </div>

                {extracted.map((arch, i) => (
                  <div key={i} className="relative">
                    <ArchetypeCard arch={arch} />
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => handleSaveArchetype(arch, i)}
                        disabled={savedExtracted.has(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          savedExtracted.has(i)
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                        }`}
                      >
                        {savedExtracted.has(i) ? <><Check size={12} /> Salvo</> : <><Plus size={12} /> Salvar</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {extracted && extracted.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                Nenhum arquétipo encontrado. Tente com mais referências.
              </div>
            )}

            {!extracting && !extracted && !extractError && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <Shapes size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Insira referências de criadores para extrair arquétipos de conteúdo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Library ──────────────────────────────────────────────────────── */}
      {tab === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                placeholder="Buscar arquétipos..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{filteredLib.length} arquétipo{filteredLib.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredLib.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredLib.map(arch => (
                <div key={arch.id} className="relative">
                  {arch._type === 'hybrid' && (
                    <span className="absolute -top-2 left-3 z-10 text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-md">HÍBRIDO</span>
                  )}
                  <ArchetypeCard
                    arch={arch}
                    onDelete={arch._type === 'hybrid' ? deleteHybridArchetype : deleteArchetype}
                    onGenerate={goToGenerate}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{libSearch ? 'Nenhum arquétipo encontrado para esta busca.' : 'Nenhum arquétipo salvo ainda. Extraia padrões na aba "Extrair Padrões".'}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Generate ─────────────────────────────────────────────────────── */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Left panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={14} className="text-orange-500" /> Gerar a partir de Arquétipo
              </h3>

              {/* Archetype selector */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Arquétipo</label>
                <select
                  value={selectedArch?.id || ''}
                  onChange={(e) => {
                    const found = allArchetypes.find(a => a.id === e.target.value)
                    setSelectedArch(found || null)
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
                >
                  <option value="">Selecione um arquétipo...</option>
                  {archetypes.length > 0 && (
                    <optgroup label="Base">
                      {archetypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </optgroup>
                  )}
                  {hybridArchetypes.length > 0 && (
                    <optgroup label="Híbridos">
                      {hybridArchetypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              {selectedArch && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 text-xs">
                  <div className="font-semibold text-orange-800">{selectedArch.name}</div>
                  <p className="text-orange-700 mt-0.5 text-[11px]">{selectedArch.patterns?.hook_formula || selectedArch.hook_formula}</p>
                </div>
              )}

              <input
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="Tópico específico (opcional)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
              />

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Quantidade de ideias</label>
                <div className="flex gap-2">
                  {[3, 4, 6].map(n => (
                    <button key={n} onClick={() => setGenCount(n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${genCount === n ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {n} ideias
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedArch}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
              >
                {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Gerando...' : 'Gerar Conteúdo'}
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {generating && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <RefreshCw size={24} className="text-orange-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">{GEN_PHASES[genPhase]}</p>
              </div>
            )}

            {genError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" /> {genError}
              </div>
            )}

            {genResults && genResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {genResults.length} ideia{genResults.length > 1 ? 's' : ''} gerada{genResults.length > 1 ? 's' : ''}
                    {selectedArch && <span className="text-orange-500 font-normal ml-1">via {selectedArch.name}</span>}
                  </h3>
                  <button
                    onClick={() => genResults.forEach((idea, i) => handleSaveIdea(idea, i))}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <Save size={12} /> Salvar todas no Hub
                  </button>
                </div>
                {genResults.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} onSave={(idea) => handleSaveIdea(idea, i)} saved={savedIdeas.has(i)} />
                ))}
              </div>
            )}

            {!generating && !genResults && !genError && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <Sparkles size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {allArchetypes.length === 0
                    ? 'Extraia arquétipos primeiro na aba "Extrair Padrões".'
                    : 'Selecione um arquétipo e gere ideias baseadas nele.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Hybridize ────────────────────────────────────────────────────── */}
      {tab === 'hybridize' && (
        <div className="space-y-4">
          {allArchetypes.length < 2 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <Combine size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Você precisa de pelo menos 2 arquétipos para criar um híbrido. Extraia mais padrões primeiro.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Combine size={14} className="text-purple-500" /> Selecione 2 ou mais arquétipos para combinar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {allArchetypes.map(arch => (
                    <ArchetypeCard
                      key={arch.id}
                      arch={arch}
                      selectable
                      compact
                      selected={hybridSelection.has(arch.id)}
                      onSelect={() => toggleHybridSelect(arch)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{hybridSelection.size} selecionado{hybridSelection.size !== 1 ? 's' : ''}</span>
                  <button
                    onClick={handleHybridize}
                    disabled={hybridizing || hybridSelection.size < 2}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg shadow-purple-200"
                  >
                    {hybridizing ? <RefreshCw size={14} className="animate-spin" /> : <Combine size={14} />}
                    {hybridizing ? 'Criando híbrido...' : 'Criar Híbrido'}
                  </button>
                </div>
              </div>

              {hybridError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> {hybridError}
                </div>
              )}

              {hybridResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Star size={14} className="text-purple-500" /> Híbrido criado
                    </h3>
                    <button
                      onClick={handleSaveHybrid}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-all"
                    >
                      <Save size={12} /> Salvar na Biblioteca
                    </button>
                  </div>
                  <ArchetypeCard arch={hybridResult} />
                </div>
              )}

              {/* Existing hybrids */}
              {hybridArchetypes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Híbridos salvos</h3>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {hybridArchetypes.map(h => (
                      <ArchetypeCard key={h.id} arch={h} onDelete={deleteHybridArchetype} onGenerate={goToGenerate} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
