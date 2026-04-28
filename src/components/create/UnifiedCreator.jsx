import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ANTI_AI_FILTER } from '../../lib/antiAIFilter'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown, ChevronRight, ChevronUp,
  Video, LayoutGrid, Type, MessageSquare, Mic, Film, Zap,
  ThumbsDown, Heart, ArrowRight, X, Sliders, Eye, History,
  Brain, Wand2, Layers, PenTool, Target, Plus, Save, Upload, Paperclip,
  MessageCircle, ShieldCheck, Quote, Flame, ToggleLeft, ToggleRight,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { buildVoiceContext, buildRegenerateInstruction } from '../../utils/voiceContext'
import { lintText } from '../../utils/brandLinter'
import * as pdfjsLib from 'pdfjs-dist'
import ReferenceExplorer from '../explorer/ReferenceExplorer'
import BrandLinterPanel from '../linter/BrandLinterPanel'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const LS_KEY = 'cio-anthropic-key'

/* ── Master Prompt Karen (do PDF) ── */
const MASTER_PROMPT = `Você é um assistente especializado em criar conteúdo para Karen Santos (@karensantosperfil).
Karen é consultora tech, mentora de carreira e criadora de conteúdo sobre carreira em tecnologia, comportamento profissional, liderança e IA.
Ela cria conteúdo que faz as pessoas se sentirem vistas porque ela passa pelo que elas passam.

Você também tem olhar de publicitário experiente e filmmaker mobile — pensa em ganchos visuais, enquadramentos com celular, ritmo de edição e impacto nos primeiros 2 segundos.

RECONHECIMENTO AUTOMÁTICO DE CONTEXTO:
- Tema sério (feminicídio, racismo, solidão estratégica) → Tom Reflexivo
- Situação relatable (reunião, dinâmica corporativa) → Tom Engraçado
- Carreira/IA/liderança → Tom Mentora

TONS DE VOZ:
1. REFLEXIVO: Direto, crítico, empático, estruturado, provocador
   Estrutura: Abertura provocadora → Descrição da dor → Crítica ao senso comum → Reframing → Ação → Validação → CTA
2. ENGRAÇADO: Leve, coloquial ("Nem cheguei, veyr!!"), sem julgamento, observador
   Estrutura: Abertura relatable → Situação → Crítica disfarçada → Punchline → CTA
3. MENTORA: Realista, orientador, questionador, estruturado, maduro
   Estrutura: Abertura provocadora → Contexto → Insight → Reframing → Ação/Provocação → CTA

ELEMENTOS OBRIGATÓRIOS:
- Autenticidade, Nomeação precisa, Crítica ao senso comum, Estrutura com ação, Engajamento, Sem floreios, Empatia + Realidade, Ponto social subjacente

NUNCA FAZER:
- Motivação baça, corporativismo vazio, superficialidade, só problema sem solução, julgamento moral, soluções simplistas, hype sem fundamento`

/* ── Formatos ── */
const FORMATS = [
  { id: 'reels', label: 'Reels', icon: Video, desc: '30-60s roteiro com cenas', color: 'from-purple-500 to-pink-500' },
  { id: 'carrossel', label: 'Carrossel', icon: LayoutGrid, desc: '5-10 slides', color: 'from-orange-500 to-red-500' },
  { id: 'caption', label: 'Caption', icon: Type, desc: 'Instagram/LinkedIn', color: 'from-blue-500 to-cyan-500' },
  { id: 'thread', label: 'Thread', icon: MessageSquare, desc: 'Twitter/X', color: 'from-gray-700 to-gray-900' },
  { id: 'stories', label: 'Stories', icon: Film, desc: 'Sequência de stories', color: 'from-amber-500 to-orange-500' },
]

const FORMAT_PROMPTS = {
  reels: `FORMATO: REELS (30-60 segundos)
- Abertura impactante (0-3s) — gancho visual + frase de impacto
- Desenvolvimento (3-45s) — conteúdo principal com cortes rítmicos
- Insight/Punchline (45-55s)
- CTA (55-60s)
- Inclua: indicações de cenas, direção de câmera mobile, narração, texto na tela
- Sugestão de áudio/trilha
- Legenda para o post + 5-8 hashtags`,
  carrossel: `FORMATO: CARROSSEL (5-10 slides)
- Slide 1: Gancho provocador (frase que para o scroll)
- Slides 2-8: Desenvolvimento com 1 ideia por slide
- Slides 9-10: Conclusão + CTA
- Inclua: texto exato de cada slide, sugestão visual por slide
- Legenda para o post + 5-8 hashtags`,
  caption: `FORMATO: CAPTION (Instagram/LinkedIn)
- Abertura: Gancho direto (primeira linha que aparece no feed — CRUCIAL)
- Corpo: 3-5 parágrafos curtos, espaço branco
- Encerramento: Pergunta/CTA que provoca comentário
- 5-8 hashtags relevantes`,
  thread: `FORMATO: THREAD (Twitter/X)
- Tweet 1: Abertura provocadora (máx 280 chars, tem que gerar clique)
- Tweets 2-N: Desenvolvimento (cada um independente mas conectado)
- Último: CTA
- Sugestão de mídia para tweet 1`,
  stories: `FORMATO: STORIES (5-8 stories)
- Story 1: Gancho provocador (enquete ou pergunta)
- Stories 2-6: Desenvolvimento em blocos curtos
- Story 7-8: CTA + link/enquete final
- Inclua: texto na tela, sugestão de fundo, stickers`,
}

/* ── Ajustes rápidos ── */
const ADJUSTMENTS = [
  { id: 'more_critical', label: 'Mais crítico', icon: Zap },
  { id: 'more_light', label: 'Mais leve', icon: Sparkles },
  { id: 'more_personal', label: 'Mais pessoal', icon: Heart },
  { id: 'more_practical', label: 'Mais prático', icon: Target },
]

const ADJUSTMENT_PROMPTS = {
  more_critical: 'Reescreva com tom MAIS CRÍTICO — questione mais, provoque mais, seja mais incisivo. Sem perder empatia.',
  more_light: 'Reescreva com tom MAIS LEVE — use humor, situações relatables, linguagem coloquial. Mantenha o insight.',
  more_personal: 'Reescreva de forma MAIS PESSOAL — como confissão, experiência própria, vulnerabilidade estratégica.',
  more_practical: 'Reescreva de forma MAIS PRÁTICA — dê passos concretos, exemplos reais, frameworks acionáveis.',
}

/* ── Protocolo de Engajamento ── */
const ENGAGEMENT_SYSTEM = `Você é um estrategista de conteúdo com escrita natural, precisa e sem padrões artificiais.

Sua função NÃO é parecer inteligente.
Sua função é parecer real, específico e observador.

PRINCÍPIO CENTRAL:
Escrever como alguém que observou algo específico — não como quem está ensinando.

PROIBIÇÕES ABSOLUTAS — NUNCA usar:
- Frases: "não é só X, é Y" / "o mais curioso é" / "ninguém fala sobre isso" / "em um mundo…" / "a verdade é…" / "o segredo é…"
- Palavras: insights, crucial, essencial, fundamental, revolucionário, inspirador, valioso, significativo, otimizar, navegar, mergulhar
- Listas em escadinha repetitiva
- Frases de efeito genéricas
- Tom professoral ou frases prontas de coach
- Estrutura previsível

ESTRUTURA DO ROTEIRO:
1. Situação específica (realista, concreta — não abstrata)
2. Comportamento observável (o que as pessoas fazem, não o que sentem)
3. Leitura curta (sem explicar demais — descrever, não ensinar)
4. Tensão implícita (não didática, não sublinhada)
5. Pergunta simples e natural (como quem continua uma conversa, não como pesquisa)

REGRAS DE LINGUAGEM:
- Escrever como fala — oral, direto
- Preferir descrição a explicação
- Evitar palavras bonitas sem função
- Evitar generalizações amplas
- Evitar qualquer frase que pareça "impactante demais"

REGRAS DE CORTE (aplicar automaticamente):
- Remover repetição de ideia
- Remover explicação excessiva
- Remover mais de 1 exemplo
- Remover qualquer frase que soe roteirizada
- Máximo 6 a 8 blocos curtos

PERGUNTA FINAL:
- Deve parecer continuação natural da conversa
- Simples, quase íntima, ou contraste leve
- Evitar tom de pesquisa ou perguntas genéricas

VALIDAÇÃO INTERNA (antes de entregar — ser honesto):
- Parece algo que uma pessoa falaria ou um texto que foi escrito?
- Tem alguma frase que parece pronta ou genérica?
- Está explicando demais?
- Dá espaço pra pessoa completar o pensamento?
Se houver qualquer sinal de artificialidade → reescrever completamente.

CRITÉRIO FINAL: Se parecer escrito por IA → falhou. Se parecer um post bonito → falhou. Se parecer uma observação real → passou.`

const buildEngagementPrompt = ({ tema, ideia, texto, gerarIdeia, gerarTexto }) => `
TEMA: ${tema}
${ideia && !gerarIdeia ? `IDEIA: ${ideia}` : ''}
${texto && !gerarTexto ? `TEXTO BASE:\n${texto}` : ''}
${gerarIdeia ? 'Crie uma ideia criativa para este tema — específica e concreta, não abstrata.' : ''}
${gerarTexto ? 'Crie um texto base para este tema — como observação real, não como artigo.' : ''}

Execute o protocolo:
1. ROTEIRO PRINCIPAL: situação específica → comportamento observável → leitura curta → tensão implícita → pergunta natural. 6 a 8 blocos curtos. Sem frases prontas. Sem explicação excessiva.
2. VARIAÇÃO EMOCIONAL (mudança real — mais próxima, mais íntima — não cosmética)
3. VARIAÇÃO PROVOCATIVA (mudança real — mais desconfortável, mais direta — não cosmética)
4. Valide internamente os 4 critérios — reescreva se qualquer um falhar
5. Entregue apenas versões aprovadas

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": "roteiro completo (use \\n para quebras)",
  "variacao_emocional": "variação emocional completa",
  "variacao_provocativa": "variação provocativa completa",
  "pergunta_final": "apenas a pergunta final — natural, como conversa",
  "respostas_sugeridas": ["resposta natural para comentários 1", "resposta natural para comentários 2"],
  "nota_estrategica": "em 2 frases: o que faz este conteúdo parecer real e por que vai gerar resposta",
  "validacao": {
    "parece_real": true,
    "sem_frases_prontas": true,
    "sem_excesso_explicacao": true,
    "espaco_aberto": true
  }
}`

/* ── Master Prompt — Gerador de Carrossel (Karen Santos) ── */
const CAROUSEL_SYSTEM = `Você é um gerador de carrossel para Karen Santos. Designer com 10+ anos, especialista em IA para negócios. Analítica, técnica, sem floreio. Nicho: Carreira, Maturidade Profissional e Tomada de Decisão.
Seu trabalho não é criar conteúdo bonito. É criar conteúdo que faz a pessoa escrever mais de uma linha nos comentários.

OBJETIVO DE ENGAJAMENTO:
O carrossel deve gerar comentários do tipo:
- "eu faço isso e nem percebo"
- "aconteceu comigo semana passada, foi exatamente assim"
- "como você lidaria quando não dá pra falar?"
- "acho que isso tem a ver com..."

NÃO é aceitável gerar conteúdo que resulte em: "amei", "arrasou", emoji, "verdade", "é isso", "acontece muito hoje em dia".
A diferença: o primeiro grupo exige que a pessoa se coloque. O segundo permite consumo passivo.

REGRA DE ENTRADA — antes de gerar qualquer slide, responda internamente:
"Qual é a tensão interna que a pessoa carrega sobre esse tema — não o que acontece com ela, mas o que ela sente sobre o que faz ou deixa de fazer?"
Essa tensão é o slide 1. Não a cena externa. Não o contexto. A tensão.

ESTRUTURA DOS SLIDES:
Slide 1 — Estado, não cena. A pessoa precisa se reconhecer antes de ver a história.
  ❌ "Tem uma reunião que todo mundo sai balançando a cabeça que sim"
  ✅ "Tem uma postura que você adota no trabalho que você nunca vai admitir em voz alta"
  O slide 1 é sobre o estado interno. Curto. Sem explicação.

Slides 2 a 5 — Sequência causal, não descrição. Cada slide puxa o próximo por causa e consequência.
  Pergunta de controle: "Esse slide avança o raciocínio ou apenas descreve mais do mesmo?" Se descreve → corte ou reescreva.

Slide 6 — Virada sem resolução. Tensão máxima. Não resolve. Não conclui. Deixa o incômodo no ar.

Slide 7 — Abertura, não fechamento. Observação seca que deixa espaço para a pessoa completar com a experiência dela.
  ❌ "A gente sai da sala fingindo que sabe pra onde está indo" (fecha, conclui, emocional)
  ✅ "E a reunião seguinte começa do mesmo jeito" (observação seca, deixa espaço)

PERGUNTA FINAL — não pode ser de confirmação:
  ❌ Perguntas proibidas: "Já saíram de uma reunião assim?", "Se identificou?", "Concorda?"
  ✅ Perguntas obrigatórias: "Qual foi a sua saída na hora?", "Você voltou a perguntar depois ou deixou pra lá?", "Quando foi a última vez que isso aconteceu com você?"
  A diferença: a primeira pede sim ou não. A segunda pede uma história.

VOCABULÁRIO E RITMO:
- Palavras curtas. Se o texto parecer "bonito", simplifique.
- Ritmo: misture uma frase longa de explicação com uma curta de fechamento. Nunca três frases curtas seguidas.
- Tom: oralidade real. Escreva como se estivesse mandando um áudio para um par sênior.
- Transições aceitas: "O ponto é...", "Na prática...", "O que acontece aqui é..."

LISTA NEGRA — ESTRUTURAS PROIBIDAS:
- "Não é sobre X, é sobre Y" → oposição falsa, parece template
- Três ou mais frases curtas em sequência → ritmo de sermão de coach
- Travessões para dar impacto → artificialidade
- "Mindset", "Propósito", "Transformação" → jargão vago
- "Vamos juntos?", "Concorda?" → fecha a conversa
- Nota estratégica com "vulnerabilidade universal" → critério de conta motivacional

CRITÉRIOS DE VALIDAÇÃO — rode os quatro testes antes de entregar:
Teste 1 — Espaço: "Essa sequência deixa espaço pra pessoa completar com a experiência dela, ou fecha tudo?" Se fecha → reprova.
Teste 2 — Tipo de comentário: "O comentário mais provável começa com 'eu' e tem mais de uma linha?" Se não → reprova.
Teste 3 — Saturação: "Esse conteúdo poderia estar naquele print de posts saturados de IA ou de coach?" Se sim → reprova. Reescreva do zero.
Teste 4 — Posicionamento: "Tem algo aqui que só Karen Santos diria, ou qualquer conta de carreira poderia ter postado?" Se qualquer conta postaria → reprova.

LEGENDA:
Uma linha. Observação seca ou dado. Não resume o carrossel, não entrega a conclusão.
  ❌ "aquela sensação de estar perdido mas fingir que entendeu tudo..."
  ✅ "fingir que entendeu é uma habilidade que ninguém lista no currículo"

RESPOSTAS PARA COMENTÁRIOS:
Gere 3 respostas no estilo Karen. A função não é fechar — é puxar mais fundo.
  Pessoa: "já passei por isso" → Karen: "o que te fez perceber na hora?"
As respostas devem ser perguntas abertas que pedem mais história, não confirmações ou explicações.

TESTE DE SANIDADE FINAL:
Se você leu o output e pensou "ficou bonito" → provavelmente falhou.
Se você leu e pensou "isso vai incomodar alguém" → provavelmente funcionou.`

const buildCarouselPrompt = ({ tema, ideia, texto, gerarIdeia, gerarTexto }) => `
TEMA: ${tema}
${ideia && !gerarIdeia ? `IDEIA: ${ideia}` : ''}
${texto && !gerarTexto ? `TEXTO BASE:\n${texto}` : ''}
${gerarIdeia ? 'Crie uma ideia específica e concreta para este tema — não abstrata.' : ''}
${gerarTexto ? 'Crie um texto base para este tema — como pensamento em voz alta, não como artigo.' : ''}

Execute o protocolo completo:
1. Responda internamente: "Qual é a tensão interna que a pessoa carrega sobre esse tema?"
2. Gere 7 slides seguindo a estrutura (estado → causal → virada → abertura).
3. Rode os 4 testes de validação. Se qualquer um reprovar → reescreva do zero.
4. Entregue apenas a versão aprovada.

Responda EXCLUSIVAMENTE com JSON válido:
{
  "slides": [
    { "numero": 1, "texto": "estado interno — 1 frase" },
    { "numero": 2, "texto": "causa ou contexto — 1 a 2 frases" },
    { "numero": 3, "texto": "desenvolvimento causal" },
    { "numero": 4, "texto": "aprofundamento" },
    { "numero": 5, "texto": "tensão chegando" },
    { "numero": 6, "texto": "virada sem resolução" },
    { "numero": 7, "texto": "observação seca — deixa espaço" }
  ],
  "legenda": "1 linha — observação seca ou dado, sem resumir o carrossel",
  "pergunta_final": "pergunta que pede relato, não confirmação",
  "respostas_sugeridas": [
    "pergunta que puxa mais fundo 1",
    "pergunta que puxa mais fundo 2",
    "pergunta que puxa mais fundo 3"
  ],
  "validacao": {
    "deixa_espaco": true,
    "comentario_comeca_com_eu": true,
    "nao_parece_coach": true,
    "so_karen_diria": true
  }
}`

/* ── Temas Sugeridos para Carrossel ── */
const TEMAS_CARROSSEL = [
  {
    categoria: 'Carreira',
    temas: [
      'Medo de ser demitido sem avisar',
      'Ficar em emprego ruim por medo do desconhecido',
      'Ser promovido e não se sentir pronto',
      'Pedir aumento e ter medo da resposta',
      'Aceitar proposta nova sem contar pra ninguém antes',
      'Sentir que o mercado passou por você',
    ],
  },
  {
    categoria: 'Maturidade Profissional',
    temas: [
      'Perfeccionismo que trava mais do que entrega',
      'Procrastinar numa tarefa que você sabe fazer',
      'Síndrome do impostor em cargo de liderança',
      'Não conseguir pedir ajuda sem se sentir fraco',
      'Trabalhar demais pra provar que merece estar ali',
      'Fingir que entendeu pra não parecer perdido',
    ],
  },
  {
    categoria: 'Tomada de Decisão',
    temas: [
      'Paralisação por análise — quando dados não ajudam a decidir',
      'Decidir sob pressão e se arrepender depois',
      'Mudar de opinião e não saber como falar',
      'Deixar o outro decidir pra não errar sozinho',
      'Adiar uma decisão esperando o momento certo',
      'Tomar decisão certa da forma errada',
    ],
  },
  {
    categoria: 'Dinâmicas Corporativas',
    temas: [
      'Reunião que todos balançam a cabeça mas ninguém age',
      'Concordar em público e discordar no corredor',
      'Gestor que pede autonomia mas controla tudo',
      'Feedback que não muda nada mas precisa ser dado',
      'Política de escritório que ninguém admite jogar',
      'Entregar bem e não ser visto',
    ],
  },
  {
    categoria: 'IA e Futuro do Trabalho',
    temas: [
      'Usar IA no trabalho e não contar pra ninguém',
      'Medo de ser substituído por automação',
      'IA que entrega mais rápido do que você explica o que quer',
      'Não saber até onde vai o seu trabalho e onde começa o da IA',
      'Atualizar as habilidades sem saber o que vai durar',
    ],
  },
]

/* ── Componente Principal ── */
export default function UnifiedCreator() {
  const navigate = useNavigate()
  const brandVoice = useStore(s => s.brandVoice)
  const dislikedContent = useStore(s => s.dislikedContent)
  const addDislike = useStore(s => s.addDislike)
  const addFavorite = useStore(s => s.addFavorite)
  const addIdea = useStore(s => s.addIdea)
  const bannedWords = useStore(s => s.bannedWords) || []
  const addBannedWord = useStore(s => s.addBannedWord)
  const removeBannedWord = useStore(s => s.removeBannedWord)

  const [input, setInput] = useState('')
  const [briefing, setBriefing] = useState('')
  const [briefingName, setBriefingName] = useState('')
  const [format, setFormat] = useState(null) // null = auto-detect
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const briefingRef = useRef(null)
  const [showFormats, setShowFormats] = useState(false)
  const [history, setHistory] = useState([]) // versões anteriores
  const [showHistory, setShowHistory] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [banCandidate, setBanCandidate] = useState(null)
  const [banPosition, setBanPosition] = useState({ x: 0, y: 0 })
  const [inspiration, setInspiration] = useState(null)
  const [brandViolations, setBrandViolations] = useState([])
  const [showLinter, setShowLinter] = useState(false)
  const linterTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // ── Modo Engajamento ──
  const [mode, setMode] = useState('studio') // 'studio' | 'engagement' | 'carousel'
  // Engajamento (Reels)
  const [engTema, setEngTema] = useState('')
  const [engIdeia, setEngIdeia] = useState('')
  const [engTexto, setEngTexto] = useState('')
  const [engGerarIdeia, setEngGerarIdeia] = useState(false)
  const [engGerarTexto, setEngGerarTexto] = useState(false)
  const [engLoading, setEngLoading] = useState(false)
  const [engResult, setEngResult] = useState(null)
  const [engError, setEngError] = useState(null)
  const [engCopied, setEngCopied] = useState(null)
  const [engShowEmocional, setEngShowEmocional] = useState(false)
  const [engShowProvocativo, setEngShowProvocativo] = useState(false)
  // Carrossel
  const [carOpenCategory, setCarOpenCategory] = useState(null)
  const [carTema, setCarTema] = useState('')
  const [carIdeia, setCarIdeia] = useState('')
  const [carTexto, setCarTexto] = useState('')
  const [carGerarIdeia, setCarGerarIdeia] = useState(false)
  const [carGerarTexto, setCarGerarTexto] = useState(false)
  const [carLoading, setCarLoading] = useState(false)
  const [carResult, setCarResult] = useState(null)
  const [carError, setCarError] = useState(null)
  const [carCopied, setCarCopied] = useState(null)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  useEffect(() => { inputRef.current?.focus() }, [])

  // ── Brand Linter com debounce ──
  useEffect(() => {
    if (linterTimeoutRef.current) clearTimeout(linterTimeoutRef.current)

    if (!input.trim()) {
      setBrandViolations([])
      setShowLinter(false)
      return
    }

    linterTimeoutRef.current = setTimeout(() => {
      const violations = lintText(input)
      setBrandViolations(violations)
      setShowLinter(violations.length > 0)
    }, 500) // 500ms debounce

    return () => {
      if (linterTimeoutRef.current) clearTimeout(linterTimeoutRef.current)
    }
  }, [input])

  const handleBriefingUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBriefingName(file.name)
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map(item => item.str).join(' ') + '\n\n'
        }
        setBriefing(text.trim())
      } catch { setBriefing(''); setError('Erro ao ler PDF') }
    } else {
      const reader = new FileReader()
      reader.onload = () => setBriefing(reader.result)
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  /* ── Handler para inspiração do explorador ── */
  const handleGenerateScriptFromReference = (script) => {
    setInspiration(script)
    setInput(script)
    inputRef.current?.focus()
  }

  /* ── Gerar conteúdo ── */
  const generate = async (overrides = {}) => {
    const text = overrides.input || input
    if (!text.trim()) return
    if (!apiKey) { setError('Configure sua API key em Analytics > Configurações'); return }

    setLoading(true)
    setError(null)
    if (overrides.adjustment) setAdjusting(overrides.adjustment)

    const voiceCtx = buildVoiceContext(brandVoice, dislikedContent, bannedWords)
    const regenInstr = overrides.regen ? buildRegenerateInstruction(history.length) : ''
    const selectedFormat = overrides.format || format

    const prompt = `${MASTER_PROMPT}
${voiceCtx}
${regenInstr}

${overrides.adjustment ? ADJUSTMENT_PROMPTS[overrides.adjustment] : ''}

${overrides.adaptFrom ? `CONTEÚDO ORIGINAL PARA ADAPTAR:\n"""\n${overrides.adaptFrom}\n"""\n\nADAPTE o conteúdo acima mantendo a mesma essência, tom e mensagem.` : ''}

${inspiration ? `ROTEIRO DE INSPIRAÇÃO (DE REFERÊNCIA EXTERNA):
"""
${inspiration}
"""
Use este roteiro como inspiração para gerar o conteúdo. Mantenha os elementos principais mas refine para o DNA da Karen.
` : ''}

${briefing ? `BRIEFING DA MARCA/CLIENTE ANEXADO:
"""
${briefing.slice(0, 6000)}
"""
IMPORTANTE: O conteúdo deve ser SOBRE A MARCA/CLIENTE do briefing. Karen é a criadora que produz, mas o conteúdo fala sobre o que a marca quer comunicar. Use produtos, mensagens e diretrizes do briefing.
` : ''}

PEDIDO DO USUÁRIO: "${text}"

${selectedFormat ? FORMAT_PROMPTS[selectedFormat] : `DETECTE automaticamente o melhor formato baseado no tema. Escolha entre: Reels, Carrossel, Caption, Thread ou Stories.`}

Responda EXCLUSIVAMENTE com JSON válido:
{
  "detected_context": "reflexivo|engracado|mentora",
  "detected_context_reason": "por que este contexto foi escolhido (1 frase)",
  "suggested_format": "reels|carrossel|caption|thread|stories",
  "format_reason": "por que este formato é o melhor (1 frase)",
  "title": "título principal curto",
  "title_options": ["título viral 1 (máx 8 palavras)", "título viral 2", "título viral 3", "título viral 4", "título viral 5"],
  "content": "o conteúdo completo no formato escolhido, com todas as indicações",
  "caption": "legenda para o post (se aplicável)",
  "hashtags": ["#tag1", "#tag2"],
  "filmmaker_tip": "dica prática de filmagem mobile (se formato é vídeo)",
  "hook_alternatives": ["gancho alternativo 1", "gancho alternativo 2"]
}

REGRA PARA TÍTULOS: Gere 5 opções de título que sejam CURTOS (máx 8 palavras), virais e persuasivos. Devem gerar curiosidade sem ser clickbait extremista ou apelativo. Pense em títulos que fariam alguém parar o scroll. Nada genérico.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: ANTI_AI_FILTER,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const jsonText = data.content?.[0]?.text || ''
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida')

      const parsed = JSON.parse(jsonMatch[0])

      // Salvar no histórico antes de atualizar
      if (result) setHistory(prev => [result, ...prev].slice(0, 10))

      setResult(parsed)
      if (!format && parsed.suggested_format) setFormat(parsed.suggested_format)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setAdjusting(null)
    }
  }

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleAdapt = (newFormat) => {
    if (!result) return
    setFormat(newFormat)
    generate({ format: newFormat, adaptFrom: result.content })
  }

  const handleDislike = () => {
    if (result) {
      addDislike({ title: result.title, reason: 'Não gostei da abordagem', hook: result.content?.slice(0, 100) })
      generate({ regen: true })
    }
  }

  const handleFavorite = () => {
    if (result) {
      addFavorite({ type: 'content', title: result.title, content: result.content, format: result.suggested_format })
    }
  }

  const handleSaveIdea = () => {
    if (result) {
      addIdea({ title: result.title, description: result.content?.slice(0, 200), format: result.suggested_format, tags: result.hashtags?.slice(0, 3)?.map(t => t.replace('#', '')) || [] })
    }
  }

  const handleEngCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setEngCopied(key)
    setTimeout(() => setEngCopied(null), 2000)
  }

  const generateEngagement = async () => {
    if (!engTema.trim()) return
    if (!apiKey) { setEngError('Configure sua API key em Analytics > Configurações'); return }
    setEngLoading(true)
    setEngError(null)
    setEngResult(null)
    try {
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
          max_tokens: 5000,
          system: ENGAGEMENT_SYSTEM,
          messages: [{ role: 'user', content: buildEngagementPrompt({ tema: engTema, ideia: engIdeia, texto: engTexto, gerarIdeia: engGerarIdeia, gerarTexto: engGerarTexto }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setEngResult(JSON.parse(match[0]))
    } catch (err) {
      setEngError(err.message)
    } finally {
      setEngLoading(false)
    }
  }

  const generateCarousel = async () => {
    if (!carTema.trim()) return
    if (!apiKey) { setCarError('Configure sua API key em Analytics > Configurações'); return }
    setCarLoading(true)
    setCarError(null)
    setCarResult(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 5000,
          system: CAROUSEL_SYSTEM,
          messages: [{ role: 'user', content: buildCarouselPrompt({ tema: carTema, ideia: carIdeia, texto: carTexto, gerarIdeia: carGerarIdeia, gerarTexto: carGerarTexto }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setCarResult(JSON.parse(match[0]))
    } catch (err) {
      setCarError(err.message)
    } finally {
      setCarLoading(false)
    }
  }

  const handleCarCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCarCopied(key)
    setTimeout(() => setCarCopied(null), 2000)
  }

  const CONTEXT_COLORS = {
    reflexivo: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Reflexivo' },
    engracado: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Engraçado' },
    mentora: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Mentora' },
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
            <PenTool size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Criar Conteúdo</h1>
            <p className="text-xs text-gray-400">Descreva o que quer criar — a IA detecta o tom e formato ideal</p>
          </div>
        </div>
        {inspiration && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 border border-orange-300 text-xs font-medium text-orange-700">
            <Zap size={14} />
            Inspirado em referência
            <button onClick={() => setInspiration(null)} className="ml-1 hover:text-orange-900">✕</button>
          </div>
        )}
      </div>

      {/* ── Seletor de modo ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setMode('studio')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'studio' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <PenTool size={13} /> Studio Livre
        </button>
        <button onClick={() => setMode('engagement')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'engagement' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <MessageCircle size={13} /> Reels
        </button>
        <button onClick={() => setMode('carousel')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'carousel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <LayoutGrid size={13} /> Carrossel
        </button>
      </div>

      {/* ── Formulário de Engajamento ── */}
      {mode === 'engagement' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <MessageCircle size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Protocolo Anti-Emoji</p>
                <p className="text-xs text-gray-400 mt-0.5">Gera roteiro otimizado para comentários reais — não emojis</p>
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                Tema <span className="text-red-400">*</span>
              </label>
              <input
                value={engTema}
                onChange={e => setEngTema(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateEngagement()}
                placeholder="Ex: solidão na carreira, síndrome da impostora, burnout disfarçado de produtividade..."
                className="input text-sm w-full"
                autoFocus
              />
            </div>

            {/* Ideia */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Ideia <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setEngGerarIdeia(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    engGerarIdeia
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} />
                  {engGerarIdeia ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!engGerarIdeia && (
                <textarea
                  value={engIdeia}
                  onChange={e => setEngIdeia(e.target.value)}
                  rows={2}
                  placeholder="Uma ideia ou ângulo específico que você quer explorar..."
                  className="input text-sm w-full resize-none"
                />
              )}
              {engGerarIdeia && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-600">
                  <Sparkles size={12} /> A IA vai criar uma ideia criativa para o tema
                </div>
              )}
            </div>

            {/* Texto Base */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Texto base <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setEngGerarTexto(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    engGerarTexto
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} />
                  {engGerarTexto ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!engGerarTexto && (
                <textarea
                  value={engTexto}
                  onChange={e => setEngTexto(e.target.value)}
                  rows={3}
                  placeholder="Cole um texto, trecho, post ou rascunho que queira transformar..."
                  className="input text-sm w-full resize-none"
                />
              )}
              {engGerarTexto && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-600">
                  <Sparkles size={12} /> A IA vai criar um texto base relevante para o tema
                </div>
              )}
            </div>

            {engError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{engError}</div>
            )}

            <button
              onClick={generateEngagement}
              disabled={engLoading || !engTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {engLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando protocolo...</> : <><Zap size={15} /> Gerar Protocolo</>}
            </button>
          </div>

          {/* ── Output de Engajamento ── */}
          {engResult && (
            <div className="space-y-4 animate-fade-in">

              {/* Validação */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500" /> Protocolo de Validação
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'parece_real',            label: 'Parece real' },
                    { key: 'sem_frases_prontas',     label: 'Sem frases prontas' },
                    { key: 'sem_excesso_explicacao', label: 'Sem excesso' },
                    { key: 'espaco_aberto',          label: 'Espaço aberto' },
                  ].map(({ key, label }) => {
                    const val = engResult.validacao?.[key]
                    const ok = val === true
                    return (
                      <div key={key} className={clsx('flex flex-col items-center gap-1 p-2 rounded-xl border text-center',
                        ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      )}>
                        <span className={clsx('text-base', ok ? 'text-emerald-500' : 'text-red-400')}>{ok ? '✓' : '✗'}</span>
                        <span className={clsx('text-[9px] font-semibold leading-tight', ok ? 'text-emerald-700' : 'text-red-600')}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Versão Principal */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Versão Principal (otimizada)</span>
                  </div>
                  <button onClick={() => handleEngCopy(engResult.versao_principal, 'principal')}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 transition-colors">
                    {engCopied === 'principal' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                  </button>
                </div>
                <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {engResult.versao_principal}
                </div>
              </div>

              {/* Pergunta Final */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white shadow-lg shadow-orange-200">
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold text-white/70 uppercase mb-2 flex items-center gap-1.5">
                    <Quote size={10} /> Pergunta Final (use literalmente)
                  </p>
                  <p className="text-base font-bold leading-snug">{engResult.pergunta_final}</p>
                  <button onClick={() => handleEngCopy(engResult.pergunta_final, 'pergunta')}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all">
                    {engCopied === 'pergunta' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar pergunta</>}
                  </button>
                </div>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 translate-y-8" />
              </div>

              {/* Variações */}
              <div className="space-y-2">
                {[
                  { key: 'variacao_emocional',    label: 'Variação Emocional',    color: 'rose',   dot: 'bg-rose-500',   show: engShowEmocional,    toggle: () => setEngShowEmocional(v => !v) },
                  { key: 'variacao_provocativa',   label: 'Variação Provocativa',  color: 'indigo', dot: 'bg-indigo-500', show: engShowProvocativo,   toggle: () => setEngShowProvocativo(v => !v) },
                ].map(({ key, label, color, dot, show, toggle }) => (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEngCopy(engResult[key], key) }}
                          className="text-gray-300 hover:text-gray-600 transition-colors">
                          {engCopied === key ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                        {show ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>
                    {show && (
                      <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3">
                        {engResult[key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Respostas Sugeridas */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                  <MessageCircle size={12} className="text-violet-500" /> Respostas para Comentários
                </p>
                <p className="text-[10px] text-gray-400">Use nos primeiros comentários para ativar conversas</p>
                <div className="space-y-2">
                  {(engResult.respostas_sugeridas || []).map((resp, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-violet-600">{i + 1}</span>
                      </div>
                      <p className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">{resp}</p>
                      <button onClick={() => handleEngCopy(resp, `resp-${i}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-violet-500 transition-all mt-2 shrink-0">
                        {engCopied === `resp-${i}` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota Estratégica */}
              {engResult.nota_estrategica && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Brain size={15} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-violet-600 uppercase mb-1">Nota Estratégica</p>
                    <p className="text-sm text-violet-800 leading-relaxed">{engResult.nota_estrategica}</p>
                  </div>
                </div>
              )}

              {/* Regenerar */}
              <button onClick={generateEngagement} disabled={engLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40">
                <RefreshCw size={13} className={engLoading ? 'animate-spin' : ''} /> Regenerar protocolo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Formulário de Carrossel ── */}
      {mode === 'carousel' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shrink-0">
                <LayoutGrid size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Protocolo de Carrossel</p>
                <p className="text-xs text-gray-400 mt-0.5">Raciocínio em sequência — não template. Cada slide puxa o próximo.</p>
              </div>
            </div>

            {/* Temas Sugeridos */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Temas Sugeridos</p>
              <div className="space-y-1.5">
                {TEMAS_CARROSSEL.map(({ categoria, temas }) => {
                  const isOpen = carOpenCategory === categoria
                  return (
                    <div key={categoria} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setCarOpenCategory(isOpen ? null : categoria)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-orange-50 transition-colors text-left"
                      >
                        <span className="text-xs font-semibold text-gray-700">{categoria}</span>
                        {isOpen ? <ChevronUp size={13} className="text-orange-500 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-3 py-2 space-y-1 bg-white">
                          {temas.map(tema => (
                            <button
                              key={tema}
                              onClick={() => { setCarTema(tema); setCarOpenCategory(null) }}
                              className="w-full text-left text-xs text-gray-600 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              {tema}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                Tema <span className="text-red-400">*</span>
              </label>
              <input
                value={carTema}
                onChange={e => setCarTema(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateCarousel()}
                placeholder="Ex: procrastinação, medo de ser demitido, perfeccionismo no trabalho..."
                className="input text-sm w-full"
              />
            </div>

            {/* Ideia */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Ideia <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setCarGerarIdeia(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    carGerarIdeia ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} /> {carGerarIdeia ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!carGerarIdeia && (
                <textarea value={carIdeia} onChange={e => setCarIdeia(e.target.value)}
                  rows={2} placeholder="Um ângulo, situação ou entrada específica para o carrossel..."
                  className="input text-sm w-full resize-none" />
              )}
              {carGerarIdeia && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-600">
                  <Sparkles size={12} /> A IA vai criar uma ideia específica para o tema
                </div>
              )}
            </div>

            {/* Texto Base */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Texto base <span className="text-gray-300">(opcional)</span>
                </label>
                <button onClick={() => setCarGerarTexto(v => !v)}
                  className={clsx('flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    carGerarTexto ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                  )}>
                  <Sparkles size={10} /> {carGerarTexto ? 'Gerar com IA ✓' : 'Gerar com IA'}
                </button>
              </div>
              {!carGerarTexto && (
                <textarea value={carTexto} onChange={e => setCarTexto(e.target.value)}
                  rows={3} placeholder="Cole um texto, rascunho ou ideia que queira transformar em carrossel..."
                  className="input text-sm w-full resize-none" />
              )}
              {carGerarTexto && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600">
                  <Sparkles size={12} /> A IA vai criar um texto base para o tema
                </div>
              )}
            </div>

            {carError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{carError}</div>
            )}

            <button onClick={generateCarousel} disabled={carLoading || !carTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl hover:from-orange-600 hover:to-rose-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed">
              {carLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando carrossel...</> : <><LayoutGrid size={15} /> Gerar Carrossel</>}
            </button>
          </div>

          {/* ── Output do Carrossel ── */}
          {carResult && (
            <div className="space-y-4 animate-fade-in">

              {/* Validação */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500" /> Validação
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'sem_formula',         label: 'Sem fórmula' },
                    { key: 'sem_repeticao',        label: 'Sem repetição' },
                    { key: 'sem_palavra_generica', label: 'Sem genérico' },
                    { key: 'parece_pensado',       label: 'Parece pensado' },
                  ].map(({ key, label }) => {
                    const ok = carResult.validacao?.[key] === true
                    return (
                      <div key={key} className={clsx('flex flex-col items-center gap-1 p-2 rounded-xl border text-center',
                        ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      )}>
                        <span className={clsx('text-base', ok ? 'text-emerald-500' : 'text-red-400')}>{ok ? '✓' : '✗'}</span>
                        <span className={clsx('text-[9px] font-semibold', ok ? 'text-emerald-700' : 'text-red-600')}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Slides */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={13} className="text-orange-500" />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Slides ({carResult.slides?.length})</span>
                  </div>
                  <button onClick={() => handleCarCopy((carResult.slides || []).map(s => `[${s.numero}] ${s.texto}`).join('\n\n'), 'slides')}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors">
                    {carCopied === 'slides' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar todos</>}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {(carResult.slides || []).map((slide) => (
                    <div key={slide.numero} className="flex items-start gap-3 px-4 py-3 group hover:bg-orange-50/30 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[11px] font-bold text-orange-600">{slide.numero}</span>
                      </div>
                      <p className="flex-1 text-sm text-gray-800 leading-relaxed">{slide.texto}</p>
                      <button onClick={() => handleCarCopy(slide.texto, `slide-${slide.numero}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0 mt-1">
                        {carCopied === `slide-${slide.numero}` ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pergunta Final */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-orange-200">
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold text-white/70 uppercase mb-2 flex items-center gap-1.5">
                    <Quote size={10} /> Pergunta Final
                  </p>
                  <p className="text-base font-bold leading-snug">{carResult.pergunta_final}</p>
                  <button onClick={() => handleCarCopy(carResult.pergunta_final, 'car-pergunta')}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all">
                    {carCopied === 'car-pergunta' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                  </button>
                </div>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 translate-y-8" />
              </div>

              {/* Legenda */}
              {carResult.legenda && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Legenda do Post</span>
                    <button onClick={() => handleCarCopy(carResult.legenda, 'car-legenda')}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors">
                      {carCopied === 'car-legenda' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                    </button>
                  </div>
                  <p className="p-4 text-sm text-gray-700 leading-relaxed">{carResult.legenda}</p>
                </div>
              )}

              {/* Respostas Sugeridas */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                  <MessageCircle size={12} className="text-orange-500" /> Respostas para Comentários
                </p>
                <div className="space-y-2">
                  {(carResult.respostas_sugeridas || []).map((resp, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-orange-600">{i + 1}</span>
                      </div>
                      <p className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">{resp}</p>
                      <button onClick={() => handleCarCopy(resp, `car-resp-${i}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all mt-2 shrink-0">
                        {carCopied === `car-resp-${i}` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota Estratégica */}
              {carResult.nota_estrategica && (
                <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-2xl border border-orange-200 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Brain size={15} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-orange-600 uppercase mb-1">Nota Estratégica</p>
                    <p className="text-sm text-orange-800 leading-relaxed">{carResult.nota_estrategica}</p>
                  </div>
                </div>
              )}

              {/* Regenerar */}
              <button onClick={generateCarousel} disabled={carLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40">
                <RefreshCw size={13} className={carLoading ? 'animate-spin' : ''} /> Regenerar carrossel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Input principal (Studio Livre) ── */}
      {mode === 'studio' && (<>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate() }}
          rows={3}
          placeholder="Descreva o que quer criar...

Ex: 'Reels sobre feminicídio, educativo e reflexivo'
Ex: 'POV de reunião corporativa, humor'
Ex: 'Dicas de IA para quem está começando na carreira'"
          className="w-full text-sm border-0 outline-none resize-none placeholder:text-gray-300 leading-relaxed"
        />

        {/* Brand Linter Panel */}
        {showLinter && input.trim() && (
          <BrandLinterPanel
            text={input}
            onClose={() => setShowLinter(false)}
            onFix={(oldText, newText) => setInput(prev => prev.replace(oldText, newText))}
          />
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Formato + Briefing */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowFormats(!showFormats)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                format ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              )}>
              {format ? FORMATS.find(f => f.id === format)?.label : 'Formato: Auto'} <ChevronDown size={12} />
            </button>
            {format && (
              <button onClick={() => setFormat(null)} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
            )}

            {/* Briefing upload */}
            <input type="file" ref={briefingRef} accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleBriefingUpload} />
            {briefing ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                <Paperclip size={12} />
                <span className="max-w-[120px] truncate">{briefingName}</span>
                <button onClick={() => { setBriefing(''); setBriefingName('') }} className="text-blue-400 hover:text-red-500"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => briefingRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 text-gray-500 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all">
                <Paperclip size={12} /> Anexar briefing
              </button>
            )}
          </div>

          {/* Gerar */}
          {(() => {
            const highSeverityViolations = brandViolations.filter(v => {
              const highPriority = [
                'not-x-but-y', 'ninguem-te-conta', 'a-verdade-e', 'voce-sente',
                'missao-vida', 'jornada-do',
              ]
              return highPriority.includes(v.id)
            })
            const isDisabled = loading || !input.trim() || highSeverityViolations.length > 0

            return (
              <button
                onClick={() => generate()}
                disabled={isDisabled}
                title={highSeverityViolations.length > 0 ? 'Reescreva para remover padrões críticos antes de gerar' : ''}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading && !adjusting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading && !adjusting ? 'Criando...' : 'Criar'}
              </button>
            )
          })()}
        </div>

        {/* Format selector dropdown */}
        {showFormats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button onClick={() => { setFormat(null); setShowFormats(false) }}
              className={clsx('p-2 rounded-lg border text-center text-[10px] font-medium transition-all',
                !format ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              )}>
              Auto-detectar
            </button>
            {FORMATS.map(f => {
              const Icon = f.icon
              return (
                <button key={f.id} onClick={() => { setFormat(f.id); setShowFormats(false) }}
                  className={clsx('flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all',
                    format === f.id ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}>
                  <Icon size={14} />
                  <span className="text-[10px] font-semibold">{f.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Links para ferramentas avançadas */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-300 uppercase font-semibold">Avançado:</span>
          <button onClick={() => navigate('/thoughts')} className="text-[10px] text-gray-400 hover:text-purple-500 flex items-center gap-1 transition-colors">
            <Brain size={10} /> Captura de Pensamento
          </button>
          <button onClick={() => navigate('/generate')} className="text-[10px] text-gray-400 hover:text-orange-500 flex items-center gap-1 transition-colors">
            <Wand2 size={10} /> Explorador de Ideias
          </button>
          <button onClick={() => navigate('/text')} className="text-[10px] text-gray-400 hover:text-emerald-500 flex items-center gap-1 transition-colors">
            <Layers size={10} /> Adaptador Multi-plataforma
          </button>
          <button onClick={() => navigate('/briefing')} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
            <Film size={10} /> Briefing Studio
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
        )}
      </div>

      {/* ── Resultado ── */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Context detection */}
          <div className="flex items-center gap-3 flex-wrap">
            {result.detected_context && (
              <span className={clsx('text-[10px] font-semibold px-2.5 py-1 rounded-md border',
                CONTEXT_COLORS[result.detected_context]?.bg,
                CONTEXT_COLORS[result.detected_context]?.text,
                CONTEXT_COLORS[result.detected_context]?.border,
              )}>
                Tom: {CONTEXT_COLORS[result.detected_context]?.label || result.detected_context}
              </span>
            )}
            {result.detected_context_reason && (
              <span className="text-[10px] text-gray-400 italic">{result.detected_context_reason}</span>
            )}
            {result.suggested_format && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                {FORMATS.find(f => f.id === result.suggested_format)?.label || result.suggested_format}
              </span>
            )}
          </div>

          {/* Título */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">{result.title}</h2>
            <div className="flex gap-1 shrink-0">
              <button onClick={handleFavorite} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Favoritar">
                <Heart size={14} />
              </button>
              <button onClick={handleSaveIdea} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors" title="Salvar como ideia">
                <Save size={14} />
              </button>
            </div>
          </div>

          {/* Títulos sugeridos */}
          {result.title_options?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Títulos Sugeridos (curtos e virais)</p>
              <div className="space-y-1.5">
                {result.title_options.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="text-xs font-bold text-orange-400">{i + 1}.</span>
                    <p className="flex-1 text-sm font-semibold text-gray-800">{t}</p>
                    <button onClick={() => handleCopy(t, `title-${i}`)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all">
                      {copied === `title-${i}` ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo principal — selecione palavras para banir */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Conteúdo</span>
                <span className="text-[9px] text-gray-300">Selecione palavras no texto para banir</span>
              </div>
              <button onClick={() => handleCopy(result.content, 'content')}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-500 transition-colors">
                {copied === 'content' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
              </button>
            </div>
            <div
              className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed select-text"
              onMouseUp={() => {
                const sel = window.getSelection()
                const text = sel?.toString()?.trim()
                if (text && text.length >= 2 && text.length <= 50 && !text.includes('\n')) {
                  setBanCandidate(text)
                  const range = sel.getRangeAt(0)
                  const rect = range.getBoundingClientRect()
                  setBanPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 })
                }
              }}
            >
              {result.content}
            </div>
          </div>

          {/* Popup de banir palavra */}
          {banCandidate && (
            <div className="fixed z-50" style={{ left: banPosition.x - 80, top: banPosition.y - 36 }}>
              <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2 text-xs animate-fade-in">
                <button onClick={() => { addBannedWord(banCandidate); setBanCandidate(null); window.getSelection()?.removeAllRanges() }}
                  className="flex items-center gap-1 hover:text-red-400 transition-colors font-medium">
                  <X size={10} /> Banir "{banCandidate.length > 20 ? banCandidate.slice(0, 20) + '...' : banCandidate}"
                </button>
                <button onClick={() => { setBanCandidate(null); window.getSelection()?.removeAllRanges() }}
                  className="text-gray-400 hover:text-white">
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {/* Palavras banidas */}
          {bannedWords.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-gray-300 uppercase font-semibold">Palavras banidas:</span>
              {bannedWords.map(w => (
                <span key={w} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                  {w}
                  <button onClick={() => removeBannedWord(w)} className="hover:text-red-800"><X size={9} /></button>
                </span>
              ))}
            </div>
          )}

          {/* Dica de filmmaker */}
          {result.filmmaker_tip && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Film size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-amber-700 uppercase mb-0.5">Dica de Filmmaker Mobile</p>
                <p className="text-xs text-amber-800">{result.filmmaker_tip}</p>
              </div>
            </div>
          )}

          {/* Legenda */}
          {result.caption && (
            <div className="bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100">
                <span className="text-[10px] font-semibold text-blue-400 uppercase">Legenda</span>
                <button onClick={() => handleCopy(result.caption + '\n\n' + (result.hashtags || []).join(' '), 'caption')}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-600 transition-colors">
                  {copied === 'caption' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                </button>
              </div>
              <div className="p-3 text-sm text-gray-700 whitespace-pre-wrap">{result.caption}</div>
            </div>
          )}

          {/* Hashtags */}
          {result.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.hashtags.map((tag, i) => (
                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{tag}</span>
              ))}
            </div>
          )}

          {/* Ganchos alternativos */}
          {result.hook_alternatives?.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Ganchos Alternativos</p>
              <div className="space-y-1.5">
                {result.hook_alternatives.map((hook, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <span className="text-[10px] text-gray-300 mt-0.5">{i + 1}.</span>
                    <p className="text-xs text-gray-600 flex-1">{hook}</p>
                    <button onClick={() => handleCopy(hook, `hook-${i}`)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all">
                      {copied === `hook-${i}` ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Controles de iteração ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Iterar</p>

            {/* Regenerar + Dislike */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => generate({ regen: true })} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={loading && !adjusting ? 'animate-spin' : ''} /> Regenerar
              </button>
              <button onClick={handleDislike} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40">
                <ThumbsDown size={12} /> Não gostei
              </button>
              {history.length > 0 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded-lg transition-colors">
                  <History size={12} /> Versões ({history.length})
                </button>
              )}
            </div>

            {/* Ajustar tom */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-300">Ajustar:</span>
              {ADJUSTMENTS.map(adj => {
                const Icon = adj.icon
                return (
                  <button key={adj.id} onClick={() => generate({ adjustment: adj.id })} disabled={loading}
                    className={clsx('flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all disabled:opacity-40',
                      adjusting === adj.id ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}>
                    <Icon size={10} /> {adj.label}
                    {adjusting === adj.id && <Loader2 size={10} className="animate-spin" />}
                  </button>
                )
              })}
            </div>

            {/* Adaptar para outro formato */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-300">Adaptar para:</span>
              {FORMATS.filter(f => f.id !== result.suggested_format).map(f => {
                const Icon = f.icon
                return (
                  <button key={f.id} onClick={() => handleAdapt(f.id)} disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all disabled:opacity-40">
                    <Icon size={10} /> {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Histórico de versões */}
          {showHistory && history.length > 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Versões Anteriores</p>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              {history.map((ver, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">{ver.title}</p>
                    <div className="flex gap-1">
                      <button onClick={() => { setResult(ver); setShowHistory(false) }}
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">Restaurar</button>
                      <button onClick={() => handleCopy(ver.content, `hist-${i}`)}
                        className="text-gray-300 hover:text-gray-500">
                        {copied === `hist-${i}` ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-2">{ver.content?.slice(0, 150)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </>)} {/* fim mode === 'studio' */}

      {/* Reference Explorer */}
      <ReferenceExplorer
        onSelectReference={handleGenerateScriptFromReference}
        onGenerateScript={handleGenerateScriptFromReference}
      />
    </div>
  )
}
