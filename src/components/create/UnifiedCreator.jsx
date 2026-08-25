import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ANTI_AI_FILTER } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'
import { detectCliches } from '../../lib/clicheDetector'
import {
  sweepResult, carouselTextPaths, engagementTextPaths, hookListPaths,
  blockingFindings, countBlocks, SHORT_FIELDS,
  rewriteWithoutCliches as rewriteWithoutClichesBase,
  rewriteShortLines as rewriteShortLinesBase,
  sweepAndFixPaths as sweepAndFixPathsBase,
} from '../../lib/clicheSweep'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown, ChevronRight, ChevronUp,
  Video, LayoutGrid, Type, MessageSquare, Mic, Film, Zap,
  ThumbsDown, Heart, ArrowRight, X, Sliders, Eye, History,
  Brain, Wand2, Layers, PenTool, Target, Plus, Save, Upload, Paperclip,
  MessageCircle, ShieldCheck, Quote, Flame, ToggleLeft, ToggleRight, ExternalLink,
  AlertCircle, Building2,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { buildVoiceContext, buildRegenerateInstruction, buildBannedWordsBlock, buildPositioningBlock } from '../../utils/voiceContext'
import { assertNotTruncated } from '../../utils/aiJson'
import { TEMAS_CARROSSEL, PERSONAL_TEMAS_SUGESTOES } from '../../data/temasCarrossel'
import { checkCoherence } from '../../lib/coherenceCheck'
import { lintText } from '../../utils/brandLinter'
import {
  WORK_CATEGORIES, PERSONAL_CATEGORIES, migrateWorkCategory, migratePersonalCategory,
  categorizeTheme as classifyTheme,
  WORK_NICHE, WORK_CATEGORY_BRIEF, isCltFramed,
} from '../../utils/themeCategories'
import * as pdfjsLib from 'pdfjs-dist'
import BrandLinterPanel from '../linter/BrandLinterPanel'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const LS_KEY = 'cio-anthropic-key'
const DISMISSED_MICROTHEMES_KEY = 'cio-dismissed-personal-microthemes'

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

const NAOMI_EDITORIAL_GUIDE = `
GUIA EDITORIAL — VIDA COM NAOMI:
- Naomi é a bulldog francesa de Karen. Nunca trate Naomi como criança, filha ou ser humano literal.
- O conteúdo mostra a personalidade real dela e a dinâmica entre as duas: manias, rotina, expressões, passeios, visitas, espaços da casa, compras que não funcionaram, pedidos de atenção, banho, veterinário, aprendizados e pequenos rituais.
- Pode haver humor por antropomorfismo leve, como "gerente de rotina", desde que venha de um comportamento canino observável.
- O tom combina conexão, humor seco e afeto. Não infantilize, não use voz de bebê e não seja açucarado.
- Não invente ações da Naomi. Quando faltar uma cena concreta, escreva o roteiro como molde e sinalize o detalhe que Karen precisa completar.
- Pode encerrar com uma pergunta natural para quem também convive com animais, mas nunca force engajamento.

REFERÊNCIA OFICIAL DE TOM PARA REELS SOBRE NAOMI — use o ritmo e a caracterização; só reproduza literalmente quando Karen escolher este mesmo recorte:
GANCHO NA TELA: "Eu achava que tinha uma cachorra. Descobri que tenho uma gerente de rotina."

ROTEIRO:
"A Naomi sabe exatamente a hora de tudo.

A hora de comer. A hora de passear. A hora de receber atenção. E, principalmente, a hora em que eu já trabalhei o suficiente.

Ela não precisa olhar o relógio.

Basta perceber que estou concentrada há tempo demais para começar uma operação cuidadosamente planejada:

primeiro, ela fica me olhando;
depois, suspira dramaticamente;
e, se nada funcionar, posiciona o corpo inteiro no caminho.

Oficialmente, eu organizo a minha rotina.

Na prática, existe uma bulldog fazendo a gestão do meu tempo — e ela não aceita hora extra."

LEGENDA:
"Naomi não conhece metodologias de produtividade. Mas entende muito bem de pausas obrigatórias, comunicação não verbal e gestão por pressão."

CTA:
"Quem também trabalha sob a supervisão de um animal?"

PRINCÍPIO EDITORIAL: Naomi cria conexão, humor e afeto sem ser humanizada de forma açucarada. O charme está na personalidade real dela e na dinâmica entre as duas.`

const isNaomiTheme = (tema = '') =>
  /\bnaomi\b|\bbulldog\b|\bbuldogue\b|\bcachorr(?:a|o|inha|inho)?\b|\bpet\b/i.test(tema)

const PERSONAL_SPECIFICITY_RULES = `
REGRA DE ESPECIFICIDADE — VALE PARA TODOS OS FORMATOS PESSOAIS:
- Escreva em primeira pessoa. Evite "a gente" como sujeito genérico.
- Comece dentro de uma cena pequena e visível. Não comece explicando um conceito.
- Cada bloco precisa conter comportamento, objeto, fala, gesto, lugar ou momento observável.
- Proibido usar abstrações para preencher espaço: "buscar controle", "rotina perfeita", "frustração acumulada", "a vida acontece", "no fim das contas".
- Não invente acontecimentos dramáticos, falas ou sentimentos. Use somente o que o tema informa e os fatos presentes neste guia.
- Se faltar um detalhe pessoal indispensável, escreva [Karen: conte aqui o detalhe real] em vez de fabricar.
- Não transforme a cena em lição, exercício, conselho, produtividade ou conteúdo profissional.
- Só inclua Naomi quando o tema ou os detalhes fornecidos mencionarem Naomi, bulldog, cachorro ou pet. Ela nunca entra como enfeite em temas de casa, fé, compras, repertório ou vida adulta.
- O final deve ser uma observação, uma imagem, uma pergunta natural ou humor seco. Nunca um resumo moral.
- Antes de entregar, teste: isto parece uma lembrança ou observação da Karen, ou um texto que serviria para qualquer pessoa? Se servir para qualquer pessoa, reescreva.`

/* ── Master Prompt Pessoal (Studio Pessoal — vida fora do trabalho) ── */
const PERSONAL_MASTER_PROMPT = `Você é um assistente especializado em criar conteúdo PESSOAL para Karen Santos (@karensantosperfil).
Neste modo Karen NÃO é a consultora tech nem a mentora de carreira. Aqui ela é a pessoa fora do trabalho: a casa, a Naomi (buldogue francês), a fé, as comprinhas, os hobbies, as coisas banais do dia que a tornam humana.

IDENTIDADE: "Do lado de cá" — histórias, gostos e pequenas descobertas da vida fora do trabalho.
OBJETIVO: conexão real, não autoridade. O leitor precisa sentir "eu também", não "que profissional incrível". Mostrar a pessoa sem transformar intimidade em vitrine.

REGRAS DESTE MODO:
- PROIBIDO enquadrar pelo trabalho: nada de carreira, tecnologia, mentoria, liderança, produtividade ou lição profissional disfarçada. Se o tema puxar pra trabalho, puxa de volta pra vida.
- Banal é o ponto, não o problema. Uma comprinha, uma mania, um perrengue doméstico valem post — a força está no detalhe específico (nome do produto, hora do dia, o que a Naomi fez), não em moral da história.
- Compartilhe prioritariamente a experiência de Karen. Não invente falas, sentimentos, conflitos ou informações privadas de terceiros. Naomi é sua bulldog francesa, nunca uma criança.
- Vulnerabilidade só quando carrega informação real e já pode ser narrada com segurança: o que ela sentiu, o que não resolveu, o que ainda não entende. Vulnerabilidade performada ("confesso que...") é proibida.
- Nem todo conteúdo precisa ensinar. Ele pode aproximar, divertir, registrar uma percepção ou provocar identificação.
- Não force CTA. Quando fizer sentido, encerre com uma pergunta curta de conversa; caso contrário, use observação seca, detalhe concreto ou piada — nunca moral.
- Comece em uma cena concreta, desenvolva uma percepção pessoal e termine deixando companhia, não necessariamente uma conclusão.

FORMATOS EDITORIAIS RECORRENTES:
- Uma coisa sobre mim; Pequenas alegrias; Confissões de pessoa física; Isso ficou comigo.
- Testado na vida real; Cena de uma vida comum; Não tenho uma conclusão; Karen recomenda.
- Eu achava que seria diferente; Coisas que estou aprendendo devagar.

${PERSONAL_SPECIFICITY_RULES}

RECONHECIMENTO AUTOMÁTICO DE CONTEXTO:
- Momento íntimo, fé, sentimento, algo não resolvido → Tom Diário
- Cena do dia, perrengue, comprinha, mania, Naomi → Tom Cotidiano
- Algo que ela viu ou notou no mundo, sem ser corporativo → Tom Observação

TONS DE VOZ:
1. DIÁRIO: primeira pessoa, confessional de verdade, como quem conta pra amiga próxima. Pode terminar sem resposta.
2. COTIDIANO: leve, engraçado, autoirônico, cheio de detalhe específico.
3. OBSERVAÇÃO: curiosa, sem julgamento, termina em constatação seca.

NUNCA FAZER:
- Transformar a vida em conteúdo de marca, romantizar rotina, estetizar demais, moral da história, gancho de dor profissional, falsa espontaneidade ensaiada`

/* ── Categorias do Banco de Temas pessoal ── */

/* ── Formatos ── */
const FORMATS = [
  { id: 'reels', label: 'Reels', icon: Video, desc: '30-60s roteiro com cenas', color: 'from-purple-500 to-pink-500' },
  { id: 'carrossel', label: 'Carrossel', icon: LayoutGrid, desc: '5-10 slides', color: 'from-orange-500 to-red-500' },
  { id: 'caption', label: 'Caption', icon: Type, desc: 'Instagram/LinkedIn', color: 'from-blue-500 to-cyan-500' },
  { id: 'thread', label: 'Thread', icon: MessageSquare, desc: 'Twitter/X', color: 'from-gray-700 to-gray-900' },
  { id: 'stories', label: 'Stories', icon: Film, desc: 'Sequência de stories', color: 'from-amber-500 to-orange-500' },
]

/* Rótulos dos campos no relatório da varredura anti-clichê */
const FIELD_LABELS = {
  content: 'Conteúdo',
  caption: 'Legenda',
  title: 'Título',
  title_options: 'Título sugerido',
  hook_alternatives: 'Gancho',
}

/* Relatório da varredura: o que a reescrita não conseguiu resolver.
   O filtro corrige sozinho, mas nunca esconde o que sobrou. */
/* Relatório da varredura anti-clichê: o que a reescrita automática não
   resolveu. Com `onBan`, cada trecho apontado ganha um botão "Banir" — vira
   proibição permanente em vez de sumir depois de uma geração. */
function SweepReportPanel({ report, onBan, bannedWords = [] }) {
  if (!report?.remaining?.length) return null
  const total = countBlocks(report.remaining)
  const isBanned = (match) => bannedWords.some((w) => w.toLowerCase() === match.toLowerCase())

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5">
      <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
        <AlertCircle size={12} />
        {total} clichê{total > 1 ? 's' : ''} que a reescrita não resolveu
        {report.fixed > 0 && (
          <span className="font-normal text-amber-600">· {report.fixed} já corrigido{report.fixed > 1 ? 's' : ''}</span>
        )}
      </p>
      {report.remaining.map((f, i) => (
        <p key={i} className="text-[11px] text-amber-700 leading-relaxed">
          <span className="font-medium">
            {f.label || FIELD_LABELS[f.field] || f.field}
            {f.index != null ? ` ${f.index + 1}` : ''}
          </span>
          {f.blocks.map((h, j) => (
            <span key={j} className="inline-flex items-center">
              {j === 0 ? ' — ' : ' · '}
              {h.slide ? `${h.slide}: ` : ''}“{h.match}”
              {onBan && (
                isBanned(h.match) ? (
                  <span className="ml-1 text-[9px] font-semibold text-emerald-600">banido</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBan(h.match)}
                    title="Banir esta frase — o app vai evitá-la em todas as próximas gerações"
                    className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    banir
                  </button>
                )
              )}
            </span>
          ))}
        </p>
      ))}
      <p className="text-[10px] text-amber-600 pt-0.5">
        Regenere ou edite esses trechos à mão — o filtro não sobrescreve sem você ver.
      </p>
    </div>
  )
}

/* O item de linguagem_robotica do Revisor chega como "trecho" ou como
   "trecho" — Rótulo da regra (quando vem do detector determinístico, ver
   revisorAnalyze). O botão Banir precisa só do trecho, não do rótulo. */
const extractBannablePhrase = (t) => (t || '').split(' — ')[0].replace(/^"|"$/g, '').trim()

/* Ban manual reutilizável — mesma peça em Revisor, Studio Livre, Reels,
   Carrossel e Stories, pra que banir uma frase funcione igual em qualquer aba. */
function BannedWordsBox({ bannedWords, onAdd, onRemove, hint }) {
  const [value, setValue] = useState('')
  const submit = () => { if (value.trim()) { onAdd(value.trim()); setValue('') } }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
        Frases Banidas <span className="text-gray-300 font-normal">{hint || '(a IA evita estas expressões em qualquer aba)'}</span>
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder='Ex: "Em resumo", "Não é à toa que..."'
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 placeholder:text-gray-300"
        />
        <button
          onClick={submit}
          className="px-3 py-1.5 text-xs font-medium bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          Banir
        </button>
      </div>
      {bannedWords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bannedWords.map((phrase) => (
            <span key={phrase} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">
              "{phrase.length > 35 ? phrase.slice(0, 35) + '...' : phrase}"
              <button onClick={() => onRemove(phrase)} className="hover:text-red-800 shrink-0"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const VEREDITO_STYLES = {
  aumenta: { label: 'Aumenta a associação', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  dilui: { label: 'Dilui a associação', cls: 'bg-red-50 border-red-200 text-red-700' },
  neutro: { label: 'Neutro', cls: 'bg-gray-50 border-gray-200 text-gray-600' },
}

/**
 * Verificador de coerência do Posicionamento — não-bloqueante: manda o
 * rascunho pra IA e mostra o veredito, mas quem decide se ajusta é o
 * criador. Complementa a varredura determinística do SweepReportPanel.
 */
function CoherenceChecker({ text, posicionamento }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const hasTesteCoerencia = !!posicionamento?.teste_coerencia?.trim()

  const run = async () => {
    const apiKey = localStorage.getItem(LS_KEY) || ''
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await checkCoherence(apiKey, text, posicionamento)
      setResult(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!text?.trim()) return null

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
        Checar coerência com o Posicionamento
      </button>
      {!hasTesteCoerencia && (
        <p className="text-[10px] text-gray-300">Sem teste de coerência definido em /posicionamento — a checagem usa bom senso.</p>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {result && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 space-y-2">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${VEREDITO_STYLES[result.veredito].cls}`}>
            {VEREDITO_STYLES[result.veredito].label}
          </span>
          {result.justificativa && <p className="text-[11px] text-gray-600 leading-relaxed">{result.justificativa}</p>}
          {result.frases_lista_negra_encontradas.length > 0 && (
            <p className="text-[11px] text-red-600">
              <span className="font-medium">Frases banidas encontradas: </span>
              {result.frases_lista_negra_encontradas.map((f) => `"${f}"`).join(', ')}
            </p>
          )}
          {result.ajustes.length > 0 && (
            <ul className="text-[11px] text-gray-600 space-y-1 list-disc pl-4">
              {result.ajustes.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

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
- Slide 1: abertura concreta — uma cena, um número ou uma consequência real. NÃO use frase de efeito, promessa de revelação ("o segredo de…", "a verdade sobre…", "o que ninguém te conta") nem pergunta retórica.
- Slides 2-8: Desenvolvimento com 1 ideia por slide
- Slides 9-10: Conclusão + CTA
- Inclua: texto exato de cada slide, sugestão visual por slide
- Legenda para o post + 5-8 hashtags

REGRA ESPECÍFICA DO CARROSSEL — o formato empurra para o clichê porque cada slide
pede uma frase curta de impacto. Cada slide é uma unidade de leitura e precisa
passar sozinho no filtro de autenticidade:
- Um slide inteiro nunca é só uma frase de efeito. Se o slide não tem informação
  (dado, cena, critério, consequência), ele não existe — corte e junte com outro.
- Proibido o slide construído por contraste corretivo: "não é X, é Y", "não se
  trata de X", "mais do que X, é Y". Afirme direto o que é.
- Proibido slide de pergunta retórica no meio do carrossel ("já parou pra pensar…").
  Pergunta só no último slide, e sendo pergunta direta que a pessoa consegue
  responder no comentário — não convite genérico à reflexão.
- Proibida a escadinha de negações em slides seguidos ("Não é A." / "Não é B." / "É C.").
- Último slide: útil sozinho. Se a pessoa fechar o carrossel sem salvar, ela tem
  que perder alguma coisa concreta.`,
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
- Qualquer forma de "não é X, é Y" — "não é só X, é Y", "não é sobre X, é sobre Y", "isto não é X, é Y", "não é insegurança, é..." — contraste corretivo em qualquer posição do roteiro, não só na abertura
- Frases: "o mais curioso é" / "ninguém fala sobre isso" / "em um mundo…" / "a verdade é…" / "o segredo é…"
- Referências a anos específicos ("em 2025", "em 2024", "no mundo de 2025") — escreva como observação atemporal
- Palavras: insights, crucial, essencial, fundamental, revolucionário, inspirador, valioso, significativo, otimizar, navegar, mergulhar
- Listas em escadinha repetitiva
- Frases de efeito genéricas
- Tom professoral ou frases prontas de coach
- Estrutura previsível
- Travessão para criar pausa dramática ("dá uma hesitada", "e ao mesmo tempo —") — se o travessão está ali só pra soar contido, corte ou reescreva em frase reta
- Três ou mais frases curtas e simétricas seguidas ("Essa hesitada tem história. Faz sentido ela existir.") — ritmo de sermão de coach, quebre o paralelismo

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

AJUSTE FINO DE TOM (proteção de risco):
O tema pode ser sensível. O risco não é o tema — é o tom.
- Evitar generalizações com sujeito explícito ("empresa faz isso", "gestor faz X", "as pessoas fazem Y")
- Evitar culpados nomeados — explícitos ou implícitos
- Entrada observacional e acolhedora, mas NUNCA a mesma fórmula duas vezes: comece direto na cena específica (o que a pessoa fez, viu ou disse), não numa frase-molde genérica que caberia em qualquer tema
  ❌ Proibido como abertura: "tem uma coisa que acontece", "já reparou que", "muita gente passa por isso" — são bengalas de abertura, viram o próprio clichê de tanto repetir
  ✅ Comece na cena: "Você fecha o preço, revisa duas vezes e deixa a proposta parada duas horas antes de mandar."
- Descrever o fenômeno sem atribuir culpa a ninguém

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

EXERCÍCIO PRÁTICO — REGRAS OBRIGATÓRIAS:
- Máximo 2 frases
- SEMPRE no passado ou presente imediato — NUNCA "na próxima vez que", "quando acontecer", "da próxima vez"
- SEMPRE sobre comportamento próprio — NUNCA observação dos outros
- Deve ser impossível responder sem acessar uma memória específica da própria pessoa
- A primeira frase acessa a memória. A segunda pede que a pessoa nomeie um comportamento dela.

EXEMPLOS DE EXERCÍCIO CORRETO:
✅ "Pensa na última mudança de sistema que chegou no seu trabalho. Você perguntou o porquê antes de começar a usar ou só foi se adaptando?"
✅ "Lembra de uma decisão que você adiou por semanas. O que te fez agir no final — ou você ainda não agiu?"
✅ "Pensa no último feedback que você recebeu e não aplicou. O que te impediu?"

EXEMPLOS DE EXERCÍCIO ERRADO:
❌ "Na próxima vez que acontecer, observe as pessoas ao redor."
❌ "Tente notar quando isso aparecer na sua semana."
❌ "Repare na reação dos colegas quando isso acontecer."

VALIDAÇÃO INTERNA (antes de entregar — ser honesto):
- Parece algo que uma pessoa falaria ou um texto que foi escrito?
- Tem alguma frase que parece pronta ou genérica?
- Está explicando demais?
- Dá espaço pra pessoa completar o pensamento?
- O exercício acessa memória específica ou é genérico?
Se houver qualquer sinal de artificialidade → reescrever completamente.

CRITÉRIO FINAL: Se parecer escrito por IA → falhou. Se parecer um post bonito → falhou. Se parecer uma observação real → passou.`

const buildHookSystem = (isPessoal) => `Você gera hooks de abertura para reels de Karen Santos.

${isPessoal
    ? `Neste modo Karen NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, a Naomi, fé, comprinhas, hobbies, o cotidiano que a torna humana. PROIBIDO puxar pra carreira, tecnologia ou mundo corporativo. Tom: próximo, humano, sem performar autoridade.\n${PERSONAL_SPECIFICITY_RULES}`
    : `Karen Santos é consultora tech, especialista em IA para negócios. Tom: analítico, seco, sem floreio. ${WORK_NICHE}`}

REGRA CENTRAL:
O hook prende porque é específico e real — não porque promete revelação ou usa drama.

TRÊS TIPOS DE HOOK VÁLIDOS:

Tipo 1 — OBSERVAÇÃO CORTANTE:
Nomeia algo que a pessoa faz mas nunca colocou em palavras. Sem prometer nada. Sem drama.
${isPessoal ? `Exemplo: "Você provavelmente já fingiu que ia limpar a casa inteira e só arrumou uma gaveta."
Exemplo: "Tem uma coisa que você faz com seu pet que você nunca vai admitir em voz alta."` : `Exemplo: "Você provavelmente já justificou ficar num emprego ruim usando o mesmo argumento três vezes."
Exemplo: "Tem uma postura que você adota em reunião que você nunca vai admitir em voz alta."`}

Tipo 2 — DADO + LEITURA INESPERADA:
Número ou fato real seguido de interpretação que vai contra o óbvio. Sem inventar dados.
${isPessoal ? `Exemplo: "A maioria das pessoas pede mais no jogo de búzios do que reza sozinha em casa. Eu incluída."
Exemplo: "Quanto mais cara a comprinha, menos eu conto pra alguém quanto custou."` : `Exemplo: "A maioria das pessoas pede demissão depois de uma promoção. Não antes."
Exemplo: "Quanto mais sênior o cargo, menos a pessoa consegue explicar o que faz."`}

Tipo 3 — CENA ESPECÍFICA:
Começa no meio de uma situação concreta que a pessoa reconhece imediatamente. Sem setup, sem contexto.
${isPessoal ? `Exemplo: "A Naomi está me encarando. Eu já sei o que ela quer. Finjo que não sei."
Exemplo: "O carrinho ficou parado no site três dias. Hoje eu comprei."` : `Exemplo: "Você está numa reunião. Discorda de tudo. Não fala nada."
Exemplo: "A ferramenta nova chegou segunda. Você ainda está usando a antiga sexta."`}

LISTA NEGRA — NUNCA usar nesses hooks:
- "Isso aqui ninguém fala"
- "A verdade que quase me fez desistir"
- "Você vai se arrepender se ignorar isso"
- "O segredo que ninguém te conta"
- "Parece bobo mas muda tudo"
- Qualquer promessa de revelação
- Qualquer drama ou urgência artificial
- Tom de coach ou motivacional

INDICAÇÃO VISUAL — obrigatória em cada hook:
- Enquadramento: close no rosto / meio corpo / câmera de baixo pra cima / costas virando
- Texto na tela: o que aparece escrito nos primeiros 2 segundos (pode ser a frase inteira ou só a palavra de impacto)
- Movimento: estática / zoom lento / corte brusco / pan lateral

INDICAÇÃO SONORA — obrigatória em cada hook:
- Trilha: sem trilha (só voz) / trilha ambiente baixa / corte brusco de som / silêncio intencional
- Efeito: nenhum / batida / corte seco

CRITÉRIO DE APROVAÇÃO:
Antes de entregar, responda: "Essa frase prende porque é específica e reconhecível, ou porque promete algo?"
Se promete → reprova. Se é específica e reconhecível → aprovado.`

/* ── Fórmulas de Gancho de Referência — padrões sintáticos (não frases prontas)
   que sobreviveram ao filtro anti-clichê de Karen: sem "ninguém fala/conta",
   sem hedge ("talvez", "acho que"), sem clickbait manipulador, sem hype vago
   ("isso muda tudo"). Servem de referência de MOLDE pro gerador de ganchos —
   nunca pra copiar a frase literal, sempre preenchida com o tema específico. ── */
const HOOK_FORMULAS = [
  { formula: 'Você não precisa de mais [coisa que todo mundo empilha].', exemplo: 'Você não precisa de mais dashboard. Precisa de um critério pra decidir o que olhar nele.' },
  { formula: 'Você está complicando [algo específico que devia ser simples].', exemplo: 'Você está complicando uma decisão que só precisava de um critério, não de uma planilha nova.' },
  { formula: 'Isso não é chamativo, mas [o que resolveu de verdade].', exemplo: 'Isso não é chamativo, mas foi o que salvou o mês desse cliente.' },
  { formula: 'Uma decisão [específica] mudou [consequência concreta].', exemplo: 'Uma decisão de preço mudou o resultado inteiro desse contrato.' },
  { formula: 'Preciso falar sobre [algo específico e direto, sem hedge].', exemplo: 'Preciso falar sobre o motivo real de vocês não fecharem aquele contrato.' },
  { formula: 'Você está prestando atenção em [coisa errada], não em [coisa certa].', exemplo: 'Você está prestando atenção no preço do concorrente, não no motivo de perder cliente.' },
  { formula: 'Você provavelmente está deixando passar [algo específico].', exemplo: 'Você provavelmente está deixando passar o dado que já respondeu essa pergunta.' },
  { formula: 'O conselho que [público] segue é o que [consequência negativa específica].', exemplo: 'O conselho que todo mundo segue pra precificar é exatamente o que te deixa preso na média do mercado.' },
]

const buildHookPrompt = (tema, roteiro, isPessoal) => `
TEMA DO REELS: ${tema}
${roteiro ? `ROTEIRO JÁ GERADO:\n${roteiro.slice(0, 800)}` : ''}
${isPessoal && isNaomiTheme(tema) ? NAOMI_EDITORIAL_GUIDE : ''}

FÓRMULAS DE GANCHO DE REFERÊNCIA — use como molde de PADRÃO SINTÁTICO, nunca copie a frase literal nem o exemplo. Preencha cada colchete com algo específico do tema acima, não genérico:
${HOOK_FORMULAS.map(h => `- "${h.formula}" (ex.: "${h.exemplo}")`).join('\n')}

Gere 3 hooks de abertura para este reels — um de cada tipo. Pelo menos um dos 3 deve se inspirar numa das fórmulas acima; os outros podem seguir livres, desde que sigam as mesmas regras.

Cada hook deve:
- Prender nos primeiros 1-3 segundos
- Ser compatível com o tom de Karen Santos (${isPessoal ? 'próximo, humano, sem performar autoridade — vida fora do trabalho' : 'analítico, seco, sem floreio'})
- Ter indicação visual e sonora específica
- NÃO usar clickbait, drama ou promessa de revelação

Responda EXCLUSIVAMENTE com JSON válido:
{
  "hooks": [
    {
      "tipo": "observacao_cortante",
      "frase": "a frase exata de abertura — 1 linha",
      "texto_na_tela": "o que aparece escrito na tela nos primeiros 2 segundos",
      "enquadramento": "instrução de câmera específica",
      "movimento": "instrução de movimento de câmera",
      "som": "instrução de trilha e efeito sonoro",
      "por_que_funciona": "1 frase — por que essa frase prende sem clickbait"
    },
    {
      "tipo": "dado_leitura_inesperada",
      "frase": "a frase exata de abertura — dado + interpretação",
      "texto_na_tela": "o que aparece escrito na tela nos primeiros 2 segundos",
      "enquadramento": "instrução de câmera específica",
      "movimento": "instrução de movimento de câmera",
      "som": "instrução de trilha e efeito sonoro",
      "por_que_funciona": "1 frase — por que essa frase prende sem clickbait"
    },
    {
      "tipo": "cena_especifica",
      "frase": "a frase exata de abertura — cena concreta, sem setup",
      "texto_na_tela": "o que aparece escrito na tela nos primeiros 2 segundos",
      "enquadramento": "instrução de câmera específica",
      "movimento": "instrução de movimento de câmera",
      "som": "instrução de trilha e efeito sonoro",
      "por_que_funciona": "1 frase — por que essa frase prende sem clickbait"
    }
  ]
}`

const buildEngagementPrompt = ({ tema, ideia, texto, gerarIdeia, gerarTexto, template }) => `
TEMA: ${tema}
${ideia && !gerarIdeia ? `IDEIA: ${ideia}` : ''}
${texto && !gerarTexto ? `TEXTO BASE:\n${texto}` : ''}
${gerarIdeia ? 'Crie uma ideia criativa para este tema — específica e concreta, não abstrata.' : ''}
${gerarTexto ? 'Crie um texto base para este tema — como observação real, não como artigo.' : ''}
${template ? `\nESTRUTURA DE ROTEIRO: ${template.label}\n${template.estrutura}\nEssa estrutura substitui o passo 1 (roteiro principal) abaixo — siga exatamente essa sequência de partes em vez da sequência genérica situação/comportamento/leitura/tensão/pergunta. Os passos seguintes (variação emocional, variação provocativa, exercício prático, validação) continuam se aplicando normalmente sobre o roteiro gerado nessa estrutura.\n` : ''}

Execute o protocolo:
1. ROTEIRO PRINCIPAL: ${template ? `siga a ESTRUTURA DE ROTEIRO definida acima (${template.label}).` : 'situação específica → comportamento observável → leitura curta → tensão implícita → pergunta natural. 6 a 8 blocos curtos. Sem frases prontas. Sem explicação excessiva.'}
2. VARIAÇÃO EMOCIONAL (mudança real — mais próxima, mais íntima — não cosmética)
3. VARIAÇÃO PROVOCATIVA (mudança real — mais desconfortável, mais direta — não cosmética)
4. EXERCÍCIO PRÁTICO: máximo 2 frases. Sempre no passado ou presente imediato. Sempre sobre comportamento próprio. Impossível responder sem memória específica.
5. Valide internamente os 4 critérios — reescreva se qualquer um falhar
6. Entregue apenas versões aprovadas

IMPORTANTE: os passos acima são um processo mental, não texto de saída. Não escreva raciocínio, rascunho, autocrítica ou notas de validação na resposta — faça isso em silêncio e entregue direto o resultado final. A resposta inteira deve ser o objeto JSON abaixo, sem nenhum texto antes ou depois, começando direto com "{".

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": "roteiro completo (use \\n para quebras)",
  "variacao_emocional": "variação emocional completa",
  "variacao_provocativa": "variação provocativa completa",
  "pergunta_final": "apenas a pergunta final — natural, como conversa",
  "exercicio_pratico": "exercício em 2 frases máximo — no passado ou presente imediato, sobre comportamento próprio, acessa memória específica",
  "respostas_sugeridas": ["resposta natural para comentários 1", "resposta natural para comentários 2"],
  "nota_estrategica": "em 1 frase: por que a variação provocativa é mais forte que a principal neste tema específico",
  "validacao": {
    "parece_real": true,
    "sem_frases_prontas": true,
    "sem_excesso_explicacao": true,
    "espaco_aberto": true,
    "exercicio_acessa_memoria": true
  }
}`

const buildPersonalReelsPrompt = ({ tema, ideia, texto, template }) => `
Crie um Reel pessoal para Karen Santos.

TEMA: ${tema}
${ideia ? `RECORTE INFORMADO POR KAREN: ${ideia}` : ''}
${texto ? `DETALHES REAIS INFORMADOS POR KAREN:\n${texto}` : ''}

${PERSONAL_SPECIFICITY_RULES}
${isNaomiTheme(`${tema} ${ideia || ''} ${texto || ''}`) ? NAOMI_EDITORIAL_GUIDE : ''}
${template ? `
ESTRUTURA ESCOLHIDA: ${template.label}
OBJETIVO: ${template.desc}
${template.estrutura}

Esta estrutura substitui a sequência genérica abaixo. Siga seus movimentos na ordem e faça o roteiro soar pessoal, vivido e específico para o tema.` : ''}

O roteiro principal deve ter entre 30 e 60 segundos e ${template ? 'seguir rigorosamente a estrutura escolhida acima' : `seguir:
1. Gancho na tela que já entra na cena.
2. Situação concreta em primeira pessoa.
3. Dois ou três comportamentos observáveis em progressão.
4. Minha reação, sem explicar demais.
5. Fechamento com imagem concreta ou humor seco.`}

Não crie exercício prático. Não tente ensinar. Não use linguagem de análise, controle, produtividade ou desenvolvimento pessoal. A variação emocional deve ser mais afetiva, não melodramática. A variação de humor seco deve observar a mesma cena por outro ângulo, sem crueldade.

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": "roteiro completo com GANCHO NA TELA e falas, usando \\n para quebras",
  "variacao_emocional": "versão mais afetiva e contida da mesma cena",
  "variacao_provocativa": "versão com humor mais seco da mesma cena",
  "pergunta_final": "pergunta curta e natural, ou string vazia se não combinar",
  "exercicio_pratico": "",
  "respostas_sugeridas": ["resposta natural 1", "resposta natural 2"],
  "nota_estrategica": "qual detalhe concreto impede o roteiro de ser genérico",
  "validacao": {
    "parece_real": true,
    "sem_frases_prontas": true,
    "sem_excesso_explicacao": true,
    "espaco_aberto": true,
    "exercicio_acessa_memoria": true
  }
}`

/* ── Master Prompt — Gerador de Carrossel (Karen Santos) ── */
const buildCarouselSystem = (isPessoal) => `Você é um gerador de carrossel para Karen Santos. ${isPessoal
    ? `Neste modo Karen NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, a Naomi, fé, comprinhas, hobbies, o cotidiano que a torna humana. PROIBIDO puxar pra carreira, tecnologia, produtividade ou mundo corporativo. Sem floreio, mas com calor humano — não é conteúdo institucional.\n${PERSONAL_SPECIFICITY_RULES}`
    : `Designer com 10+ anos, especialista em IA para negócios. Analítica, técnica, sem floreio. ${WORK_NICHE}`}
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
  Em temas de ferramenta/processo, o mesmo erro aparece disfarçado de "problema real":
  ❌ "A gente perde horas do dia digitando a mesma resposta pra clientes" (descreve a situação de fora, não o que você sente sobre isso)
  ✅ "Tem uma parte do meu trabalho que eu terceirizo e finjo que não me incomoda" (o estado interno por trás da situação, não a situação em si)
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
- Referências a anos específicos ("em 2025", "em 2024") → datado, parece artigo de blog
- Três ou mais frases curtas em sequência → ritmo de sermão de coach
- Travessões para dar impacto → artificialidade
- "Mindset", "Propósito", "Transformação" → jargão vago
- "Vamos juntos?", "Concorda?" → fecha a conversa
- Nota estratégica com "vulnerabilidade universal" → critério de conta motivacional

EXERCÍCIO PRÁTICO — REGRAS OBRIGATÓRIAS:
- Vai na legenda, depois da observação seca de 1 linha
- Máximo 2 frases
- SEMPRE no passado ou presente imediato — NUNCA "na próxima vez que", "quando acontecer"
- SEMPRE sobre comportamento próprio — NUNCA observação dos outros
- Deve ser impossível responder sem acessar uma memória específica

EXEMPLOS DE EXERCÍCIO CORRETO:
✅ "Pensa na última ferramenta nova que chegou no seu trabalho sem explicação. Você ainda usa o sistema antigo em paralelo? Há quanto tempo?"
✅ "Lembra de uma decisão que você tomou sob pressão e se arrependeu. O que você sabia antes de decidir que ignorou?"

EXEMPLOS DE EXERCÍCIO ERRADO:
❌ "Na próxima vez que chegarem com ferramenta nova, observe a reação das pessoas."
❌ "Tente notar quando isso aparecer no seu trabalho."

LEGENDA:
Estrutura: apenas 1 linha de observação seca.
A observação seca não resume o carrossel nem entrega a conclusão.
NÃO inclua o exercício prático na legenda — ele já aparece em campo separado (exercicio_pratico) e será exibido isoladamente. Repeti-lo na legenda duplica o mesmo texto na tela.

EXEMPLO DE LEGENDA COMPLETA:
"implementar sem explicar o porquê cria usuários, não parceiros"

RESPOSTAS PARA COMENTÁRIOS:
Gere 3 respostas no estilo Karen. A função não é fechar — é puxar mais fundo.
  Pessoa: "já passei por isso" → Karen: "o que te fez perceber na hora?"
As respostas devem ser perguntas abertas que pedem mais história, não confirmações ou explicações.

CTA FECHADO:
Todo carrossel deve ter um CTA de escolha binária — não uma pergunta aberta. O formato é:
  ✅ "Você prefere: saber a verdade tarde ou não saber nunca?"
  ✅ "Você faz isso: na hora ou guarda pra depois?"
  ✅ "Isso acontece mais: no começo do projeto ou quando está quase pronto?"
  ❌ "O que você faz quando isso acontece?" (pergunta aberta — proibida no CTA fechado)
  ❌ "Conta nos comentários" (vago, sem estrutura binária)
  ❌ Reformular a pergunta final com outras palavras (ex.: pergunta final "você calculou antes ou depois de assinar?" → CTA "você calculou antes ou depois que o pagamento caiu?" — é a MESMA pergunta, proibido)
O CTA fechado é diferente da pergunta final, sobre um ASSUNTO diferente dentro do mesmo tema — não uma reformulação. A pergunta final pede relato de uma situação específica. O CTA fechado pede posição sobre um comportamento ou preferência geral.

CRITÉRIOS DE VALIDAÇÃO — rode os seis testes antes de entregar:
Teste 1 — Espaço: "Essa sequência deixa espaço pra pessoa completar com a experiência dela, ou fecha tudo?" Se fecha → reprova.
Teste 2 — Tipo de comentário: "O comentário mais provável começa com 'eu' e tem mais de uma linha?" Se não → reprova.
Teste 3 — Saturação: "Esse conteúdo poderia estar naquele print de posts saturados de IA ou de coach?" Se sim → reprova. Reescreva do zero.
Teste 4 — Posicionamento: "Tem algo aqui que só Karen Santos diria, ou qualquer conta de carreira poderia ter postado?" Se qualquer conta postaria → reprova.
Teste 5 — Exercício: "O exercício na legenda acessa memória específica ou é genérico/futuro?" Se genérico → reprova.
Teste 6 — Tutorial: "Esse slide mostra o que a ferramenta FAZ (manual de recursos), ou mostra o que Karen DECIDIU, testou, rejeitou ou desconfia nela?" Se é só a função da ferramenta, sem julgamento nenhum, reprova — reescreva incluindo o risco, o limite ou a razão da escolha. Uma sequência tipo "ferramenta A faz X, ferramenta B faz Y, ferramenta C faz Z" é tutorial de stack técnico, não é o gerador de Karen — mesmo que a estrutura causal (cada slide resolve o limite do anterior) esteja tecnicamente certa.
  ❌ "O n8n conecta esse agente inteligente ao banco de dados interno para consultar o estoque físico em tempo real." (só descreve a função — qualquer conta de automação postaria isso)
  ✅ "O n8n resolve a consulta de estoque, mas eu não deixo ele decidir sozinho quando avisar o cliente — isso ainda passa pela minha mão." (mostra o julgamento, o limite que Karen impõe, não só a integração)

TESTE DE SANIDADE FINAL:
Se você leu o output e pensou "ficou bonito" → provavelmente falhou.
Se você leu e pensou "isso vai incomodar alguém" → provavelmente funcionou.`

const buildCarouselPrompt = ({ tema, ideia, texto, gerarIdeia, gerarTexto, template, targetER }) => `
TEMA: ${tema}
${ideia && !gerarIdeia ? `IDEIA: ${ideia}` : ''}
${texto && !gerarTexto ? `TEXTO BASE:\n${texto}` : ''}
${gerarIdeia ? 'Crie uma ideia específica e concreta para este tema — não abstrata.' : ''}
${gerarTexto ? 'Crie um texto base para este tema — como pensamento em voz alta, não como artigo.' : ''}
${template ? `LENTE DE CONTEÚDO: ${template.label} (alavanca: ${template.alavanca})\n${template.estrutura}\nEssa lente define o CONTEÚDO de cada um dos 5 slides — a estrutura de abertura/desenvolvimento causal/virada sem resolução das 3 versões continua sendo exatamente a mesma. Não crie capa, lista resolvida, resumo ou CTA de "salva" fora dos campos legenda/exercicio_pratico/cta_fechado já definidos abaixo — isso duplicaria e achataria o carrossel.` : ''}
${targetER ? `META DE E/R: ${targetER}%. Essa meta é resultado indireto da qualidade da tensão e da alavanca (${template?.alavanca || 'salvamento ou comentário'}) já embutida no cta_fechado e no exercicio_pratico — NÃO adicione frase de ação ("salva", "guarda isso", "comenta aí") dentro do texto de nenhum slide, principalmente o slide 5. O slide 5 continua sendo virada sem resolução, sem CTA embutido no texto.` : ''}

Execute o protocolo completo:
1. Identifique a tensão interna central do tema.
2. Gere as 3 versões abaixo. Cada versão tem a MESMA tensão, ângulo diferente.
3. Rode os 5 testes de validação nas 3 versões e nas 3 perguntas finais.
   - Se alguma versão parecer "bonita" → reescreva
   - Se as 3 perguntas finais forem variações da mesma frase → reescreva
   - Se o exercício for genérico ou futuro → reescreva
4. Gere o exercício prático e o CTA fechado.
5. Entregue apenas versões aprovadas.

IMPORTANTE: os passos acima (incluindo os 5 testes) são um processo mental, não texto de saída. Não escreva raciocínio, rascunho, autocrítica ou notas de validação na resposta — faça isso em silêncio e entregue direto o resultado final. A resposta inteira deve ser o objeto JSON abaixo, sem nenhum texto antes ou depois, começando direto com "{".

ESTRUTURA DE CADA VERSÃO (slides do carrossel):
- slide 1: abertura — estado interno (1 frase, a pessoa se reconhece)
- slides 2-4: desenvolvimento causal (cada slide avança o raciocínio, não descreve)
- slide 5: virada sem resolução (tensão máxima, não conclui)
- pergunta_final: exige posicionamento, não confirmação

VERSÃO PRINCIPAL → entrada direta, raciocínio progressivo
VARIAÇÃO EMOCIONAL → mesma tensão, ângulo cotidiano, ritmo mais lento
VARIAÇÃO PROVOCATIVA → mesma tensão, sem suavização, nomeia o problema diretamente

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": {
    "slides": [
      { "numero": 1, "texto": "abertura — estado interno" },
      { "numero": 2, "texto": "desenvolvimento causal" },
      { "numero": 3, "texto": "aprofundamento" },
      { "numero": 4, "texto": "tensão chegando" },
      { "numero": 5, "texto": "virada sem resolução" }
    ],
    "pergunta_final": "pergunta que exige posicionamento"
  },
  "variacao_emocional": {
    "slides": [
      { "numero": 1, "texto": "abertura cotidiana" },
      { "numero": 2, "texto": "desenvolvimento mais próximo, mais íntimo" },
      { "numero": 3, "texto": "aprofundamento" },
      { "numero": 4, "texto": "tensão implícita" },
      { "numero": 5, "texto": "virada sem resolução" }
    ],
    "pergunta_final": "pergunta diferente da principal"
  },
  "variacao_provocativa": {
    "slides": [
      { "numero": 1, "texto": "abertura que nomeia o problema diretamente" },
      { "numero": 2, "texto": "desenvolvimento sem suavização" },
      { "numero": 3, "texto": "aprofundamento direto" },
      { "numero": 4, "texto": "tensão máxima" },
      { "numero": 5, "texto": "virada sem resolução — a mais incômoda das três" }
    ],
    "pergunta_final": "a pergunta mais exigente das três"
  },
  "legenda": "apenas 1 linha de observação seca — NÃO inclua o exercício aqui, ele vai só no campo exercicio_pratico",
  "exercicio_pratico": "2 frases máximo — no passado ou presente imediato, sobre comportamento próprio, acessa memória específica",
  "cta_fechado": "escolha binária sobre um comportamento ou preferência diferente da pergunta final — não pode ser a mesma pergunta reformulada",
  "comentarios": [
    { "comentario": "o que a pessoa provavelmente vai escrever", "resposta": "pergunta que puxa mais fundo" },
    { "comentario": "segundo comentário provável", "resposta": "pergunta que puxa mais fundo" },
    { "comentario": "terceiro comentário provável", "resposta": "pergunta que puxa mais fundo" }
  ],
  "validacao": {
    "deixa_espaco": true,
    "nao_parece_coach": true,
    "so_karen_diria": true,
    "exercicio_acessa_memoria": true,
    "perguntas_diferentes": true
  }
}`

const buildPersonalCarouselPrompt = ({ tema, ideia, texto }) => `
Crie um carrossel pessoal para Karen Santos.

TEMA: ${tema}
${ideia ? `RECORTE INFORMADO POR KAREN: ${ideia}` : ''}
${texto ? `DETALHES REAIS INFORMADOS POR KAREN:\n${texto}` : ''}

${PERSONAL_SPECIFICITY_RULES}
${isNaomiTheme(`${tema} ${ideia || ''} ${texto || ''}`) ? NAOMI_EDITORIAL_GUIDE : ''}

Este não é um carrossel educativo. É uma micro-história em primeira pessoa.

ESTRUTURA DOS 7 SLIDES:
1. Gancho concreto que apresenta a mudança ou tensão sem explicar tudo.
2. Como era antes, com um comportamento real e observável.
3. O custo cotidiano desse jeito antigo, sem dramatização.
4. A primeira mudança pequena e concreta.
5. Outra concessão, atalho ou detalhe que tornou a rotina possível.
6. O que mudou na minha relação com essa situação.
7. Fechamento com imagem, constatação ou humor seco. Sem lição.

PROFUNDIDADE: o slide 1 pode ter uma frase. Os slides 2 a 6 devem ter de 20 a 45 palavras, em uma a três frases curtas. O slide 7 fecha em até 30 palavras. Não reduza cada slide a uma frase telegráfica quando a cena precisar de contexto.

REFERÊNCIA DE QUALIDADE E DENSIDADE — para o tema "O que mudei para deixar a rotina mais leve":
1. "Eu não organizei melhor a minha rotina. Eu parei de exigir tanto dela."
2. "Antes, um dia bom precisava começar cedo, render bastante e terminar com a casa minimamente organizada. Era muita coisa precisando dar certo para eu considerar o dia bom."
3. "Então comecei a diminuir o tamanho das promessas. Em vez de arrumar a casa, escolher um canto. Em vez de cozinhar, resolver a próxima refeição."
4. "Também parei de transformar todo atalho em culpa. Comida montada alimenta. Roupa limpa ainda no varal continua limpa."
5. "A maior mudança foi parar de usar a casa para medir minha competência. Tem dia em que ela funciona. Tem dia em que apenas nos abriga."
6. "Hoje, quando preciso escolher entre deixar tudo em ordem e terminar o dia com alguma energia, nem sempre escolho a ordem."
7. "Minha rotina ficou mais leve quando parei de pedir que todos os dias parecessem bem administrados. Alguns dias só precisam terminar."
Use esta referência como padrão de progressão, oralidade e densidade. Não copie seus fatos para temas diferentes e não introduza Naomi, trabalho ou qualquer personagem que o tema não mencionar.

Crie três tratamentos da mesma micro-história:
- Principal: cotidiano e direto.
- Afetivo: mais próximo e contido, sem sentimentalismo fabricado.
- Humor seco: mais engraçado, sem transformar a personagem em caricatura.

PROIBIDO: "a gente", conceitos abstratos, exercício prático, conselho, transformação, cronograma perfeito, tentativa de controle, frustração acumulada ou qualquer detalhe inventado não sustentado pelo tema. Se um fato real fizer falta, use [Karen: conte aqui o detalhe real].

Responda EXCLUSIVAMENTE com JSON válido:
{
  "versao_principal": {
    "slides": [
      { "numero": 1, "texto": "gancho concreto" },
      { "numero": 2, "texto": "como era antes" },
      { "numero": 3, "texto": "o custo cotidiano" },
      { "numero": 4, "texto": "a primeira mudança concreta" },
      { "numero": 5, "texto": "outra concessão ou detalhe" },
      { "numero": 6, "texto": "o que mudou na minha relação com isso" },
      { "numero": 7, "texto": "fechamento sem moral" }
    ],
    "pergunta_final": "pergunta natural ou string vazia"
  },
  "variacao_emocional": {
    "slides": [
      { "numero": 1, "texto": "gancho afetivo" },
      { "numero": 2, "texto": "como era antes" },
      { "numero": 3, "texto": "o custo cotidiano" },
      { "numero": 4, "texto": "a primeira mudança" },
      { "numero": 5, "texto": "outra concessão ou detalhe" },
      { "numero": 6, "texto": "minha reação contida" },
      { "numero": 7, "texto": "fechamento afetivo sem moral" }
    ],
    "pergunta_final": "pergunta natural ou string vazia"
  },
  "variacao_provocativa": {
    "slides": [
      { "numero": 1, "texto": "gancho com humor seco" },
      { "numero": 2, "texto": "como era antes" },
      { "numero": 3, "texto": "o custo cotidiano" },
      { "numero": 4, "texto": "a primeira mudança" },
      { "numero": 5, "texto": "outra concessão ou detalhe" },
      { "numero": 6, "texto": "minha reação autoirônica" },
      { "numero": 7, "texto": "punchline sem moral" }
    ],
    "pergunta_final": "pergunta natural ou string vazia"
  },
  "legenda": "legenda curta em primeira pessoa, sem resumir os slides",
  "exercicio_pratico": "",
  "cta_fechado": "",
  "comentarios": [],
  "validacao": {
    "deixa_espaco": true,
    "nao_parece_coach": true,
    "so_karen_diria": true,
    "exercicio_acessa_memoria": true,
    "perguntas_diferentes": true
  }
}`

/* ── Protocolo de Stories ── */
const buildStoriesSystem = (isPessoal) => `— IDENTIDADE —

Você é um gerador de roteiros de stories para Instagram.

${isPessoal
    ? `A autora é Karen Santos, mas neste modo ela NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, fé, compras, gostos, vida adulta e, quando o tema pedir, a bulldog Naomi. PROIBIDO puxar pra carreira, tecnologia ou mundo corporativo. Ela escreve na primeira pessoa, como quem conta pra amiga próxima. Tom: próximo, direto, sem performar autoridade.\n${PERSONAL_SPECIFICITY_RULES}`
    : 'A autora é uma empreendedora brasileira que atua como consultora de gestão. Ela escreve na primeira pessoa, a partir do olhar de quem observa o mundo corporativo de fora. Tom: próximo, direto, sem performar autoridade.'}


— CONTEXTO DA GERAÇÃO —

Tema escolhido: {tema}
Estrutura solicitada: {estrutura}

Siga rigorosamente as instruções da estrutura solicitada.


— VOZ E TOM —

A autora fala como conversa. Não como post.
Escreva como ela falaria em voz alta, não como ela escreveria num artigo.

Referências de tom correto:
${isPessoal ? `- "A Naomi fez de novo aquilo que só ela sabe fazer."
- "Ontem eu quase comprei uma coisa que eu nem precisava."
- "Tenho uma mania boba que eu não consigo largar."` : `- "Trabalhando aqui de casa, vi uma coisa acontecer direto."
- "Num cliente meu semana passada..."
- "Tenho uma opinião sobre isso que muita gente não concorda."`}


— REGRAS GLOBAIS OBRIGATÓRIAS —

${isPessoal ? 'Fala: até 30 palavras por frame. Texto na tela: máximo 15 palavras por bloco.' : 'Frases: máximo 15 palavras cada. Sem exceção.'}
Parágrafos: 1 a 2 frases. Nunca blocos longos.
Pontuação: ponto final e vírgula apenas. Sem exclamação. Sem reticências dramáticas.
Vocabulário: NUNCA USE → transformador, poderoso, incrível, surpreendente, real talk, verdade, jornada, propósito, impacto, engajamento, entregar valor.


— ESTRUTURA EM FRAMES (obrigatória — stories é consumido tela por tela, não como post) —

Divida o texto em 4 a 7 frames numerados, um bloco curto (1-2 frases) por frame, marcados assim:
[FRAME 1]
${isPessoal ? `[MÍDIA: vídeo falando | vídeo ambiente | foto | texto sobre fundo]
[GRAVAR: instrução específica e simples do que captar]
[FALA: texto exato para Karen dizer, ou "sem fala"]
[TEXTO NA TELA: texto exato, ou "sem texto"]
[RITMO: duração aproximada e indicação de pausa/corte]` : 'texto do frame...'}

[FRAME 2]
${isPessoal ? '[repita os mesmos campos]' : 'texto do frame...'}

Cada frame precisa fazer sentido sozinho na tela — a pessoa lê em 2-3 segundos e toca pra avançar. Não deixe um frame de transição vazio ou só de contexto.

Em UM dos frames — nunca no primeiro, nunca no último — inclua um elemento interativo nativo do Stories (isso é a diferença entre um post picotado e um stories de verdade):
[ENQUETE: pergunta binária curta, tipo enquete de sim/não ou A ou B]
ou
[CAIXA DE PERGUNTA: pedido específico que puxa uma resposta real de quem está vendo, não "me conta o que acha"]
Escolha o que fizer mais sentido pro conteúdo — nunca os dois juntos, sempre exatamente um.


— PROIBIÇÕES ABSOLUTAS —

NUNCA coloque título no início do texto.
NUNCA escreva introdução ou contextualização antes do stories.
NUNCA termine com CTA genérico ("me conta nos comentários", "compartilhe com alguém").
NUNCA use moral explícita ("o que aprendo com isso é...", "isso me ensinou que...").
NUNCA use ponto de exclamação.
NUNCA invente dados, estatísticas ou estudos.


— AUTOVERIFICAÇÃO ANTES DE ENTREGAR —

Antes de retornar o texto, verifique internamente:
1. ${isPessoal ? 'Algum texto na tela passa de 15 palavras ou alguma fala passa de 30? → reescreva.' : 'Alguma frase passa de 15 palavras? → reescreva.'}
2. Tem exclamação? → remova.
3. Tem palavra da lista proibida? → substitua.
4. Tem moral explícita no final? → apague essa parte.
5. Começa com título ou introdução? → remova.
6. Tem os marcadores [FRAME N] em cada bloco? → se não, adicione.
7. Tem exatamente um [ENQUETE: ...] ou [CAIXA DE PERGUNTA: ...], nem zero nem dois? → corrija.
${isPessoal ? `8. Todo frame informa mídia, o que gravar, fala, texto na tela e ritmo? → complete.
9. As imagens são filmáveis com celular na vida real, sem produção complexa? → simplifique.
10. A estrutura escolhida mudou a narrativa de verdade, ou só o tom? → reescreva seguindo os movimentos específicos.` : ''}

Se tudo passar: entregue apenas o texto do stories com os marcadores de frame, sem comentários, sem explicações, sem "aqui está o texto:".`

const STORIES_STRUCTURES = {
  observacao: {
    label: 'Observação',
    desc: 'Algo que a autora viu acontecer de fora do ambiente corporativo',
    prompt: 'Escreva como uma observação feita de fora do ambiente corporativo. Comece com uma situação que a autora viu acontecer. Desenvolva o que essa situação revela sobre um padrão maior. Termine com uma pergunta ou constatação seca, sem moral.',
  },
  caso_real: {
    label: 'Caso real',
    desc: 'Situação de cliente (sem nomear)',
    prompt: 'Escreva a partir de um caso de cliente, sem nomear. Comece diretamente na situação. Mostre o que aconteceu. Termine com o que a autora percebeu — não o que ela "aprendeu".',
  },
  opiniao: {
    label: 'Opinião divergente',
    desc: 'Uma posição que muita gente não concorda',
    prompt: 'Escreva como uma opinião que a autora tem e que muita gente não concorda. Declare a opinião no início sem esconder. Desenvolva o raciocínio que a leva a essa posição. Não suavize no final.',
  },
  padrao: {
    label: 'Padrão que repete',
    desc: 'Um padrão que continua aparecendo nos ambientes observados',
    prompt: 'Escreva sobre um padrão que a autora continua vendo nos ambientes que ela observa. Seja específica na descrição do padrão. Termine com uma pergunta genuína que a autora ainda não sabe responder.',
  },
}

/* ── Estruturas de Stories do Studio Pessoal (mesmos 3 tons do modo Studio Livre pessoal) ── */
const PERSONAL_STORIES_STRUCTURES = {
  diario: {
    label: 'Diário',
    desc: 'Momento íntimo, fé ou sentimento não resolvido',
    prompt: `Construa 5 ou 6 frames como um registro íntimo ainda em elaboração:
1. Abra com a percepção pessoal, sem explicar sua origem.
2. Mostre o primeiro sinal concreto no corpo, na casa ou num comportamento.
3. Aprofunde com outro detalhe específico, sem generalizar.
4. Inclua exatamente uma enquete binária que compare reconhecer cedo versus perceber tarde.
5. Diga o que Karen ainda está tentando fazer diferente.
6. Se necessário, encerre sem resposta, em uma imagem ou frase contida.
Priorize vídeo falando, detalhe de ambiente e silêncio. Sem moral, conselho ou CTA genérico.`,
  },
  cotidiano: {
    label: 'Cotidiano',
    desc: 'Cena do dia, perrengue, mania ou a Naomi',
    prompt: `Construa 5 frames a partir de uma ação banal e visual:
1. Abra já dentro da cena, mostrando o comportamento que denuncia o tema.
2. Repita ou agrave a ação de forma reconhecível.
3. Mostre a interpretação autoirônica de Karen.
4. Inclua exatamente uma enquete com duas manifestações cotidianas do mesmo comportamento.
5. Feche voltando à ação inicial com humor seco.
Use objetos, cômodos, gestos e pequenos cortes filmáveis. Naomi só entra se o tema mencioná-la. Nunca invente um fato pessoal; use [Karen: detalhe real] quando necessário.`,
  },
  observacao: {
    label: 'Observação',
    desc: 'Algo que ela viu ou notou no mundo, sem ser corporativo',
    prompt: `Construa 5 frames como uma observação que parte do particular e abre para identificação:
1. Declare o padrão percebido em uma frase simples, sem título.
2. Mostre uma manifestação concreta desse padrão.
3. Traga uma segunda manifestação que amplie a leitura.
4. Inclua exatamente uma caixa de pergunta pedindo um sinal, cena ou exemplo específico da pessoa.
5. Encerre com uma constatação aberta, sem prescrever comportamento.
Alterne texto sobre fundo, b-roll cotidiano e um trecho falando para a câmera. Sem aula, diagnóstico ou moral.`,
  },
}

/* ── Templates de Slides — Carrossel Tech/IA (lente de conteúdo aplicada aos MESMOS 5 slides
   do Protocolo de Carrossel: abertura/estado interno → 3 slides de desenvolvimento causal →
   virada sem resolução. Cada template define O QUE cada slide fala, nunca uma estrutura
   própria de capa/lista/resumo/CTA — isso contradiria o protocolo e achata o resultado. ── */
const CAROUSEL_TEMPLATES = {
  ferramentas: {
    label: 'Ferramentas de IA',
    alavanca: 'salvamento',
    desc: 'Ferramentas de IA reveladas como resposta a limites reais, não como lista',
    estrutura: 'Slide 1 (abertura — estado interno): a frustração real que te fez procurar ferramenta pra essa tarefa — não a lista, o motivo. Slides 2 a 4 (desenvolvimento causal): cada slide revela uma ferramenta como resposta ao limite da anterior — a ferramenta do slide 3 resolve o que a do slide 2 deixava manual, não é um item novo numa lista. CADA SLIDE PRECISA TER SEU JULGAMENTO: o que você decidiu, testou, rejeitou ou ainda desconfia daquela ferramenta — nunca só o que ela faz, como um manual de recursos. Slide 5 (virada sem resolução): a parte da tarefa que nenhuma dessas ferramentas resolve ainda — nomeie o limite, não feche a questão.',
  },
  passo_a_passo: {
    label: 'Passo a passo',
    alavanca: 'salvamento',
    desc: 'Processo de IA onde cada passo só existe porque o anterior não bastou',
    estrutura: 'Slide 1 (abertura — estado interno): o problema de negócio como ele trava antes de aplicar o processo. Slides 2 a 4 (desenvolvimento causal): um passo do processo por slide, e cada passo só existe porque o anterior, sozinho, não resolvia. CADA SLIDE PRECISA TER SEU JULGAMENTO: por que você escolheu fazer esse passo assim, o risco que ele evita ou o erro que ele corrige — nunca só a descrição do passo, como um manual. Slide 5 (virada sem resolução): o ponto do processo que ainda depende de julgamento humano e a IA não substitui — nomeie sem resolver.',
  },
  antes_depois: {
    label: 'Antes e depois',
    alavanca: 'salvamento e identificação',
    desc: 'Comparação onde cada mudança de etapa é causa da próxima',
    estrutura: 'Slide 1 (abertura — estado interno): o fluxo de trabalho como era antes, do jeito que cansava de verdade. Slides 2 a 4 (desenvolvimento causal): cada slide compara uma etapa antes/depois, e a mudança de uma etapa é a razão pela qual a etapa seguinte também mudou. CADA SLIDE PRECISA TER SEU JULGAMENTO: o que você ganhou e o que perdeu de controle em cada mudança — nunca só a comparação de recursos, como um manual. Slide 5 (virada sem resolução): a etapa que a IA ainda não resolve tão bem quanto o "antes" — o ganho tem um custo que ninguém fala.',
  },
  opiniao_tecnica: {
    label: 'Opinião técnica',
    alavanca: 'comentário e compartilhamento',
    desc: 'Opinião sustentada por uma cadeia de argumentos, não uma lista de motivos',
    estrutura: 'Slide 1 (abertura — estado interno): a opinião declarada sem suavizar, como reação a algo que você viu de verdade. Slides 2 a 4 (desenvolvimento causal): cada slide é um argumento que decorre do anterior — uma cadeia de raciocínio, não motivos soltos. Slide 5 (virada sem resolução): a consequência prática dessa opinião que ainda incomoda, sem fechar em conclusão confortável.',
  },
  limites_ia: {
    label: 'O que a IA ainda erra',
    alavanca: 'comentário',
    desc: 'Falhas concretas em cadeia, cada uma mais profunda que a anterior',
    estrutura: 'Slide 1 (abertura — estado interno): o momento em que você percebeu, na prática, que a IA errou nessa tarefa. Slides 2 a 4 (desenvolvimento causal): um caso concreto de falha por slide, e cada caso revela uma camada mais profunda do limite anterior — não uma lista de erros soltos. Slide 5 (virada sem resolução): o jeito que você contorna esse limite hoje, que ainda não é solução de verdade — só uma gambiarra que funciona.',
  },
  bastidor: {
    label: 'Bastidor home office',
    alavanca: 'identificação aspiracional',
    desc: 'Rotina onde cada elemento existe porque o anterior não bastava',
    estrutura: 'Slide 1 (abertura — estado interno): a cena real do setup ou da rotina, no momento exato, sem embelezar. Slides 2 a 4 (desenvolvimento causal): um elemento da rotina por slide, e cada elemento existe porque o anterior, sozinho, não bastava. Slide 5 (virada sem resolução): a parte da rotina que ainda não funciona direito, que você não resolveu — sem fingir que está tudo redondo.',
  },
}

/* ── Estruturas de Roteiro — Protocolo de Engajamento (Reels). Cada estrutura
   define o formato do roteiro falado (o "passo 1" do protocolo), substituindo
   a sequência genérica situação→comportamento→leitura→tensão→pergunta por uma
   forma nomeada e testada. Os demais passos do protocolo (variação emocional,
   variação provocativa, exercício prático, validação) continuam se aplicando
   normalmente em cima do roteiro gerado. ── */
const ENGAGEMENT_TEMPLATES = {
  yapping: {
    label: 'Yapping',
    alavanca: 'retenção até o fim',
    desc: 'Falar pra câmera como quem está pensando em voz alta — parece improviso, mas segue uma estrutura fixa em 5 partes',
    estrutura: `Roteiro falado em 5 partes, sem saudação, sem introdução, sem "bom dia seguidores":

1. O GANCHO — começa como no meio de um pensamento, não como abertura de vídeo.
   ❌ Errado: "Bem-vindos ao meu canal", "Hoje eu trago", "Como muita gente já sabe"
   ✅ Certo: "Desculpa, mas alguém precisava dizer isso" / "Faz 3 dias que eu penso nisso e não consigo parar" / "Uma cliente me falou uma coisa ontem e eu ainda tô processando"
   Teste rápido: se a primeira frase funciona como cumprimento, apague.

2. O BURACO — precisa ter algo que não fecha.
   ❌ Errado: só explicar — isso é dado, e dado a pessoa passa reto.
   ✅ Certo: deixar algo em aberto — isso é fofoca, e fofoca a pessoa assiste até o fim.
   Receita: o que você fez → o que devia acontecer → o que aconteceu (spoiler: outra coisa).
   Exemplo: "Baixei meus preços pela metade achando que ia vender o dobro. Vendi menos que no mês passado."
   Esse buraco segura a atenção pelos próximos 20 segundos — sem ele, não sobra nada pra esperar.

3. A EPIFANIA — o momento exato em que você pensou "epa... eu estava errado".
   ❌ Errado (genérico, soa como conselho): "aprendi a conhecer melhor meu público"
   ✅ Certo (específico, soa como confissão): "reli meus últimos 40 posts e em NENHUM deles eu dizia o que eu vendo"
   Ninguém guarda um conselho. Todo mundo guarda uma confissão.

4. A LIÇÃO — curta, soa como se você mesmo tivesse descoberto, se sustenta sozinha num comentário.
   ❌ Errado: "acho que o importante é entender bem seu público e oferecer algo que ele realmente precise no momento certo"
   ✅ Certo: "eu estava vendendo uma coisa que ninguém sabia que existia"
   Teste: se a frase faz sentido sozinha, sem contexto nenhum, está pronta.

5. O FECHAMENTO — termina onde começou, ecoando o gancho.
   Abriu com "Desculpa, mas alguém precisava dizer isso" → fecha com "Pronto, já falei. Agora vai lá e revê seus primeiros 3 segundos."
   Abriu com "Uma cliente me falou uma coisa ontem e eu ainda tô processando" → fecha com "Já processei, e acho que agora é sua vez também."
   Um "bom, era isso, me segue pra mais" deixa o vídeo pendurado — parece cortado, não fechado.`,
  },
  hot_take: {
    label: 'Hot Take',
    alavanca: 'comentário e discordância',
    desc: 'Opinião crua sustentada por evidência real, terminando em convite a discordar — não a confirmar',
    estrutura: `Roteiro falado em 4 partes:

1. AFIRMAÇÃO DIRETA — a opinião crua, sem suavizar, dita como quem já pensou muito nisso.
   ❌ Errado (suaviza, não é hot take): "Eu acho que talvez a gente devesse repensar um pouco o jeito que usa IA"
   ✅ Certo: "Eu não confio em quem decide preço só olhando o que a concorrência cobra"
   Se a frase precisa de "eu acho que" ou "talvez" pra existir, ainda não é a afirmação — é o rascunho dela.

2. JUSTIFICATIVA — o porquê, baseado em algo que você viu de verdade, não em teoria abstrata.
   ❌ Errado (genérico): "Porque isso é importante pro negócio"
   ✅ Certo: "Vi três clientes que cobravam o mesmo que a concorrência quebrarem no mesmo trimestre"
   A justificativa é um fato ou uma cena — nunca um princípio geral.

3. CONSEQUÊNCIA PRÁTICA — o que acontece com quem ignora isso, contado como fato, não como ameaça.
   ❌ Errado: "Isso pode ser um problema no futuro"
   ✅ Certo: "Quem faz isso desconta o próprio trabalho antes mesmo do cliente pedir desconto"

4. CONVITE A DISCORDAR — pergunta que pede posição, nunca confirmação.
   ❌ Errado (pede sim/não): "Vocês concordam?"
   ✅ Certo (pede posição e história): "Quem aqui já cobrou olhando só pro concorrente — e sabe dizer por quê?"
   Termina sem suavizar a opinião do passo 1. Hot take que pede desculpa no fechamento não é hot take.`,
  },
  mito_fato: {
    label: 'Mito x Fato',
    alavanca: 'salvamento e correção',
    desc: 'Desmonta uma crença comum com a lógica que a sustenta, depois o fato que a derruba',
    estrutura: `Roteiro falado em 4 partes:

1. O MITO — a crença comum, dita como quem ouviu isso de novo, sem introduzir como "mito" ainda.
   ❌ Errado (já entrega a virada cedo demais): "Todo mundo pensa que X, mas isso é mentira"
   ✅ Certo: "Toda vez que alguém me pergunta sobre preço, a resposta vem pronta: cobra o que o mercado paga"
   O mito é apresentado como verdade aceita, não como alvo.

2. POR QUE PARECE VERDADE — a lógica aparente que sustenta o mito, tratada com seriedade, não com ironia.
   ❌ Errado (zomba do mito antes de explicar): "Óbvio que isso não faz sentido nenhum"
   ✅ Certo: "Faz sentido: se todo mundo cobra parecido, parece mais seguro cobrar parecido também"
   Se a lógica do mito não for levada a sério aqui, a virada do passo 3 perde força.

3. O QUE DE FATO ACONTECE — a virada, sustentada por um dado ou uma experiência concreta, não por opinião.
   ❌ Errado: "Na verdade não é bem assim"
   ✅ Certo: "Só que o mercado que 'todo mundo' olha pra precificar geralmente já quebrou ou tá prestes a quebrar"

4. O CUSTO DE ACREDITAR — a consequência real de quem levou o mito a sério, nomeada sem moralismo.
   ❌ Errado: "Por isso é importante sempre questionar"
   ✅ Certo: "Quem precifica assim descobre o erro só quando o caixa já fechou o mês no vermelho"`,
  },
  confissao_bastidor: {
    label: 'Confissão/Bastidor',
    alavanca: 'identificação e confiança',
    desc: 'Decisão real que deu errado, contada sem embelezar, terminando numa lição que se sustenta sozinha',
    estrutura: `Roteiro falado em 4 partes:

1. A CONFISSÃO — a decisão real que você tomou, sem embelezar, admitindo o risco ou o erro de cara.
   ❌ Errado (embeleza, vira case de sucesso disfarçado): "Uma vez eu tomei uma decisão arriscada que no fim valeu a pena"
   ✅ Certo: "Fechei um contrato sem colocar cláusula de escopo porque confiei na palavra do cliente"
   Se a confissão já entrega que "no fim deu certo", não é confissão — é propaganda.

2. O QUE DEU ERRADO — a consequência concreta, contada como fato, não como desabafo genérico.
   ❌ Errado: "As coisas não saíram como eu esperava"
   ✅ Certo: "O escopo dobrou em três semanas e eu não tinha nada assinado pra cobrar por isso"

3. O MOMENTO QUE PERCEBEU — o instante específico da virada de percepção, não uma reflexão vaga depois.
   ❌ Errado (genérico, soa como conselho): "Aprendi que contrato é importante"
   ✅ Certo (específico, soa como confissão): "Foi quando o cliente disse 'mas isso não tava combinado assim' que eu vi que a palavra dele não valia nada sem estar no papel"

4. A LIÇÃO — curta, aplicável, soa como descoberta própria, se sustenta sozinha num comentário.
   ❌ Errado: "Por isso sempre documente tudo com seus clientes"
   ✅ Certo: "Confiança não substitui cláusula — as duas coisas fazem trabalhos diferentes"`,
  },
  estudo_de_caso: {
    label: 'Estudo de caso em 60s',
    alavanca: 'comentário e credibilidade',
    desc: 'Situação real e específica, decisão tomada, resultado concreto — sem fechar a parte que ainda incomoda',
    estrutura: `Roteiro falado em 4 partes:

1. A SITUAÇÃO — contexto real e específico (troque nome/detalhe sensível se precisar, mas mantenha a especificidade).
   ❌ Errado (abstrato, poderia ser qualquer caso): "Um cliente meu tinha um problema de gestão"
   ✅ Certo: "Uma loja de roupas femininas em bairro de bairro vendia bem no Instagram e nada na loja física"

2. A DECISÃO — o que foi decidido e por quê, incluindo a alternativa que foi descartada.
   ❌ Errado (só descreve a ação, sem julgamento): "Decidimos investir em tráfego pago"
   ✅ Certo: "Descartei investir em tráfego pago primeiro porque o problema não era gente vendo a loja — era gente não entrando"

3. O RESULTADO — número ou fato concreto, nunca "melhorou muito" ou "deu super certo".
   ❌ Errado: "O resultado foi ótimo"
   ✅ Certo: "As vendas na loja física subiram 30% no mês seguinte só mudando a vitrine pra mostrar o que tava bombando online"

4. O QUE FICOU SEM RESPOSTA — a parte do caso que não fechou, nomeada sem resolver — mantém a tensão em aberto.
   ❌ Errado (fecha tudo, vira case perfeito): "E desde então nunca mais tivemos problema"
   ✅ Certo: "Ainda não sei dizer se foi a vitrine ou se foi coincidência com a época do ano — não tive como isolar as duas coisas"`,
  },
  como_eu_usaria: {
    label: 'Como Eu Usaria',
    alavanca: 'aplicação específica e replicável',
    desc: 'Assume o papel de dono do negócio do tema e ensina, passo a passo, exatamente como usaria IA ali — específico o bastante pra copiar',
    estrutura: `Roteiro falado em 4 partes — o criador assume o papel de dono(a) do negócio citado no TEMA e ensina, passo a passo, como usaria IA especificamente ali:

1. A PREMISSA — assume o papel do dono do negócio específico do TEMA, sem introdução de aula genérica.
   ❌ Errado: "Hoje eu vou te ensinar como usar IA no seu negócio"
   ✅ Certo: "Se eu fosse dona de um salão de beleza, essa semana eu já tinha feito isso com IA"
   O gancho promete um caso específico, não uma aula genérica sobre IA.

2. PASSO 1 — a primeira aplicação de IA, nomeando a ferramenta/tarefa exata e o problema real que ela resolve nesse negócio.
   ❌ Errado (vago): "Eu usaria IA pra atender melhor os clientes"
   ✅ Certo: "Eu pegava as últimas 200 conversas de WhatsApp da recepção e treinava um agente só pra responder 'vocês têm horário hoje?' sozinho"
   Precisa nomear a ferramenta, o dado de entrada e a tarefa — sem isso vira propaganda genérica de IA.

3. PASSO 2 — uma segunda aplicação, num ponto de dor diferente do mesmo negócio, igualmente específica.
   ❌ Errado (repete a ideia do passo 1 com outras palavras): "E também usaria pra criar posts"
   ✅ Certo: "E usava a mesma IA pra olhar o histórico de agendamento e me avisar quando uma cliente que sempre vem a cada 6 semanas passa 8 sem aparecer"
   Cada passo resolve um problema diferente do anterior — não é a mesma ideia repetida.

4. O FECHAMENTO — nomeia o que isso muda de verdade pro negócio (tempo, dinheiro ou decisão), e devolve pro espectador adaptar pro dele.
   ❌ Errado: "E foi assim que a IA revolucionou meu negócio"
   ✅ Certo: "Isso sozinho já tira 2 horas por semana da recepção — e o seu negócio provavelmente tem o mesmo tipo de tarefa repetitiva escondida em algum canto"
   Termina apontando pra ação do espectador, não fechando a história como case perfeito.`,
  },
}

/* Estruturas equivalentes do Studio Pessoal. Mantêm as seis mecânicas de
   retenção, mas removem linguagem de autoridade, estudo de negócio e ensino. */
const PERSONAL_ENGAGEMENT_TEMPLATES = {
  yapping: {
    label: 'Pensando em voz alta',
    alavanca: 'retenção até o fim',
    desc: 'Um pensamento espontâneo que vai encontrando forma durante a fala',
    estrutura: `Roteiro falado em 5 movimentos:
1. Comece no meio de um pensamento pessoal, sem saudação ou anúncio do tema.
2. Mostre uma contradição, detalhe ou pergunta que ainda não fecha.
3. Traga dois ou três exemplos cotidianos específicos em progressão.
4. Diga o que você passou a perceber, sem transformar em conselho.
5. Feche ecoando o começo, como quem terminou de pensar — não com moral ou "me segue".
O ritmo pode ter autocorreção e oralidade, mas não deve parecer texto desorganizado.`,
  },
  hot_take: {
    label: 'Uma opinião pessoal',
    alavanca: 'comentário e discordância',
    desc: 'Uma opinião clara sobre a vida cotidiana, sustentada por experiências observáveis',
    estrutura: `Roteiro falado em 4 movimentos:
1. Declare a opinião pessoal de forma direta, sem "talvez" ou pedido de desculpas.
2. Mostre a cena ou comportamento cotidiano que fez você pensar assim.
3. Nomeie o que essa opinião muda na forma como você vive ou se percebe.
4. Termine com uma pergunta que pede experiência ou posição, nunca "concorda?".
Não transforme a opinião em regra universal nem em provocação fabricada.`,
  },
  mito_fato: {
    label: 'Eu achava × Hoje percebo',
    alavanca: 'identificação e salvamento',
    desc: 'Uma crença pessoal antiga confrontada com o que a vida mostrou na prática',
    estrutura: `Roteiro falado em 4 movimentos:
1. "Eu achava": apresente a crença antiga sem ridicularizá-la.
2. Explique por que ela parecia verdadeira para você naquela fase.
3. "Hoje percebo": mostre a cena, repetição ou experiência concreta que mudou sua leitura.
4. Feche com a diferença entre as duas versões, sem declarar uma lição universal.
Quando funcionar, use dois ou três pares curtos de "eu achava / hoje percebo".`,
  },
  confissao_bastidor: {
    label: 'Uma coisa sobre mim',
    alavanca: 'identificação e confiança',
    desc: 'Uma admissão pessoal concreta, contada sem vulnerabilidade performada',
    estrutura: `Roteiro falado em 4 movimentos:
1. Revele a admissão já na primeira frase; não use "preciso confessar" como suspense.
2. Mostre quando isso acontece com uma cena específica.
3. Conte a interpretação que você fazia antes e o que entende hoje.
4. Feche aceitando a contradição ou deixando a observação em aberto.
Não dramatize, não peça validação e não transforme a confissão em case de superação.`,
  },
  estudo_de_caso: {
    label: 'Cena de uma vida comum',
    alavanca: 'história e identificação',
    desc: 'Uma situação cotidiana observada como pequeno estudo de caso pessoal',
    estrutura: `Roteiro falado em 5 movimentos:
1. Nomeie a cena como um pequeno "estudo de caso" cotidiano, com humor leve.
2. Diga qual era o plano ou expectativa concreta.
3. Mostre o que realmente aconteceu, sem inventar detalhes dramáticos.
4. Conte o que você fez diferente ou decidiu não fazer.
5. Feche com o resultado humano da cena e, se couber, uma observação seca.
Não use métricas, credibilidade profissional, cliente ou linguagem de negócio.`,
  },
  como_eu_usaria: {
    label: 'Como isso aparece na minha vida',
    alavanca: 'aplicação pessoal',
    desc: 'Mostra como uma percepção se traduz em escolhas reais, sem virar tutorial',
    estrutura: `Roteiro falado em 4 movimentos:
1. Apresente a percepção pessoal que você está tentando acomodar, não resolver perfeitamente.
2. Mostre como ela aparece numa situação cotidiana específica.
3. Conte duas escolhas pequenas que você faz hoje por causa dessa percepção.
4. Feche nomeando o que ainda continua contraditório ou incompleto.
Não ensine passos ao público. Fale apenas do que você faz, evita, aceita ou ainda está aprendendo.`,
  },
}

/* ── Gerador dedicado — série "Como eu aplicaria IA na minha empresa se eu
   fosse [TIPO DE NEGÓCIO]". Roteiro de Reels mostrando aplicações reais de
   IA na operação de um negócio específico — não é o protocolo genérico de
   engajamento (sem variação emocional/provocativa, sem exercício de memória
   pessoal): é um formato fechado, com ordem fixa de 10 partes e frases
   obrigatórias de abertura e fechamento. ── */
const IA_NEGOCIO_SYSTEM = `Você escreve roteiros de Reels para a série "Como eu aplicaria IA na minha empresa se eu fosse [TIPO DE NEGÓCIO]".

O roteiro mostra aplicações reais de inteligência artificial na operação de um negócio específico. NUNCA transforme o conteúdo em lista de ferramentas, dicas genéricas ou ideias soltas para redes sociais.

FORMATO: uma pessoa falando pra câmera, intercalada com demonstrações no celular. Duração falada entre 60 e 90 segundos (aproximadamente 150 a 230 palavras de narração, sem contar as indicações de gravação entre colchetes).

── DIAGNÓSTICO OPERACIONAL INTERNO (obrigatório antes de escrever — NUNCA mostre esse diagnóstico na resposta, entregue só o roteiro final) ──
Antes de escrever o roteiro, faça esse diagnóstico internamente. Não comece pelas ferramentas disponíveis — comece entendendo como esse negócio funciona.

MAPEAMENTO OBRIGATÓRIO — identifique internamente:
1. Quais são os principais processos desse tipo de negócio, desde a entrada do cliente até a entrega e o pós-venda.
2. Quais tarefas dependem hoje de observação humana, consulta manual, comparação de informações, interpretação de mensagens, previsão de demanda ou tomada de decisão repetitiva.
3. Em qual etapa existe uma perda concreta de tempo, dinheiro, capacidade, produto, oportunidade ou qualidade.
4. Qual evento dispara o processo.
5. Quais dados o negócio já produz e poderia utilizar.
6. Qual decisão precisa ser tomada a partir desses dados.
7. Quais exceções impedem uma automação completamente linear.
8. Qual parte depende realmente de inteligência artificial e qual parte depende apenas de uma automação ou integração convencional.
Depois desse diagnóstico, selecione as duas aplicações de IA do roteiro a partir dele — nunca a partir de uma lista genérica de ferramentas.

TESTE DE ESPECIFICIDADE — antes de fechar cada uma das duas aplicações, pergunte internamente: "Essa mesma solução poderia ser apresentada, sem alterações importantes, pra cinco tipos diferentes de negócio?" Se a resposta for sim, descarte e procure uma aplicação mais específica.
A solução precisa conter elementos próprios do setor: etapas operacionais, frequência de compra ou atendimento, capacidade disponível, regras de execução, tipos de serviço ou produto, comportamento dos clientes, desperdícios característicos, sazonalidade, restrições do negócio, vocabulário de quem trabalha na área.
PROIBIDO usar estas ideias na forma genérica: criar conteúdo; responder clientes; organizar tarefas; analisar dados; controlar estoque; melhorar o atendimento; automatizar o WhatsApp. Só podem aparecer quando viram um processo específico do setor — por exemplo:
- Em vez de "usar IA pra responder clientes": "Interpretar mensagens como 'tem horário pra fazer luzes hoje?', identificar o serviço pedido, calcular o tempo necessário, checar quais profissionais fazem a técnica e oferecer só os horários que comportam o procedimento completo."
- Em vez de "usar IA pra controlar o estoque": "Cruzar os serviços agendados pra próxima semana com o consumo médio de tonalizante por comprimento de cabelo e alertar quais cores precisam ser repostas antes dos atendimentos."
- Em vez de "usar IA pra recuperar clientes": "Identificar clientes cuja frequência de manutenção ultrapassou o intervalo habitual e priorizar o contato nos dias em que o profissional responsável está com maior capacidade ociosa."

DISTINÇÃO ENTRE IA E AUTOMAÇÃO — não apresente uma integração convencional como se fosse inteligência artificial. Defina internamente: o que a IA interpreta, classifica, extrai, prevê, recomenda ou personaliza; o que o sistema só consulta; o que a automação executa; em qual ferramenta o dado fica guardado; qual parte ainda depende de decisão humana. A solução precisa ser tecnicamente plausível — se depender de integração, API, sistema de gestão, agenda digital, histórico estruturado ou autorização pra usar dado de cliente, mencione isso de forma simples no roteiro.

CRITÉRIO DE ESCOLHA — as duas aplicações precisam: resolver um processo frequente; ter impacto operacional observável; usar dados que o negócio realmente pode produzir; reduzir uma decisão ou tarefa manual; ser específicas daquele setor; poder ser explicadas visualmente num Reels; não depender de tecnologia inacessível pra uma pequena empresa. Nunca invente funcionalidade, integração, resultado ou dado.
── FIM DO DIAGNÓSTICO INTERNO ──

Só depois desse diagnóstico, escreva o roteiro. SIGA EXATAMENTE ESTA ORDEM:

1. ABERTURA COM TESE OPERACIONAL
Comece OBRIGATORIAMENTE com a frase, adaptada ao negócio e à área:
"Se eu fosse [dona/dono] de [TIPO DE NEGÓCIO], essa semana eu já colocaria a IA pra trabalhar [EM QUAL ÁREA]."
A primeira frase revela imediatamente onde a IA seria aplicada. NUNCA comece explicando o que é inteligência artificial.
A área escolhida é a etapa de maior perda identificada no diagnóstico — nunca a mesma área por padrão. Atendimento só entra quando for de fato a dor mais relevante desse negócio específico, não como ponto de partida automático.

2. PERDA CONCRETA DO COTIDIANO
A tarefa repetitiva do diagnóstico que consome tempo, dinheiro ou atenção da equipe, na MESMA área definida na abertura. Situação cotidiana e reconhecível, com o vocabulário de quem trabalha nesse setor. Comece com algo como "Porque uma parte enorme do dia é gasta...".

3. PRIMEIRA AUTOMAÇÃO
A primeira aplicação selecionada no diagnóstico, já aprovada pelo teste de especificidade. Explique: quais informações seriam usadas; qual ferramenta ou integração executaria a tarefa; qual ação seria automatizada; o que deixaria de depender de trabalho manual. Nunca diga que uma planilha sozinha "dispara" ou "executa" uma automação (planilha guarda e organiza dado; quem dispara ação é uma integração, um chatbot ou um agente).

4. DEMONSTRAÇÃO VISUAL
Uma indicação de gravação entre colchetes (ex.: [MOSTRA AS MENSAGENS NO CELULAR], [MOSTRA A PLANILHA], [MOSTRA O FLUXO DA AUTOMAÇÃO], [MOSTRA O RESULTADO NA TELA]). Logo depois, explique o funcionamento numa frase no formato: "Quando [EVENTO], o sistema [AÇÃO] e, em seguida, [RESULTADO]."

5. BENEFÍCIO IMEDIATO PARA A EQUIPE
Qual interrupção, tarefa repetitiva ou esforço manual deixa de existir — de forma concreta. NUNCA use "otimizar processos", "aumentar a produtividade" ou equivalentes vagos. Diga exatamente o que a pessoa não precisa mais fazer.

6. SEGUNDA AUTOMAÇÃO
A segunda aplicação selecionada no diagnóstico, também aprovada pelo teste de especificidade, ligada a uma perda DIFERENTE da primeira. Faça a transição com a frase: "O segundo passo seria..."

7. EXEMPLO CONCRETO
Uma situação com frequência, prazo, quantidade, comportamento ou condição específica, no formato: "Se [SITUAÇÃO OBSERVADA], o sistema [AÇÃO AUTOMÁTICA]." Precisa ajudar quem assiste a visualizar a automação funcionando de verdade nesse negócio.

8. IMPACTO OPERACIONAL
Conecte a segunda automação a uma consequência mensurável ou observável (ocupar horário vazio, recuperar uma venda, reduzir desperdício, evitar falta de produto, diminuir tempo de resposta, liberar a equipe para o atendimento, melhorar frequência de compra). NUNCA prometa resultado financeiro sem dado real por trás.

9. CONTRAPONTO HUMANO
Deixe evidente que a IA assume tarefas repetitivas, mas não substitui o conhecimento, a decisão ou o atendimento humano. Use uma construção no espírito de: "A inteligência artificial não substituiria [PESSOA OU FUNÇÃO]. Ela assumiria [TAREFA REPETITIVA] para que [PESSOA OU EQUIPE] pudesse [ATIVIDADE HUMANA MAIS IMPORTANTE]." Adapte a frase ao negócio específico — NUNCA repita o mesmo fechamento genérico roteiro após roteiro.

10. CTA FUNCIONAL
Finalize EXATAMENTE com esta frase, sem alterar nenhuma palavra:
"Comenta qual é o seu negócio. Eu posso mostrar onde colocaria a IA pra trabalhar nele."

REGRAS DE ESCRITA:
- Escreva para ser falado, não lido. Frases curtas, linguagem brasileira simples.
- Tom próximo, seguro, observacional. NUNCA tom motivacional.
- Use "IA" ou "inteligência artificial" sem alternar excessivamente entre os dois.
- Apenas DUAS aplicações de IA no roteiro inteiro, com profundidade suficiente pra serem entendidas — nunca uma lista de três ou mais.
- NUNCA vire tutorial técnico. NUNCA infantilize quem está assistindo.
- PROIBIDO usar: "ninguém te conta", "não é só sobre", "o mais curioso é", "revolucionário", "insights", "pode transformar o seu negócio".
- No máximo uma pergunta retórica em todo o roteiro — evite empilhar perguntas.
- NUNCA invente dados, funcionalidades, integrações ou resultados que não foram informados ou que não sejam plausíveis para o tipo de negócio.
- As DUAS aplicações de IA (primeira e segunda automação) precisam ser coisas que dá pra construir hoje com ferramentas de IA reais — nunca capacidade fictícia ou especulativa.
- Entre duas formas de resolver o mesmo problema, escolha sempre a mais simples de montar e explicar — não proponha um sistema com várias etapas ou integrações quando um chatbot simples ou uma automação de um passo já resolve.
- Se a automação envolver dado de cliente (mensagem, agenda, histórico de compra, prontuário, dado de saúde), mencione em UMA frase curta o cuidado necessário com privacidade e consentimento — sem transformar isso num aviso jurídico longo.
- Se a automação exigir mais do que uma planilha ou um chatbot simples, nomeie a integração necessária numa frase simples (ex.: "isso passa por uma automação que liga o WhatsApp à agenda").

Responda EXCLUSIVAMENTE com JSON válido, sem texto antes ou depois, começando direto com "{":
{
  "titulo": "título curto pra identificar a ideia no Hub — ex: 'Reels IA — Salão de Beleza'",
  "tipo_negocio_usado": "o tipo de negócio como ficou no roteiro final",
  "roteiro": "o roteiro completo, pronto pra ser falado, com as indicações de gravação entre colchetes, seguindo a ordem 1 a 10 (use \\n\\n entre as partes)",
  "ferramentas_mencionadas": ["ferramenta ou integração 1", "ferramenta ou integração 2"],
  "duracao_estimada_segundos": 75,
  "nota_privacidade": "1 frase sobre o cuidado com dado de cliente citado no roteiro, ou null se a automação não envolve dado de cliente"
}`

const buildIANegocioPrompt = ({ tipoNegocio, tarefa, perda, ferramentas, objetivo }) => `
TIPO DE NEGÓCIO: ${tipoNegocio}
PRINCIPAL TAREFA REPETITIVA: ${tarefa?.trim() ? tarefa : 'não informado — identifique uma tarefa repetitiva plausível e comum nesse tipo de negócio.'}
PRINCIPAL PERDA OPERACIONAL: ${perda?.trim() ? perda : 'não informado — identifique, a partir da tarefa repetitiva, qual perda de tempo, dinheiro ou atenção ela causa.'}
FERRAMENTAS QUE O NEGÓCIO JÁ UTILIZA: ${ferramentas?.trim() ? ferramentas : 'não informado — sugira ferramentas realistas e comuns nesse tipo de negócio (ex.: WhatsApp Business, agenda do Google, planilha).'}
OBJETIVO DA AUTOMAÇÃO: ${objetivo?.trim() ? objetivo : 'não informado — identifique um objetivo plausível a partir da tarefa e da perda descritas.'}

Escreva o roteiro completo seguindo rigorosamente as 10 partes e todas as regras do system prompt, nessa ordem, para este negócio específico.`

/* ── Temas Sugeridos para Carrossel (compartilhado com o Captura de Pensamento — ver src/data/temasCarrossel.js) ── */

// Detecta se dois textos são essencialmente o mesmo conteúdo (repetição literal
// ou reformulação próxima) — usado para não exibir duas vezes o exercício
// prático/CTA quando a IA acaba repetindo o mesmo texto em campos diferentes.
function normalizeForCompare(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNearDuplicateText(a, b) {
  const na = normalizeForCompare(a)
  const nb = normalizeForCompare(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 2))
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 2))
  if (!wordsA.size || !wordsB.size) return false
  let shared = 0
  wordsA.forEach((w) => { if (wordsB.has(w)) shared += 1 })
  const overlap = shared / Math.min(wordsA.size, wordsB.size)
  return overlap > 0.6
}

// Remove o exercício prático da legenda quando a IA o repete lá (a legenda
// deve trazer só a observação seca; o exercício já tem seu próprio card).
function getCleanLegenda(legenda, exercicio) {
  if (!legenda) return legenda
  if (!exercicio) return legenda
  const paragraphs = legenda.split(/\n\s*\n/)
  if (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1]
    if (isNearDuplicateText(last, exercicio)) {
      return paragraphs.slice(0, -1).join('\n\n').trim() || ''
    }
  }
  if (isNearDuplicateText(legenda, exercicio)) return ''
  return legenda
}

/* ── Componente Principal ── */
export default function UnifiedCreator({ persona = 'trabalho' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPessoal = persona === 'pessoal'
  const brandVoice = useStore(s => s.brandVoice)
  const dislikedContent = useStore(s => s.dislikedContent)
  const addDislike = useStore(s => s.addDislike)
  const addFavorite = useStore(s => s.addFavorite)
  const addIdea = useStore(s => s.addIdea)
  const bannedWords = useStore(s => s.posicionamento.lista_negra) || []
  const posicionamento = useStore(s => s.posicionamento)
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

  /* Selecionar um trecho em QUALQUER bloco de texto gerado — Studio Livre,
     Reels, Carrossel ou Stories — abre o popup de banir. Estado compartilhado,
     handler compartilhado, popup renderizado uma vez só no fim do componente. */
  const handleTextSelectionForBan = () => {
    const sel = window.getSelection()
    const text = sel?.toString()?.trim()
    if (text && text.length >= 2 && text.length <= 80 && !text.includes('\n')) {
      setBanCandidate(text)
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setBanPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 })
    }
  }
  const [inspiration, setInspiration] = useState(null)
  const [brandViolations, setBrandViolations] = useState([])
  const [showLinter, setShowLinter] = useState(false)
  const [sweepReport, setSweepReport] = useState(null) // varredura anti-clichê da última geração
  const linterTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // ── Modo Engajamento ──
  const [mode, setMode] = useState(() => searchParams.get('submode') === 'ia_negocio' ? 'ia_negocio' : 'studio') // 'studio' | 'revisor' | 'engagement' | 'carousel' | 'stories' | 'ia_negocio'

  // ── Revisor de Texto ──
  const [revText, setRevText] = useState('')
  const [revLoading, setRevLoading] = useState(false)
  const [revResult, setRevResult] = useState(null)
  const [revError, setRevError] = useState('')
  const [revCopied, setRevCopied] = useState(false)
  const [revApplied, setRevApplied] = useState(null)
  const [revRewritten, setRevRewritten] = useState('')
  const [revRewriteLoading, setRevRewriteLoading] = useState(false)
  const [revShortened, setRevShortened] = useState('')
  const [revShortenLoading, setRevShortenLoading] = useState(false)

  // Engajamento (Reels)
  const [engTema, setEngTema] = useState('')
  const [engTemplate, setEngTemplate] = useState(null)
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
  const [engHooks, setEngHooks] = useState(null)
  const [engHookLoading, setEngHookLoading] = useState(false)
  const [engHookError, setEngHookError] = useState(null)
  const [engHookCopied, setEngHookCopied] = useState(null)
  const [engSweepReport, setEngSweepReport] = useState(null) // varredura anti-clichê do roteiro de Reels
  // Carrossel

  const [carTema, setCarTema] = useState('')
  const [carHooks, setCarHooks] = useState([])
  const [carHooksLoading, setCarHooksLoading] = useState(false)
  const [carHooksError, setCarHooksError] = useState('')
  const [carActiveVersion, setCarActiveVersion] = useState('principal')
  const [carIdeia, setCarIdeia] = useState('')
  const [carTexto, setCarTexto] = useState('')
  const [carGerarIdeia, setCarGerarIdeia] = useState(false)
  const [carGerarTexto, setCarGerarTexto] = useState(false)
  const [carTemplate, setCarTemplate] = useState(null)
  const [carTargetER, setCarTargetER] = useState('')
  const [carLoading, setCarLoading] = useState(false)
  const [carResult, setCarResult] = useState(null)
  const [carError, setCarError] = useState(null)
  const [carCopied, setCarCopied] = useState(null)
  const [carSavedHub, setCarSavedHub] = useState(false)
  const [carSweepReport, setCarSweepReport] = useState(null) // varredura anti-clichê do carrossel
  const [engSavedHub, setEngSavedHub] = useState(false)
  const [strSavedHub, setStrSavedHub] = useState(false)
  // Stories
  const [strTema, setStrTema] = useState('')
  const [strEstrutura, setStrEstrutura] = useState('observacao')
  const [strLoading, setStrLoading] = useState(false)
  const [strResult, setStrResult] = useState(null)
  const [strError, setStrError] = useState(null)
  const [strCopied, setStrCopied] = useState(false)
  const [strSweepReport, setStrSweepReport] = useState(null) // varredura anti-clichê do stories

  // IA no Negócio — série "Como eu aplicaria IA na minha empresa se eu fosse..."
  const [ianTipoNegocio, setIanTipoNegocio] = useState('')
  const [ianTarefa, setIanTarefa] = useState('')
  const [ianPerda, setIanPerda] = useState('')
  const [ianFerramentas, setIanFerramentas] = useState('')
  const [ianObjetivo, setIanObjetivo] = useState('')
  const [ianLoading, setIanLoading] = useState(false)
  const [ianResult, setIanResult] = useState(null)
  const [ianError, setIanError] = useState(null)
  const [ianCopied, setIanCopied] = useState(false)
  const [ianSavedHub, setIanSavedHub] = useState(false)
  const [ianSweepReport, setIanSweepReport] = useState(null) // varredura anti-clichê do roteiro IA no Negócio

  // ── Banco de Temas ──
  const [bankOpenCategory, setBankOpenCategory] = useState(null)

  const categorizeTheme = (tema) => classifyTheme(tema, isPessoal)

  // Banco de temas separado por persona: vida e trabalho não se misturam
  const themesKey = isPessoal ? 'cio-saved-themes-pessoal' : 'cio-saved-themes'

  const [savedThemes, setSavedThemes] = useState(() => {
    try {
      let raw = JSON.parse(localStorage.getItem(themesKey) || '[]')
      // A identidade "Do lado de cá" substituiu integralmente o banco pessoal
      // anterior. Limpa uma única vez os temas antigos já persistidos no navegador;
      // depois disso, tudo que Karen adicionar volta a ser preservado normalmente.
      if (isPessoal && localStorage.getItem('cio-pessoal-microthemes-version') !== '1') {
        raw = []
        localStorage.removeItem(themesKey)
        localStorage.setItem('cio-pessoal-microthemes-version', '1')
      }
      if (raw.length > 0 && typeof raw[0] === 'string') {
        raw = raw.map((t, i) => ({ id: Date.now() + i, tema: t, categoria: isPessoal ? 'Ser adulta é isso?' : 'Critério de decisão', fonte: 'manual', criadoEm: new Date().toISOString().slice(0, 10) }))
      } else {
        // migrar itens sem categoria e reclassificar as categorias antigas de trabalho
        raw = raw.map(item => ({
          ...item,
          categoria: isPessoal
            ? migratePersonalCategory(item.categoria || 'Ser adulta é isso?')
            : migrateWorkCategory(item.categoria || 'Critério de decisão'),
        }))
      }
      // Sanitização: uma versão anterior vazava temas entre os estúdios (componente
      // não remontava na troca de rota). Cada banco fica só com categorias da sua persona.
      raw = isPessoal
        ? raw.filter(t => PERSONAL_CATEGORIES.includes(t.categoria))
        : raw.filter(t => !PERSONAL_CATEGORIES.includes(t.categoria))
      return raw
    } catch { return [] }
  })
  const [newThemeInput, setNewThemeInput] = useState('')
  const [showThemesPanel, setShowThemesPanel] = useState(true)
  const [showPersonalSuggestions, setShowPersonalSuggestions] = useState(false)
  const [dismissedPersonalSuggestions, setDismissedPersonalSuggestions] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DISMISSED_MICROTHEMES_KEY) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch { return [] }
  })
  const [expandingThemes, setExpandingThemes] = useState(false)
  const [expandThemesError, setExpandThemesError] = useState(null)
  const [categorizingThemes, setCategorizingThemes] = useState(false)
  const [reclassifying, setReclassifying] = useState(false)
  const [reclassifyResult, setReclassifyResult] = useState(null)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    localStorage.setItem(themesKey, JSON.stringify(savedThemes))
  }, [savedThemes, themesKey])

  useEffect(() => {
    localStorage.setItem(DISMISSED_MICROTHEMES_KEY, JSON.stringify(dismissedPersonalSuggestions))
  }, [dismissedPersonalSuggestions])

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

  /* ── Reescrita corretiva anti-clichê ──
     O filtro no prompt é probabilístico: o modelo às vezes emite a estrutura
     proibida mesmo assim. Quando a varredura determinística encontra um bloco,
     esta chamada reescreve só os trechos apontados antes de mostrar na tela.
     Lógica em lib/clicheSweep.js — reaproveitada pelo Gerador de Prompt. */
  const rewriteWithoutCliches = (text, hits) => rewriteWithoutClichesBase(apiKey, text, hits)

  /* Reescrita em lote das linhas curtas — título, opções de título e ganchos. */
  const rewriteShortLines = (entries) => rewriteShortLinesBase(apiKey, entries)

  /* Varredura completa do resultado: content, caption, título, opções de título
     e ganchos. Reescreve o que estiver bloqueado e confere de novo — a reescrita
     também é probabilística e pode reintroduzir o padrão. Até 2 passadas por
     campo; o que sobrar vai para o relatório em vez de sumir em silêncio. */
  const sweepAndFix = async (parsed, selectedFormat) => {
    const MAX_PASSES = 2
    let fixed = 0

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const findings = blockingFindings(sweepResult(parsed, { format: selectedFormat, bannedWords }))
      if (!findings.length) break

      const longFields = findings.filter((f) => !SHORT_FIELDS.includes(f.field))
      const shortFields = findings.filter((f) => SHORT_FIELDS.includes(f.field))

      for (const f of longFields) {
        const rewritten = await rewriteWithoutCliches(f.text, f.blocks)
        if (rewritten && rewritten !== f.text) { parsed[f.field] = rewritten; fixed += f.blocks.length }
      }

      if (shortFields.length) {
        const rewritten = await rewriteShortLines(shortFields)
        shortFields.forEach((f, i) => {
          const value = rewritten[i]
          if (!value || value === f.text) return
          if (f.index == null) parsed[f.field] = value
          else parsed[f.field][f.index] = value
          fixed += f.blocks.length
        })
      }
    }

    const remaining = blockingFindings(sweepResult(parsed, { format: selectedFormat, bannedWords }))
    return { fixed, remaining, warns: sweepResult(parsed, { format: selectedFormat, bannedWords }).flatMap((f) => f.warns) }
  }

  /* Mesma correção verificada, para resultados com forma aninhada — o carrossel
     do Protocolo tem três versões de slides, e cada slide é uma unidade.
     Lógica em lib/clicheSweep.js — reaproveitada pelo Gerador de Prompt. */
  const sweepAndFixPaths = (obj, entriesFn) => sweepAndFixPathsBase(apiKey, obj, entriesFn, bannedWords)

  /* ── Gerar conteúdo ── */
  const generate = async (overrides = {}) => {
    const text = overrides.input || input
    if (!text.trim()) return
    if (!apiKey) { setError('Configure sua API key em Analytics > Configurações'); return }

    setLoading(true)
    setError(null)
    setSweepReport(null)
    if (overrides.adjustment) setAdjusting(overrides.adjustment)

    // No modo pessoal a voz de marca profissional fica de fora; frases proibidas e dislikes continuam
    const voiceCtx = buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords, posicionamento)
    const regenInstr = overrides.regen ? buildRegenerateInstruction(history.length) : ''
    const selectedFormat = overrides.format || format

    const prompt = `${isPessoal ? PERSONAL_MASTER_PROMPT : MASTER_PROMPT}
${isPessoal && isNaomiTheme(text) ? NAOMI_EDITORIAL_GUIDE : ''}
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
  "detected_context": "${isPessoal ? 'diario|cotidiano|observacao' : 'reflexivo|engracado|mentora'}",
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
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 4000,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const jsonText = data.content?.find(b => b.type === 'text')?.text || ''
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida')

      const parsed = JSON.parse(jsonMatch[0])

      // Varredura determinística anti-clichê sobre tudo que foi gerado
      let report = null
      try {
        report = await sweepAndFix(parsed, selectedFormat || parsed.suggested_format)
      } catch { /* se a correção falhar, mantém o texto original */ }
      setSweepReport(report)

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

  // ── Revisor de Texto: análise, reescrita e encurtamento ──
  async function revisorAnalyze() {
    if (!revText.trim() || !apiKey) { setRevError(!apiKey ? 'Configure sua API key em Configurações.' : ''); return }
    setRevLoading(true); setRevResult(null); setRevError(''); setRevRewritten('')
    const bannedList = bannedWords.length
      ? `\n\nFRASES ABSOLUTAMENTE PROIBIDAS — nunca use estas expressões nas sugestões, nem variações delas:\n${bannedWords.map(p => `- "${p}"`).join('\n')}\nSe uma sugestão contiver qualquer uma dessas frases → reescreva do zero.`
      : ''
    const prompt = `Você é um revisor especialista em conteúdo para criadores digitais brasileiros. Analise o texto e retorne APENAS um JSON válido:
{"score":<0-100>,"dimensoes":{"clareza":<0-100>,"tom":<0-100>,"impacto":<0-100>,"autenticidade":<0-100>},"parecer":"<frase resumo>","linguagem_robotica":["<trecho artificial>"],"sugestoes":[{"problema":"<trecho original>","melhoria":"<versão melhorada>"}],"pontos_fortes":["<ponto>"]}
${bannedList}
TEXTO:\n${revText.trim()}`
    try {
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 2500,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const raw = data.content?.find(b => b.type === 'text')?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('A IA não retornou uma análise válida.')
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
      // Detector determinístico: garante que estrutura proibida aparece na análise
      // mesmo quando o modelo deixa passar
      const det = detectCliches(revText)
      const detected = [...det.blocks, ...det.warns].map(h => `"${h.match}" — ${h.label}`)
      if (detected.length) {
        parsed.linguagem_robotica = [...new Set([...(parsed.linguagem_robotica || []), ...detected])]
      }
      setRevResult(parsed)
    } catch (err) {
      setRevError(err.message || 'Erro ao analisar. Tente novamente.')
    } finally {
      setRevLoading(false)
    }
  }

  function revisorApply(problema, melhoria, idx) {
    setRevText(prev => prev.includes(problema) ? prev.replace(problema, melhoria) : prev.replace(problema.trim(), melhoria))
    setRevApplied(idx)
    setTimeout(() => {
      setRevResult(prev => prev ? { ...prev, sugestoes: prev.sugestoes.filter((_, i) => i !== idx) } : prev)
      setRevApplied(null)
    }, 600)
  }

  async function revisorShorten() {
    if (!revText.trim()) return
    if (!apiKey) { setRevError('Configure sua API key em Configurações.'); return }
    setRevShortenLoading(true); setRevShortened(''); setRevError('')
    const bannedList = bannedWords.length
      ? `\n\nFRASES ABSOLUTAMENTE PROIBIDAS:\n${bannedWords.map(p => `- "${p}"`).join('\n')}`
      : ''
    const prompt = `Reescreva o texto abaixo de forma MAIS CURTA E SUCINTA — corte pelo menos 30% das palavras sem perder nenhuma ideia central.

REGRAS OBRIGATÓRIAS:
- Elimine frases redundantes, explicações desnecessárias e repetições
- Cada frase deve ganhar peso — se não acrescenta, corta
- Mantenha o gancho de abertura e o CTA final intactos
- Preserve o tom e a voz originais — apenas enxugue, não mude o estilo
- Mantenha a estrutura de parágrafos — NÃO junte tudo em um bloco
- O resultado deve soar mais direto e preciso, não truncado${bannedList}

Retorne APENAS o texto encurtado, sem introdução nem comentários.

TEXTO:
${revText.trim()}`
    try {
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 2500,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      setRevShortened(data.content?.find(b => b.type === 'text')?.text?.trim() || '')
    } catch (err) {
      setRevError(err.message || 'Erro ao encurtar. Tente novamente.')
    } finally {
      setRevShortenLoading(false)
    }
  }

  async function revisorRewrite() {
    if (!revResult?.sugestoes?.length) return
    if (!apiKey) { setRevError('Configure sua API key em Configurações.'); return }
    setRevRewriteLoading(true); setRevRewritten(''); setRevError('')
    const list = revResult.sugestoes.map((s, i) => `${i + 1}. "${s.problema}" → "${s.melhoria}"`).join('\n')
    const bannedList = bannedWords.length
      ? `\n\nFRASES ABSOLUTAMENTE PROIBIDAS — nunca use no texto reescrito:\n${bannedWords.map(p => `- "${p}"`).join('\n')}`
      : ''
    const prompt = `Reescreva o texto incorporando as melhorias. Preserve estilo e voz. Retorne APENAS o texto reescrito.${bannedList}\n\nTEXTO:\n${revText.trim()}\n\nMELHORIAS:\n${list}`
    try {
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 2500,
          system: withManualOperacional(ANTI_AI_FILTER),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      setRevRewritten(data.content?.find(b => b.type === 'text')?.text?.trim() || '')
    } catch (err) {
      setRevError(err.message || 'Erro ao reescrever. Tente novamente.')
    } finally {
      setRevRewriteLoading(false)
    }
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
    setEngSavedHub(false)
    setEngSweepReport(null)
    try {
      const res = await fetch('/api/ai?action=gemini', {
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
          max_tokens: 12000,
          system: withManualOperacional(`${ANTI_AI_FILTER}\n\n---\n\n${isPessoal ? PERSONAL_MASTER_PROMPT : ENGAGEMENT_SYSTEM}${buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords, posicionamento)}`),
          messages: [{ role: 'user', content: isPessoal
            ? buildPersonalReelsPrompt({ tema: engTema, ideia: engIdeia, texto: engTexto, template: engTemplate ? PERSONAL_ENGAGEMENT_TEMPLATES[engTemplate] : null })
            : buildEngagementPrompt({ tema: engTema, ideia: engIdeia, texto: engTexto, gerarIdeia: engGerarIdeia, gerarTexto: engGerarTexto, template: engTemplate ? ENGAGEMENT_TEMPLATES[engTemplate] : null }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const raw = data.content?.find(b => b.type === 'text')?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))

      // Varredura anti-clichê: content, caption e título já eram cobertos no
      // Studio Livre e no Carrossel, mas o roteiro de Reels nunca passou por
      // nenhuma varredura — saía direto da API pra tela.
      let report = null
      try {
        report = await sweepAndFixPaths(parsed, (o) => [
          ...engagementTextPaths(o),
          ...hookListPaths(o, 'respostas_sugeridas'),
        ])
      } catch { /* se a correção falhar, mantém o texto original */ }
      setEngSweepReport(report)

      setEngResult(parsed)
    } catch (err) {
      setEngError(err.message)
    } finally {
      setEngLoading(false)
    }
  }

  const generateReelsHooks = async () => {
    if (!engTema.trim()) return
    if (!apiKey) { setEngHookError('Configure sua API key.'); return }
    setEngHookLoading(true)
    setEngHookError(null)
    setEngHooks(null)
    try {
      const res = await fetch('/api/ai?action=gemini', {
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
          system: withManualOperacional(`${ANTI_AI_FILTER}\n\n---\n\n${buildHookSystem(isPessoal)}${buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords, posicionamento)}`),
          messages: [{ role: 'user', content: buildHookPrompt(engTema, engResult?.versao_principal, isPessoal) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const raw = data.content?.find(b => b.type === 'text')?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      const parsedHooks = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
      try { await sweepAndFixPaths(parsedHooks, (o) => hookListPaths(o, 'hooks', 'frase')) } catch { /* mantém o original */ }
      setEngHooks(parsedHooks)
    } catch (err) {
      setEngHookError(err.message)
    } finally {
      setEngHookLoading(false)
    }
  }

  const handleEngHookCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setEngHookCopied(key)
    setTimeout(() => setEngHookCopied(null), 2000)
  }

  const generateHooks = async () => {
    if (!apiKey) { setCarHooksError('Configure sua API key em Configurações.'); return }
    setCarHooksLoading(true)
    setCarHooks([])
    setCarHooksError('')
    try {
      const tema = carTema.trim() || (isPessoal ? 'vida e cotidiano' : 'carreira e maturidade profissional')
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 2500,
          system: withManualOperacional(`${ANTI_AI_FILTER}

---

Você gera hooks para o slide 1 de carrosséis do Instagram para Karen Santos.
${isPessoal
    ? `Neste modo Karen NÃO é a consultora tech. Aqui ela fala da vida fora do trabalho: casa, fé, compras, gostos, vida adulta e, quando o tema pedir, a bulldog Naomi. PROIBIDO puxar pra carreira, tecnologia ou mundo corporativo.\n${PERSONAL_SPECIFICITY_RULES}`
    : WORK_NICHE}
${isPessoal && isNaomiTheme(tema) ? NAOMI_EDITORIAL_GUIDE : ''}

PRINCÍPIO CENTRAL:
O hook não pode ser conceito. Tem que ser situação + comportamento.
A pessoa para porque se reconheceu numa cena, não porque achou a frase bonita.

ANTES (errado):
→ conceito abstrato que cabe em qualquer contexto
→ parece frase de Pinterest
→ não cria imagem na cabeça

DEPOIS (certo):
→ situação concreta que a pessoa já viveu
→ comportamento real que ela reconhece em si mesma
→ cria uma cena visual imediata

EXEMPLOS DO QUE FUNCIONA:
${isPessoal ? `- "eu juro que ia arrumar só uma gaveta… quatro horas depois"
- "tem coisa que o jogo de búzios me diz que eu já sabia e fingia não saber"
- "a Naomi decide o dia dela antes de mim"
- "comprar também é uma forma de descansar mesmo quando parece besteira"
- "domingo chega e eu já sei que vou adiar a mesma coisa"` : `- "você já pensou em sair… e ficou mesmo assim?"
- "tem gente que reclama do trabalho todo dia… mas não consegue sair"
- "tem decisão que a gente adia… e chama de 'pensar melhor'"
- "ficar também é uma escolha mesmo quando parece que não é"
- "segunda-feira chega e você já sabe que não queria estar ali"`}

REGRAS:
- Curto — entre 6 e 18 palavras. Pode ter quebra de linha com "…"
- Tom oral. Como quem falou isso num áudio, não escreveu num post
- Proibido: "ninguém fala sobre", "a verdade é", "o segredo", "você precisa saber", superlativo, exclamação, maiúsculas dramáticas
- Proibido: abstração sem cena ("a pressão do ambiente", "o peso das decisões")
- Cada hook tem que passar no teste: "isso parece algo que alguém viveu… ou algo que alguém escreveu?" — só entrega se parecer vivido

Gere exatamente 5 hooks para o tema dado. Responda EXCLUSIVAMENTE com JSON: {"hooks": ["hook1","hook2","hook3","hook4","hook5"]}${buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords, posicionamento)}`),
          messages: [{ role: 'user', content: `Tema: ${tema}` }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('A IA não retornou hooks válidos.')
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
      // Estes hooks viram o slide 1 do carrossel — passam pela mesma varredura
      try { await sweepAndFixPaths(parsed, (o) => hookListPaths(o, 'hooks')) } catch { /* mantém o original */ }
      setCarHooks(parsed.hooks || [])
    } catch (err) {
      setCarHooksError(err.message || 'Erro ao gerar hooks. Tente novamente.')
    } finally {
      setCarHooksLoading(false)
    }
  }

  const generateCarousel = async () => {
    if (!carTema.trim()) return
    if (!apiKey) { setCarError('Configure sua API key em Analytics > Configurações'); return }
    setCarLoading(true)
    setCarError(null)
    setCarResult(null)
    setCarSavedHub(false)
    setCarSweepReport(null)
    try {
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 12000,
          system: withManualOperacional(`${ANTI_AI_FILTER}\n\n---\n\n${buildCarouselSystem(isPessoal)}${buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords, posicionamento)}`),
          messages: [{ role: 'user', content: isPessoal
            ? buildPersonalCarouselPrompt({ tema: carTema, ideia: carIdeia, texto: carTexto })
            : buildCarouselPrompt({ tema: carTema, ideia: carIdeia, texto: carTexto, gerarIdeia: carGerarIdeia, gerarTexto: carGerarTexto, template: carTemplate ? CAROUSEL_TEMPLATES[carTemplate] : null, targetER: carTargetER }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const raw = data.content?.find(b => b.type === 'text')?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))

      // Varredura anti-clichê slide a slide, com verificação depois da reescrita
      let report = null
      try {
        report = await sweepAndFixPaths(parsed, carouselTextPaths)
      } catch { /* se a correção falhar, mantém o texto original */ }
      setCarSweepReport(report)

      setCarResult(parsed)
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

  const handleCarSaveHub = () => {
    if (!carResult) return
    const fmtSlides = (version) =>
      (version?.slides || []).map(s => `[${s.numero}] ${s.texto}`).join('\n')
    const scriptCompleto = [
      '=== VERSÃO PRINCIPAL ===\n' + fmtSlides(carResult.versao_principal),
      carResult.versao_principal?.pergunta_final
        ? `Pergunta: ${carResult.versao_principal.pergunta_final}` : '',
      carResult.variacao_emocional
        ? '\n=== VARIAÇÃO EMOCIONAL ===\n' + fmtSlides(carResult.variacao_emocional)
          + (carResult.variacao_emocional.pergunta_final ? `\nPergunta: ${carResult.variacao_emocional.pergunta_final}` : '')
        : '',
      carResult.variacao_provocativa
        ? '\n=== VARIAÇÃO PROVOCATIVA ===\n' + fmtSlides(carResult.variacao_provocativa)
          + (carResult.variacao_provocativa.pergunta_final ? `\nPergunta: ${carResult.variacao_provocativa.pergunta_final}` : '')
        : '',
      carResult.legenda
        ? `\n--- LEGENDA ---\n${carResult.legenda}` : '',
      carResult.comentarios?.length
        ? '\n--- COMENTÁRIOS PREVISTOS ---\n' +
          carResult.comentarios.map(c => `● "${c.comentario}"\n→ ${c.resposta}`).join('\n\n')
        : '',
    ].filter(Boolean).join('\n')
    addIdea({
      title: carTema,
      description: fmtSlides(carResult.versao_principal),
      script: scriptCompleto,
      caption: carResult.legenda || '',
      cta: carResult.versao_principal?.pergunta_final || '',
      format: 'carrossel',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: [
        'protocolo-carrossel',
        carTema.toLowerCase().slice(0, 20),
        ...(carTemplate ? [CAROUSEL_TEMPLATES[carTemplate].label.toLowerCase()] : []),
      ],
      source: carTemplate
        ? `Protocolo de Carrossel — ${CAROUSEL_TEMPLATES[carTemplate].label}${carTargetER ? ` — Meta E/R ${carTargetER}%` : ''}`
        : 'Protocolo de Carrossel',
    })
    setCarSavedHub(true)
  }

  const handleEngSaveHub = () => {
    if (!engResult) return
    const scriptCompleto = [
      engResult.versao_principal,
      engResult.variacao_emocional   ? `\n\n--- VARIAÇÃO EMOCIONAL ---\n${engResult.variacao_emocional}` : '',
      engResult.variacao_provocativa ? `\n\n--- VARIAÇÃO PROVOCATIVA ---\n${engResult.variacao_provocativa}` : '',
      engResult.pergunta_final       ? `\n\n--- PERGUNTA FINAL ---\n${engResult.pergunta_final}` : '',
      engResult.respostas_sugeridas?.length
        ? `\n\n--- RESPOSTAS PARA COMENTÁRIOS ---\n${engResult.respostas_sugeridas.join('\n')}`
        : '',
      engResult.nota_estrategica
        ? `\n\n--- NOTA ESTRATÉGICA ---\n${engResult.nota_estrategica}`
        : '',
    ].filter(Boolean).join('')
    addIdea({
      title: engTema,
      description: engResult.versao_principal,
      script: scriptCompleto,
      caption: engResult.pergunta_final || '',
      cta: (engResult.respostas_sugeridas || []).join('\n'),
      format: 'reel',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: ['protocolo-reels', engTema.toLowerCase().slice(0, 20), ...(engTemplate ? [((isPessoal ? PERSONAL_ENGAGEMENT_TEMPLATES : ENGAGEMENT_TEMPLATES)[engTemplate]?.label || engTemplate).toLowerCase()] : [])],
      source: engTemplate ? `${isPessoal ? 'Reels do lado de cá' : 'Protocolo Anti-Emoji'} — ${(isPessoal ? PERSONAL_ENGAGEMENT_TEMPLATES : ENGAGEMENT_TEMPLATES)[engTemplate]?.label}` : isPessoal ? 'Reels do lado de cá' : 'Protocolo Anti-Emoji',
    })
    setEngSavedHub(true)
  }

  const handleStrCopy = () => {
    if (!strResult) return
    navigator.clipboard.writeText(strResult)
    setStrCopied(true)
    setTimeout(() => setStrCopied(false), 2000)
  }

  const handleStrSaveHub = () => {
    if (!strResult) return
    const estrutura = (isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES)[strEstrutura]
    addIdea({
      title: strTema,
      description: strResult.slice(0, 300),
      script: strResult,
      caption: '',
      cta: '',
      format: 'stories',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: ['protocolo-stories', estrutura?.label.toLowerCase() || '', strTema.toLowerCase().slice(0, 20)].filter(Boolean),
      source: `Protocolo de Stories — ${estrutura?.label || ''}`,
    })
    setStrSavedHub(true)
  }

  const generateIANegocio = async () => {
    if (!ianTipoNegocio.trim()) return
    if (!apiKey) { setIanError('Configure sua API key em Analytics > Configurações'); return }
    setIanLoading(true)
    setIanError(null)
    setIanResult(null)
    setIanSavedHub(false)
    setIanSweepReport(null)
    try {
      const res = await fetch('/api/ai?action=gemini', {
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
          system: withManualOperacional(IA_NEGOCIO_SYSTEM),
          messages: [{ role: 'user', content: buildIANegocioPrompt({
            tipoNegocio: ianTipoNegocio, tarefa: ianTarefa, perda: ianPerda, ferramentas: ianFerramentas, objetivo: ianObjetivo,
          }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const raw = data.content?.find(b => b.type === 'text')?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))

      let report = null
      try {
        report = await sweepAndFixPaths(parsed, (o) => [
          ...(typeof o.roteiro === 'string' ? [{ path: ['roteiro'], isClosing: true, short: false, label: 'Roteiro' }] : []),
        ])
      } catch { /* se a correção falhar, mantém o texto original */ }
      setIanSweepReport(report)

      setIanResult(parsed)
    } catch (err) {
      setIanError(err.message)
    } finally {
      setIanLoading(false)
    }
  }

  const handleIanCopy = () => {
    if (!ianResult?.roteiro) return
    navigator.clipboard.writeText(ianResult.roteiro)
    setIanCopied(true)
    setTimeout(() => setIanCopied(false), 2000)
  }

  const handleIanSaveHub = () => {
    if (!ianResult) return
    addIdea({
      title: ianResult.titulo || `Reels IA — ${ianTipoNegocio}`,
      description: ianResult.roteiro?.slice(0, 300) || '',
      script: ianResult.roteiro,
      caption: '',
      cta: 'Comenta qual é o seu negócio. Eu posso mostrar onde colocaria a IA pra trabalhar nele.',
      format: 'reel',
      platform: 'instagram',
      platforms: ['instagram'],
      priority: 'medium',
      status: 'ready',
      tags: ['ia-no-negocio', (ianResult.tipo_negocio_usado || ianTipoNegocio).toLowerCase().slice(0, 24)].filter(Boolean),
      source: 'Como eu aplicaria IA na minha empresa',
    })
    setIanSavedHub(true)
  }

  const generateStories = async () => {
    if (!strTema.trim()) return
    if (!apiKey) { setStrError('Configure sua API key em Configurações'); return }
    setStrLoading(true)
    setStrError(null)
    setStrResult(null)
    setStrSavedHub(false)
    setStrSweepReport(null)
    try {
      const structuresMap = isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES
      const estrutura = structuresMap[strEstrutura] || structuresMap.observacao
      const systemPrompt = `${buildStoriesSystem(isPessoal)}${isPessoal && isNaomiTheme(strTema) ? `\n${NAOMI_EDITORIAL_GUIDE}` : ''}`
        .replace('{tema}', strTema)
        .replace('{estrutura}', estrutura.prompt)
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 3000,
          system: withManualOperacional(`${ANTI_AI_FILTER}\n\n---\n\n${systemPrompt}${buildVoiceContext(isPessoal ? null : brandVoice, dislikedContent, bannedWords, posicionamento)}`),
          messages: [{ role: 'user', content: 'Gere o stories agora.' }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const text = data.content?.find(b => b.type === 'text')?.text?.trim() || ''
      if (!text) throw new Error('Resposta inválida da IA')

      // Varredura anti-clichê: stories é texto corrido, sem JSON — trata como
      // um único campo de conteúdo, igual ao Studio Livre fora do carrossel.
      let corrected = text
      let report = null
      try {
        const wrapped = { content: text }
        report = await sweepAndFix(wrapped, 'stories')
        corrected = wrapped.content
      } catch { /* se a correção falhar, mantém o texto original */ }
      setStrSweepReport(report)

      setStrResult(corrected)
    } catch (err) {
      setStrError(err.message)
    } finally {
      setStrLoading(false)
    }
  }

  const applyTheme = (tema) => {
    if (mode === 'engagement') setEngTema(tema)
    else if (mode === 'carousel') setCarTema(tema)
    else if (mode === 'stories') setStrTema(tema)
    else setInput(tema)
  }

  const analyzeTemperatures = async (targets) => {
    if (!apiKey || targets.length === 0) return
    setSavedThemes(prev => prev.map(t =>
      targets.some(tg => tg.id === t.id) ? { ...t, temperatura: 'analyzing' } : t
    ))
    try {
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{ role: 'user', content: `Analise a temperatura de engajamento dos temas abaixo para uma criadora brasileira que fala de IA aplicada a negócio pequeno, estrutura para PJ e autônomo, e o celular como ferramenta de operação. Audiência majoritariamente de donos de negócio pequeno e profissionais por conta.

Temperatura:
- quente: alto potencial viral agora, gera forte identificação, timely
- morno: relevante mas sem urgência
- frio: evergreen, pouco senso de urgência

Seja honesto e crítico. Não infle. Considere ressonância emocional, compartilhabilidade e identificação da audiência.

Temas:
${targets.map(t => `- ${t.tema}`).join('\n')}

Responda EXCLUSIVAMENTE com JSON válido:
{"resultados": [{"tema": "...", "temperatura": "quente|morno|frio", "motivo": "1 frase direta e seca"}]}` }],
        }),
      })
      const data = await res.json()
      const match = (data.content?.find(b => b.type === 'text')?.text || '').match(/\{[\s\S]*\}/)
      if (match) {
        const results = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')).resultados || []
        setSavedThemes(prev => prev.map(t => {
          if (!targets.some(tg => tg.id === t.id)) return t
          const r = results.find(r => r.tema === t.tema)
          return r ? { ...t, temperatura: r.temperatura, motivo: r.motivo } : { ...t, temperatura: null }
        }))
      }
    } catch {
      setSavedThemes(prev => prev.map(t =>
        targets.some(tg => tg.id === t.id) ? { ...t, temperatura: null } : t
      ))
    }
  }

  /* Classificação por IA compartilhada: usada ao adicionar temas novos e ao
     reclassificar os que já estão salvos com as regras atuais. */
  const classifyThemesWithAI = async (temas) => {
    const categorias = isPessoal ? PERSONAL_CATEGORIES : WORK_CATEGORIES
    const fallback = () => temas.map(t => categorizeTheme(t))
    if (!apiKey || temas.length === 0) return fallback()

    try {
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          // Reclassificar manda TODOS os temas salvos de uma vez — pode ser
          // dezenas. 1500 truncava com poucos itens; escala com o tamanho do
          // lote, com piso testado ao vivo contra o mesmo tipo de prompt.
          max_tokens: Math.max(3000, temas.length * 100),
          system: `Classifique cada tema na categoria mais adequada. Categorias disponíveis: ${categorias.join(', ')}.
Responda EXCLUSIVAMENTE com JSON: [{"tema": "...", "categoria": "..."}]
Regras:
${isPessoal
    ? `- Naomi, cachorra, pet, bulldog, passeio, veterinário → "Vida com Naomi"
- Casa, decoração, cozinha, faxina, rotina doméstica → "A vida dentro de casa"
- Fé, terreiro, candomblé jejê, vodum, búzios, ancestralidade, gratidão, espiritualidade → "Fé na vida real"
- Compras, achados, resenhas de produto, unboxing → "Achados que valem a pena"
- Livros, séries, viagens, comida, música, treino, hobbies → "Meu repertório particular"
- Sentimentos, manias, memórias, família, cenas banais da vida adulta → "Ser adulta é isso?"`
    : `O público é founder (núcleo, ticket alto) e profissional de tecnologia em topo de funil — não é dono de negócio pequeno cuidando do próprio backoffice, e não é profissional em busca de promoção.
- Raça, ancestralidade, representatividade, autoridade sem performar o que não é seu, o peso de decidir por outras pessoas → "Camada humana"
- O processo por trás de uma decisão: a pergunta antes da proposta, o rascunho antes do slide, a reunião onde a decisão foi tomada → "Bastidor de estrategista"
- Exagero, promessa de ferramenta que não se sustenta, case de sucesso que esconde o que não deu certo, hype de tendência → "Desmonte de hype"
- A lógica por trás de uma decisão de negócio com IA: o que pesa, o que descarta, critério antes de contratar ou adotar algo → "Critério de decisão"

ATENÇÃO: isto não é mais sobre operação de negócio pequeno pelo celular nem sobre PJ/autônomo cuidando do próprio caixa — o eixo agora é a lógica de decisão de quem já decide (founder) ou está perto de decidir (profissional sênior).`}`,
          messages: [{ role: 'user', content: `Temas:\n${temas.map((t, i) => `${i + 1}. ${t}`).join('\n')}` }],
        }),
      })
      const data = await res.json()
      assertNotTruncated(data)
      const match = (data.content?.find(b => b.type === 'text')?.text || '').match(/\[[\s\S]*\]/)
      if (!match) return fallback()
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
      // Só aceita categoria que existe na lista da persona — modelo às vezes inventa
      return temas.map((t) => {
        const sugerida = parsed.find(p => p.tema === t)?.categoria
        return categorias.includes(sugerida) ? sugerida : categorizeTheme(t)
      })
    } catch {
      return fallback()
    }
  }

  const addTheme = async () => {
    const existing = new Set(savedThemes.map(s => s.tema))
    const now = new Date().toISOString().slice(0, 10)
    const novos = newThemeInput
      .split(',')
      .map(t => t.replace(/^[\s–\-•]+/, '').trim())
      .filter(t => t.length > 0 && !existing.has(t))
    if (novos.length === 0) return
    setNewThemeInput('')
    setCategorizingThemes(true)

    const categorias = await classifyThemesWithAI(novos)
    const classificados = novos.map((t, i) => ({
      id: Date.now() + i, tema: t, categoria: categorias[i], fonte: 'manual', criadoEm: now,
    }))

    setSavedThemes(prev => [...classificados, ...prev])
    setCategorizingThemes(false)
  }

  /* Reclassifica o que já está salvo com as regras atuais. As categorias mudaram
     junto com o posicionamento, então tema antigo pode estar na gaveta errada. */
  const reclassifyThemes = async () => {
    if (savedThemes.length === 0) return
    setReclassifying(true)
    const temas = savedThemes.map(t => t.tema)
    const categorias = await classifyThemesWithAI(temas)
    let mudou = 0
    const atualizados = savedThemes.map((t, i) => {
      if (categorias[i] && categorias[i] !== t.categoria) mudou++
      return { ...t, categoria: categorias[i] || t.categoria }
    })
    setSavedThemes(atualizados)
    setReclassifying(false)
    setReclassifyResult(mudou)
    setTimeout(() => setReclassifyResult(null), 6000)
  }

  const removeTheme = (id) => setSavedThemes(prev => {
    const removed = prev.find(t => t.id === id)
    if (isPessoal && removed?.tema) {
      setDismissedPersonalSuggestions(current => current.includes(removed.tema) ? current : [...current, removed.tema])
    }
    return prev.filter(t => t.id !== id)
  })

  const addThemeFromSuggestion = (tema, categoria) => {
    const existing = new Set(savedThemes.map(s => s.tema))
    if (existing.has(tema)) return
    const entry = { id: Date.now(), tema, categoria, fonte: 'manual', criadoEm: new Date().toISOString().slice(0, 10) }
    setSavedThemes(prev => [entry, ...prev])
  }

  const expandThemes = async () => {
    if (!apiKey) { setExpandThemesError('Configure sua API key em Configurações'); return }
    const categoria = bankOpenCategory
    const temasNaCategoria = categoria ? savedThemes.filter(t => t.categoria === categoria) : savedThemes
    if (!isPessoal && !categoria && savedThemes.length === 0) return
    setExpandingThemes(true)
    setExpandThemesError(null)
    try {
      // Os temas existentes entram como referência do que já foi coberto. Mas os
      // que sobraram do posicionamento antigo não podem servir de exemplo: se o
      // modelo vê "pedir aumento" como exemplo da categoria, gera mais rotina de
      // CLT. Eles vão como contraexemplo.
      const sugestoesBase = isPessoal
        ? PERSONAL_TEMAS_SUGESTOES
          .filter(grupo => !categoria || grupo.categoria === categoria)
          .flatMap(grupo => grupo.temas.map(tema => ({ tema, categoria: grupo.categoria })))
        : []
      const base = categoria ? [...temasNaCategoria, ...sugestoesBase] : [...savedThemes, ...sugestoesBase]
      const noPosicionamento = isPessoal ? base : base.filter(t => !isCltFramed(t.tema))
      const foraDoPosicionamento = isPessoal ? [] : base.filter(t => isCltFramed(t.tema))

      const contextoCategoria = [
        categoria ? `Categoria focada: "${categoria}"` : null,
        `Temas já existentes${categoria ? ' nessa categoria' : ''}:\n${noPosicionamento.map(t => `- ${t.tema}`).join('\n') || '(nenhum ainda)'}`,
        foraDoPosicionamento.length
          ? `Estes estão no banco mas são do posicionamento antigo, de vida de empregado. NÃO use como referência e NÃO gere nada parecido:\n${foraDoPosicionamento.map(t => `- ${t.tema}`).join('\n')}`
          : null,
      ].filter(Boolean).join('\n\n')
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 1500,
          messages: [{ role: 'user', content: `${isPessoal
            ? `Você sugere MICROTemas de conteúdo PESSOAL para Karen Santos, que compartilha a vida fora do trabalho: casa, a bulldog Naomi, fé, achados, repertório e vida adulta. O objetivo é conexão sem exposição. PROIBIDO: carreira, tecnologia, produtividade, mundo corporativo, conselho genérico ou moral da história.

Categorias disponíveis — use exatamente estes nomes:
- "Vida com Naomi": comportamentos reais da bulldog, rotina, manias, passeios e a dinâmica entre as duas. Naomi é cachorra, nunca criança ou pessoa.
- "A vida dentro de casa": rotina doméstica, casa vivida, comida, organização possível, objetos e pequenos rituais.
- "Fé na vida real": terreiro, vodum, búzios, espera, dúvida, gratidão e espiritualidade sem pregação.
- "Achados que valem a pena": compras usadas de verdade, arrependimentos, custo-benefício e consumo consciente.
- "Meu repertório particular": livros, séries, música, comida, gostos inesperados, referências e hobbies.
- "Ser adulta é isso?": amizades, descanso, limites, mudanças de gosto, contradições e cenas da vida adulta.

Cada microtema deve ser um recorte pequeno e concreto que possa virar uma cena ou história. O banal específico vale mais que o grandioso.`
            : `Você é estrategista de conteúdo para Karen Santos. ${WORK_NICHE}

O leitor é founder ou profissional sênior que já decide ou está perto de decidir — não é alguém aguardando aprovação de cima.
PROIBIDO sugerir tema de rotina de empregado: promoção, aumento, chefe, gestor, feedback, avaliação de desempenho, entrevista, currículo, vaga, demissão, política de escritório, síndrome do impostor em cargo.
O equivalente do lado de cá: no lugar de "pedir aumento", o critério antes de fechar uma decisão; no lugar de "chefe que microgerencia", a decisão que não dá pra terceirizar; no lugar de "medo de ser demitido", o peso de uma decisão errada custar caro pro negócio.${categoria && WORK_CATEGORY_BRIEF[categoria] ? `

O que a categoria "${categoria}" quer dizer: ${WORK_CATEGORY_BRIEF[categoria]}` : ''}`}

${contextoCategoria}

Gere 5 novos ${isPessoal ? 'microtemas' : 'temas'} ${categoria ? `para a categoria "${categoria}"` : isPessoal ? 'distribuídos entre as categorias disponíveis' : 'relacionados'} — específicos, concretos e diferentes de tudo que já existe. Não repita, não parafraseie e não use linguagem de coach. ${isPessoal ? 'Máximo 12 palavras.' : 'Máximo 8 palavras.'} Inclua a categoria e a temperatura de cada um.

Temperatura:
- quente: alto potencial viral agora, forte identificação
- morno: relevante mas sem urgência
- frio: evergreen, menos imediato

Responda EXCLUSIVAMENTE com JSON válido:
{"temas": [{"tema": "...", "categoria": "...", "temperatura": "quente|morno|frio", "motivo": "1 frase direta"}]}` }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
      const existing = new Set([
        ...savedThemes.map(t => t.tema),
        ...(isPessoal ? PERSONAL_TEMAS_SUGESTOES.flatMap(grupo => grupo.temas) : []),
        ...(isPessoal ? dismissedPersonalSuggestions : []),
      ])
      const novos = (parsed.temas || [])
        .filter(t => !existing.has(t.tema))
        .map(t => ({
          id: Date.now() + Math.random(),
          tema: t.tema, temperatura: t.temperatura || null, motivo: t.motivo || null,
          categoria: categoria || (isPessoal && PERSONAL_CATEGORIES.includes(t.categoria) ? t.categoria : categorizeTheme(t.tema)),
          fonte: 'ia', criadoEm: new Date().toISOString().slice(0, 10),
        }))
      if (novos.length === 0) throw new Error('A IA não retornou temas novos. Tente de novo.')
      setSavedThemes(prev => [...prev, ...novos])
    } catch (err) {
      setExpandThemesError(err.message || 'Erro ao expandir temas.')
    } finally { setExpandingThemes(false) }
  }

  const CONTEXT_COLORS = {
    reflexivo: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Reflexivo' },
    engracado: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Engraçado' },
    mentora: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Mentora' },
    // Tons do Studio Pessoal
    diario: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', label: 'Diário' },
    cotidiano: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Cotidiano' },
    observacao: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', label: 'Observação' },
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shadow-lg',
            isPessoal ? 'bg-gradient-to-br from-rose-400 to-pink-600 shadow-pink-200' : 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-200')}>
            {isPessoal ? <Heart size={20} className="text-white" /> : <PenTool size={20} className="text-white" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isPessoal ? 'Studio Pessoal · Do lado de cá' : 'Criar Conteúdo'}</h1>
            <p className="text-xs text-gray-400">
              {isPessoal
                ? 'Histórias, gostos e pequenas descobertas da sua vida fora do trabalho'
                : 'Descreva o que quer criar — a IA detecta o tom e formato ideal'}
            </p>
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

      {/* ── Banco de Temas ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowThemesPanel(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-gray-700">{isPessoal ? 'Banco de Microtemas' : 'Banco de Temas'}</span>
            {savedThemes.length > 0 && (
              <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {savedThemes.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">clique para usar no campo Tema</span>
            {showThemesPanel ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </button>

        {showThemesPanel && (
          <div className="border-t border-gray-100">
            {/* Actions bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/40">
              <input
                value={newThemeInput}
                onChange={e => setNewThemeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTheme()}
                placeholder={isPessoal ? 'Adicione microtemas separados por vírgula...' : 'Adicione temas separados por vírgula...'}
                className="input text-xs flex-1 py-1.5"
              />
              <button
                onClick={addTheme}
                disabled={!newThemeInput.trim() || categorizingThemes}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40 shrink-0"
              >
                {categorizingThemes ? <><Loader2 size={11} className="animate-spin" /> Classificando...</> : '+ Adicionar'}
              </button>
              <button
                onClick={isPessoal ? () => { setShowPersonalSuggestions(true); expandThemes() } : expandThemes}
                disabled={expandingThemes || (!isPessoal && !bankOpenCategory && savedThemes.length === 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-40 shrink-0"
              >
                {expandingThemes ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {isPessoal ? 'Gerar microtemas' : bankOpenCategory ? `Expandir ${bankOpenCategory}` : 'Expandir com IA'}
              </button>
              {savedThemes.length > 0 && (
                <button
                  onClick={reclassifyThemes}
                  disabled={reclassifying}
                  title="Reclassifica os temas salvos com as regras atuais das categorias"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40 shrink-0"
                >
                  {reclassifying ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Reclassificar
                </button>
              )}
              {savedThemes.length > 0 && (
                <button
                  onClick={() => { if (window.confirm('Limpar todos os temas salvos?')) setSavedThemes([]) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                >
                  <X size={11} /> Limpar
                </button>
              )}
            </div>

            {expandThemesError && (
              <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-600">
                {expandThemesError}
              </div>
            )}

            {isPessoal && !showPersonalSuggestions && (
              <p className="mx-4 mt-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-600">
                Os microtemas sugeridos ficam ocultos até você clicar em Gerar microtemas.
              </p>
            )}

            {isPessoal && dismissedPersonalSuggestions.length > 0 && (
              <div className="mx-4 mt-2 flex justify-end">
                <button
                  onClick={() => setDismissedPersonalSuggestions([])}
                  className="text-[10px] font-medium text-gray-400 hover:text-rose-500 underline underline-offset-2"
                >
                  Restaurar {dismissedPersonalSuggestions.length} microtema{dismissedPersonalSuggestions.length > 1 ? 's' : ''} apagado{dismissedPersonalSuggestions.length > 1 ? 's' : ''}
                </button>
              </div>
            )}

            {!isPessoal && (() => {
              const clt = savedThemes.filter(t => isCltFramed(t.tema))
              if (clt.length === 0) return null
              return (
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2">
                  <span>
                    {clt.length} tema{clt.length > 1 ? 's' : ''} do posicionamento antigo — escrito{clt.length > 1 ? 's' : ''} do lugar de empregado, não de dono de negócio.
                  </span>
                  <button
                    onClick={() => {
                      const ids = new Set(clt.map(t => t.id))
                      if (window.confirm(`Remover ${clt.length} tema${clt.length > 1 ? 's' : ''} de rotina CLT do banco?`)) {
                        setSavedThemes(prev => prev.filter(t => !ids.has(t.id)))
                      }
                    }}
                    className="font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    Remover {clt.length > 1 ? 'todos' : ''}
                  </button>
                </div>
              )
            })()}

            {reclassifyResult != null && (
              <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 mb-2">
                {reclassifyResult === 0
                  ? 'Todos os temas já estavam na categoria certa.'
                  : reclassifyResult === 1
                    ? '1 tema mudou de categoria.'
                    : `${reclassifyResult} temas mudaram de categoria.`}
              </p>
            )}

            {/* Accordion por categoria — temas salvos + sugestões (lista de categorias
                muda por persona: Studio Pessoal nunca deve mostrar seções profissionais) */}
            <div className="px-4 py-3 space-y-1.5">
              {(isPessoal ? PERSONAL_TEMAS_SUGESTOES : TEMAS_CARROSSEL).map(({ categoria, temas: sugestoes }) => {
                const isOpen = bankOpenCategory === categoria
                const savedInCat = savedThemes.filter(s => s.categoria === categoria)
                const savedSet = new Set(savedThemes.map(s => s.tema))
                const sugestoesNaoSalvas = isPessoal && !showPersonalSuggestions
                  ? []
                  : sugestoes.filter(t => !savedSet.has(t) && (!isPessoal || !dismissedPersonalSuggestions.includes(t)))
                const totalCount = savedInCat.length
                return (
                  <div key={categoria} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setBankOpenCategory(isOpen ? null : categoria)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-orange-50 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-gray-700">{categoria}</span>
                      <div className="flex items-center gap-2">
                        {totalCount > 0 && (
                          <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">{totalCount}</span>
                        )}
                        {isOpen ? <ChevronUp size={13} className="text-orange-500" /> : <ChevronDown size={13} className="text-gray-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-white px-3 py-2 space-y-1">
                        {/* Temas salvos nesta categoria */}
                        {isPessoal && savedInCat.length > 0 && (
                          <p className="px-2.5 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                            Seus temas
                          </p>
                        )}
                        {savedInCat.map(item => (
                          <div key={item.id} className="flex items-center gap-1.5 group">
                            <button
                              onClick={() => applyTheme(item.tema)}
                              className="flex-1 text-left text-xs text-gray-800 font-medium hover:text-orange-600 px-2.5 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                            >
                              {item.tema}
                              {!isPessoal && isCltFramed(item.tema) && (
                                <span
                                  className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
                                  title="Tema escrito do lugar de empregado — veio do posicionamento antigo. Reescreva do lado de quem é dono ou remova."
                                >
                                  CLT
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => removeTheme(item.id)}
                              title={isPessoal ? 'Apagar microtema' : 'Apagar tema'}
                              aria-label={isPessoal ? `Apagar microtema ${item.tema}` : `Apagar tema ${item.tema}`}
                              className={clsx(
                                'text-gray-300 hover:text-red-400 transition-all shrink-0 p-1',
                                !isPessoal && 'opacity-0 group-hover:opacity-100'
                              )}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}

                        {/* Separador só se tiver salvos e sugestões */}
                        {savedInCat.length > 0 && sugestoesNaoSalvas.length > 0 && (
                          <div className="border-t border-gray-100 my-1.5" />
                        )}

                        {/* Sugestões não salvas */}
                        {isPessoal && sugestoesNaoSalvas.length > 0 && (
                          <p className="px-2.5 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-400">
                            Sugestões do Studio · clique para adicionar
                          </p>
                        )}
                        {sugestoesNaoSalvas.map(tema => (
                          <div key={tema} className="flex items-center gap-1 group">
                            <button
                              onClick={() => addThemeFromSuggestion(tema, categoria)}
                              className="flex-1 text-left text-xs text-gray-400 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between gap-2"
                            >
                              <span>{tema}</span>
                              <Plus size={11} className="text-gray-300 shrink-0" />
                            </button>
                            {isPessoal && (
                              <button
                                onClick={() => setDismissedPersonalSuggestions(prev => prev.includes(tema) ? prev : [...prev, tema])}
                                title="Apagar sugestão"
                                aria-label={`Apagar sugestão ${tema}`}
                                className="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-1"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        ))}

                        {savedInCat.length === 0 && sugestoesNaoSalvas.length === 0 && (!isPessoal || showPersonalSuggestions) && (
                          <p className="text-[11px] text-gray-300 text-center py-2">Todos adicionados</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Seletor de modo ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        <button onClick={() => setMode('revisor')}
          className={clsx('flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'revisor' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-violet-600'
          )}>
          <Sparkles size={13} /> Revisor
        </button>
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
        <button onClick={() => setMode('stories')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'stories' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <Film size={13} /> Stories
        </button>
        <button onClick={() => setMode('ia_negocio')}
          className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            mode === 'ia_negocio' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          )}>
          <Building2 size={13} /> IA no Negócio
        </button>
      </div>

      {/* ── Revisor de Texto ── */}
      {mode === 'revisor' && (
        <div className="space-y-5 animate-fade-in">
          {(() => {
            const REV_DIMS = [
              { key: 'clareza', label: 'Clareza', color: '#3b82f6' },
              { key: 'tom', label: 'Tom', color: '#8b5cf6' },
              { key: 'impacto', label: 'Impacto', color: '#f59e0b' },
              { key: 'autenticidade', label: 'Autenticidade', color: '#10b981' },
            ]
            const scoreColor = revResult ? (revResult.score >= 75 ? '#10b981' : revResult.score >= 50 ? '#f59e0b' : '#ef4444') : '#e5e7eb'
            const r = 30, circ = 2 * Math.PI * r
            const offset = revResult ? circ - (revResult.score / 100) * circ : circ
            return (
              <>
                {/* Input + Analyze */}
                <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200 shrink-0">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Revisor de Texto</p>
                      <p className="text-xs text-gray-400">Cole qualquer texto gerado — roteiro, legenda, carrossel — e receba uma análise completa</p>
                    </div>
                  </div>
                  <textarea
                    value={revText}
                    onChange={(e) => setRevText(e.target.value)}
                    rows={7}
                    placeholder="Cole aqui o roteiro, legenda ou qualquer texto gerado para revisar..."
                    className="w-full text-sm border border-gray-200 rounded-xl p-4 resize-none outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300 leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-300">{revText.length} caracteres</span>
                    {revText && <button onClick={() => { setRevText(''); setRevResult(null); setRevRewritten(''); setRevError('') }} className="text-[11px] text-gray-400 hover:text-gray-600">Limpar</button>}
                  </div>
                  <BannedWordsBox
                    bannedWords={bannedWords}
                    onAdd={addBannedWord}
                    onRemove={removeBannedWord}
                    hint="(o revisor vai sinalizar e evitar ao reescrever)"
                  />

                  {revError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                      <AlertCircle size={14} className="text-red-400 shrink-0" />
                      <p className="text-sm text-red-600">{revError}</p>
                    </div>
                  )}
                  <button
                    onClick={revisorAnalyze}
                    disabled={revLoading || !revText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: revLoading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                  >
                    {revLoading ? <><RefreshCw size={14} className="animate-spin" /> Analisando...</> : <><Sparkles size={14} /> Revisar Texto</>}
                  </button>
                </div>

                {/* Results */}
                {revResult && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Score + Dimensions */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                      <div className="flex items-center gap-6">
                        {/* Score ring */}
                        <div className="relative w-20 h-20 shrink-0">
                          <svg width="80" height="80" className="-rotate-90">
                            <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                            <circle cx="40" cy="40" r={r} fill="none" stroke={scoreColor} strokeWidth="6"
                              strokeDasharray={circ} strokeDashoffset={offset}
                              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-gray-800">{revResult.score}</span>
                            <span className="text-[10px] text-gray-400">/100</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Score Geral</p>
                          <p className="text-sm text-gray-700 font-medium leading-snug mb-3">{revResult.parecer}</p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {REV_DIMS.map(({ key, label, color }) => (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] text-gray-500">{label}</span>
                                  <span className="text-[10px] font-bold text-gray-600">{revResult.dimensoes?.[key]}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${revResult.dimensoes?.[key] || 0}%`, background: color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Robotic/cliché language */}
                    {revResult.linguagem_robotica?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm space-y-3">
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Soa artificial / clichê</p>
                        <div className="space-y-2">
                          {revResult.linguagem_robotica.map((t, i) => {
                            const phrase = extractBannablePhrase(t)
                            const alreadyBanned = bannedWords.some((w) => w.toLowerCase() === phrase.toLowerCase())
                            return (
                              <div key={i} className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 flex items-center justify-between gap-3">
                                <p className="text-sm text-red-700 italic flex-1">"{t}"</p>
                                {alreadyBanned ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 shrink-0">banido</span>
                                ) : (
                                  <button
                                    onClick={() => addBannedWord(phrase)}
                                    className="text-[10px] font-semibold px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors shrink-0"
                                  >
                                    Banir
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {revResult.sugestoes?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Sugestões de melhoria</p>
                        <div className="space-y-3">
                          {revResult.sugestoes.map((s, i) => (
                            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                              <div className="px-4 py-2.5 bg-red-50/60 border-b border-gray-100">
                                <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide mb-1">Antes</p>
                                <p className="text-sm text-gray-700 italic">"{s.problema}"</p>
                              </div>
                              <div className="px-4 py-2.5 bg-emerald-50/60">
                                <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide mb-1">Sugestão</p>
                                <p className="text-sm text-gray-800 font-medium mb-2.5">"{s.melhoria}"</p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => revisorApply(s.problema, s.melhoria, i)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${revApplied === i ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
                                  >
                                    {revApplied === i ? <><Check size={11} /> Aplicado!</> : <><Wand2 size={11} /> Aplicar no texto</>}
                                  </button>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(s.melhoria); setRevCopied(i); setTimeout(() => setRevCopied(false), 1500) }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors"
                                  >
                                    {revCopied === i ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Rewrite + Shorten buttons */}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={revisorRewrite}
                            disabled={revRewriteLoading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                            style={{ background: revRewriteLoading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                          >
                            {revRewriteLoading ? <><RefreshCw size={14} className="animate-spin" /> Reescrevendo...</> : <><Wand2 size={14} /> Reescrever Completo</>}
                          </button>
                          <button
                            onClick={revisorShorten}
                            disabled={revShortenLoading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                            style={{ background: revShortenLoading ? '#6b7280' : 'linear-gradient(135deg, #374151, #1f2937)' }}
                          >
                            {revShortenLoading ? <><RefreshCw size={14} className="animate-spin" /> Encurtando...</> : <><Layers size={14} /> Encurtar Texto</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rewritten result */}
                    {revRewritten && (
                      <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5 shadow-sm space-y-3 animate-fade-in">
                        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Roteiro Reescrito</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text" onMouseUp={handleTextSelectionForBan}>{revRewritten}</p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(revRewritten); setRevCopied('rewrite'); setTimeout(() => setRevCopied(false), 1500) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-violet-200 text-violet-700 hover:bg-white transition-colors"
                          >
                            {revCopied === 'rewrite' ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                          </button>
                          <button
                            onClick={() => { setRevText(revRewritten); setRevRewritten(''); setRevResult(null) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                          >
                            <Check size={13} /> Usar este texto
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Shortened result */}
                    {revShortened && (
                      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3 animate-fade-in">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Texto Encurtado</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text" onMouseUp={handleTextSelectionForBan}>{revShortened}</p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(revShortened); setRevCopied('shorten'); setTimeout(() => setRevCopied(false), 1500) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-white transition-colors"
                          >
                            {revCopied === 'shorten' ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                          </button>
                          <button
                            onClick={() => { setRevText(revShortened); setRevShortened(''); setRevResult(null) }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                          >
                            <Check size={13} /> Usar este texto
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {revResult.pontos_fortes?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-2">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Pontos fortes</p>
                        {revResult.pontos_fortes.map((p, i) => (
                          <p key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{p}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Formulário de Engajamento ── */}
      {mode === 'engagement' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <MessageCircle size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{isPessoal ? 'Roteiros do lado de cá' : 'Protocolo Anti-Emoji'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isPessoal ? 'Transforma uma observação pessoal em história, afeto ou humor' : 'Gera roteiro otimizado para comentários reais — não emojis'}</p>
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
                placeholder={isPessoal ? 'Ex: a Naomi e o sofá, comprinha de domingo, mania que herdei da minha mãe...' : 'Ex: solidão na carreira, síndrome da impostora, burnout disfarçado de produtividade...'}
                className="input text-sm w-full"
                autoFocus
              />
            </div>

            {/* Estrutura de Roteiro */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Estrutura de roteiro <span className="text-gray-300">(opcional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(isPessoal ? PERSONAL_ENGAGEMENT_TEMPLATES : ENGAGEMENT_TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEngTemplate(prev => prev === key ? null : key)}
                    title={t.desc}
                    className={clsx(
                      'text-left px-2.5 py-2 rounded-lg border transition-all',
                      engTemplate === key
                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    <p className="text-[11px] font-semibold leading-tight">{t.label}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5 capitalize">{t.alavanca}</p>
                  </button>
                ))}
              </div>
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

            <BannedWordsBox bannedWords={bannedWords} onAdd={addBannedWord} onRemove={removeBannedWord} />

            {engError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{engError}</div>
            )}

            <button
              onClick={generateEngagement}
              disabled={engLoading || !engTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {engLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando conteúdo...</> : <><Zap size={15} /> Gerar Conteúdo</>}
            </button>
          </div>

          {/* ── Output de Engajamento ── */}
          {engResult && (
            <div className="space-y-4 animate-fade-in">

              {/* Varredura anti-clichê */}
              {engSweepReport?.fixed > 0 && !engSweepReport.remaining.length && (
                <p className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> {engSweepReport.fixed} clichê{engSweepReport.fixed > 1 ? 's' : ''} corrigido{engSweepReport.fixed > 1 ? 's' : ''} na varredura
                </p>
              )}
              <SweepReportPanel report={engSweepReport} onBan={addBannedWord} bannedWords={bannedWords} />
              <CoherenceChecker text={engResult.versao_principal} posicionamento={posicionamento} />

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
                <div
                  className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed select-text"
                  onMouseUp={handleTextSelectionForBan}
                >
                  {engResult.versao_principal}
                </div>
              </div>

              {/* Pergunta Final */}
              {engResult.pergunta_final && <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white shadow-lg shadow-orange-200">
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
              </div>}

              {/* Exercício Prático */}
              {engResult.exercicio_pratico && (
                <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-100 bg-amber-50/50">
                    <div className="flex items-center gap-2">
                      <Target size={12} className="text-amber-500" />
                      <span className="text-[10px] font-semibold text-gray-700 uppercase">Exercício Prático</span>
                    </div>
                    <button onClick={() => handleEngCopy(engResult.exercicio_pratico, 'eng-exercicio')}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors">
                      {engCopied === 'eng-exercicio' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                    </button>
                  </div>
                  <p className="p-4 text-sm text-gray-800 leading-relaxed select-text" onMouseUp={handleTextSelectionForBan}>{engResult.exercicio_pratico}</p>
                </div>
              )}

              {/* Variações */}
              <div className="space-y-2">
                {[
                  { key: 'variacao_emocional',    label: isPessoal ? 'Variação Afetiva' : 'Variação Emocional',    color: 'rose',   dot: 'bg-rose-500',   show: engShowEmocional,    toggle: () => setEngShowEmocional(v => !v) },
                  { key: 'variacao_provocativa',   label: isPessoal ? 'Variação com Humor Seco' : 'Variação Provocativa',  color: 'indigo', dot: 'bg-indigo-500', show: engShowProvocativo,   toggle: () => setEngShowProvocativo(v => !v) },
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
                      <div
                        className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3 select-text"
                        onMouseUp={handleTextSelectionForBan}
                      >
                        {engResult[key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Gerador de Hook ── */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-amber-500" />
                    <span className="text-xs font-semibold text-gray-700">Hooks de Abertura (0-3s)</span>
                    <span className="text-[10px] text-gray-400">— o que prende antes do roteiro começar</span>
                  </div>
                  <button
                    onClick={generateReelsHooks}
                    disabled={engHookLoading}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-40"
                  >
                    {engHookLoading
                      ? <><Loader2 size={11} className="animate-spin" /> Gerando...</>
                      : engHooks
                        ? <><RefreshCw size={11} /> Regenerar</>
                        : <><Zap size={11} /> Gerar 3 Hooks</>
                    }
                  </button>
                </div>

                {engHookError && (
                  <div className="px-4 py-3 text-xs text-red-600 bg-red-50">{engHookError}</div>
                )}

                {engHooks && (
                  <div className="divide-y divide-gray-100">
                    {(engHooks.hooks || []).map((hook, i) => {
                      const tipoLabel = {
                        observacao_cortante: 'Observação Cortante',
                        dado_leitura_inesperada: 'Dado + Leitura Inesperada',
                        cena_especifica: 'Cena Específica',
                      }[hook.tipo] || hook.tipo

                      const tipoColor = {
                        observacao_cortante: 'bg-violet-100 text-violet-700 border-violet-200',
                        dado_leitura_inesperada: 'bg-blue-100 text-blue-700 border-blue-200',
                        cena_especifica: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                      }[hook.tipo] || 'bg-gray-100 text-gray-600 border-gray-200'

                      const copyText = [
                        `FRASE: ${hook.frase}`,
                        `TEXTO NA TELA: ${hook.texto_na_tela}`,
                        `ENQUADRAMENTO: ${hook.enquadramento}`,
                        `MOVIMENTO: ${hook.movimento}`,
                        `SOM: ${hook.som}`,
                      ].join('\n')

                      return (
                        <div key={i} className="px-4 py-4 space-y-3 group">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tipoColor}`}>
                              {tipoLabel}
                            </span>
                            <button
                              onClick={() => handleEngHookCopy(copyText, `hook-${i}`)}
                              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
                            >
                              {engHookCopied === `hook-${i}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                            </button>
                          </div>

                          {/* Frase */}
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Frase de abertura</p>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">"{hook.frase}"</p>
                          </div>

                          {/* Texto na tela */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-20">Tela</span>
                            <p className="text-xs text-gray-700">{hook.texto_na_tela}</p>
                          </div>

                          {/* Enquadramento + movimento */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-20">Câmera</span>
                            <p className="text-xs text-gray-700">{hook.enquadramento} · {hook.movimento}</p>
                          </div>

                          {/* Som */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-20">Som</span>
                            <p className="text-xs text-gray-700">{hook.som}</p>
                          </div>

                          {/* Por que funciona */}
                          {hook.por_que_funciona && (
                            <div className="flex items-start gap-1.5 pt-1 border-t border-gray-100">
                              <span className="text-[10px] text-gray-300 mt-0.5">→</span>
                              <p className="text-[11px] text-gray-400 italic">{hook.por_que_funciona}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {!engHooks && !engHookLoading && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs text-gray-400">
                      Gere o roteiro primeiro, depois clique em "Gerar 3 Hooks" para receber opções de abertura com indicação visual e sonora.
                    </p>
                  </div>
                )}
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

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleEngSaveHub}
                  disabled={engSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    engSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                  )}
                >
                  {engSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {engSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-violet-600 hover:border-violet-200 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateEngagement}
                  disabled={engLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={engLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
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

            {/* Template de Slides — templates são de ferramentas/tech, não fazem sentido no Studio Pessoal */}
            {!isPessoal && (
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Template de slides <span className="text-gray-300">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(CAROUSEL_TEMPLATES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCarTemplate(prev => prev === key ? null : key)}
                      title={t.desc}
                      className={clsx(
                        'text-left px-2.5 py-2 rounded-lg border transition-all',
                        carTemplate === key
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <p className="text-[11px] font-semibold leading-tight">{t.label}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 capitalize">{t.alavanca}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meta de E/R */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Meta de E/R <span className="text-gray-300">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="number" step="0.01" min="0"
                  value={carTargetER}
                  onChange={e => setCarTargetER(e.target.value)}
                  placeholder="2,00"
                  className="input text-sm w-full pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
            </div>

            {/* Tema */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  Tema <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={() => { generateHooks(); setCarHooks([]) }}
                  disabled={carHooksLoading}
                  className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-40"
                >
                  {carHooksLoading ? <Loader2 size={10} className="animate-spin" /> : <Flame size={10} />}
                  {carHooksLoading ? 'Gerando...' : 'Gerar hooks'}
                </button>
              </div>
              <input
                value={carTema}
                onChange={e => { setCarTema(e.target.value); setCarHooks([]) }}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateCarousel()}
                placeholder={isPessoal ? 'Ex: a mania que herdei da minha mãe, achado da Shopee, domingo na feira...' : 'Ex: procrastinação, medo de ser demitido, perfeccionismo no trabalho...'}
                className="input text-sm w-full"
              />
              {carHooksError && (
                <p className="text-[10px] text-red-500 mt-1">{carHooksError}</p>
              )}
              {carHooks.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-gray-400 font-medium mb-1">Clique para usar como tema do slide 1:</p>
                  {carHooks.map((hook, i) => (
                    <button
                      key={i}
                      onClick={() => { setCarTema(hook); setCarHooks([]) }}
                      className="w-full text-left text-xs text-gray-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 px-3 py-2 rounded-lg transition-colors leading-snug"
                    >
                      {hook}
                    </button>
                  ))}
                </div>
              )}
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

            <BannedWordsBox bannedWords={bannedWords} onAdd={addBannedWord} onRemove={removeBannedWord} />

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
            <div className="space-y-3 animate-fade-in">

              {/* Varredura anti-clichê */}
              {carSweepReport?.fixed > 0 && !carSweepReport.remaining.length && (
                <p className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> {carSweepReport.fixed} clichê{carSweepReport.fixed > 1 ? 's' : ''} corrigido{carSweepReport.fixed > 1 ? 's' : ''} na varredura
                </p>
              )}
              <SweepReportPanel report={carSweepReport} onBan={addBannedWord} bannedWords={bannedWords} />
              <CoherenceChecker
                text={(carResult.versao_principal?.slides || []).map((s) => s.texto).filter(Boolean).join('\n\n')}
                posicionamento={posicionamento}
              />

              {/* Abas de versão */}
              {(() => {
                const versions = [
                  { key: 'principal',   label: 'Principal',   data: carResult.versao_principal },
                  { key: 'emocional',   label: isPessoal ? 'Afetiva' : 'Emocional',   data: carResult.variacao_emocional },
                  { key: 'provocativa', label: isPessoal ? 'Humor seco' : 'Provocativa', data: carResult.variacao_provocativa },
                ]
                const active = versions.find(v => v.key === carActiveVersion) || versions[0]
                return (
                  <>
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                      {versions.map(v => (
                        <button key={v.key} onClick={() => setCarActiveVersion(v.key)}
                          className={clsx('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                            carActiveVersion === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                          )}>
                          {v.label}
                        </button>
                      ))}
                    </div>

                    {/* Slides da versão ativa */}
                    {active.data && (
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 pt-3 pb-2">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Slides</span>
                          <button onClick={() => handleCarCopy(
                            (active.data.slides || []).map(s => `[${s.numero}] ${s.texto}`).join('\n\n'),
                            `slides-${active.key}`
                          )} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors">
                            {carCopied === `slides-${active.key}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar tudo</>}
                          </button>
                        </div>
                        <div className="px-4 pb-3 space-y-0">
                          {(active.data.slides || []).map((slide, idx) => (
                            <div key={slide.numero} className="relative flex gap-3 group py-2">
                              {/* linha conectora */}
                              {idx < (active.data.slides?.length ?? 0) - 1 && (
                                <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-100" />
                              )}
                              <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5 z-10">
                                <span className="text-[10px] font-bold text-orange-500">{slide.numero}</span>
                              </div>
                              <p className="flex-1 text-sm text-gray-800 leading-relaxed pt-0.5 select-text" onMouseUp={handleTextSelectionForBan}>{slide.texto}</p>
                              <button onClick={() => handleCarCopy(slide.texto, `slide-${active.key}-${slide.numero}`)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0 mt-1">
                                {carCopied === `slide-${active.key}-${slide.numero}` ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Exercício Prático + Pergunta Final agrupados */}
              {((!isPessoal && carResult.exercicio_pratico) || (() => {
                const active = [
                  carResult.versao_principal,
                  carResult.variacao_emocional,
                  carResult.variacao_provocativa,
                ].find((_, i) => ['principal','emocional','provocativa'][i] === carActiveVersion) || carResult.versao_principal
                return active?.pergunta_final
              })()) && (
                <div className="rounded-2xl border border-orange-100 overflow-hidden bg-white">
                  {!isPessoal && carResult.exercicio_pratico && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Target size={11} className="text-orange-500" />
                          <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Exercício Prático</span>
                        </div>
                        <button onClick={() => handleCarCopy(carResult.exercicio_pratico, 'car-exercicio')}
                          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors">
                          {carCopied === 'car-exercicio' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{carResult.exercicio_pratico}</p>
                    </div>
                  )}

                  {/* Pergunta Final — abaixo do exercício */}
                  {(() => {
                    const versions = { principal: carResult.versao_principal, emocional: carResult.variacao_emocional, provocativa: carResult.variacao_provocativa }
                    const pergunta = versions[carActiveVersion]?.pergunta_final || carResult.versao_principal?.pergunta_final
                    if (!pergunta) return null
                    return (
                      <div className="border-t border-orange-100 bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-white/70 uppercase flex items-center gap-1.5">
                            <Quote size={10} /> Pergunta Final
                          </span>
                          <button onClick={() => handleCarCopy(pergunta, `pergunta-${carActiveVersion}`)}
                            className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-all">
                            {carCopied === `pergunta-${carActiveVersion}` ? <Check size={10} /> : <Copy size={10} />}
                          </button>
                        </div>
                        <p className="text-sm font-bold text-white leading-snug">{pergunta}</p>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* CTA Fechado — só exibe se não repetir a pergunta final da versão ativa */}
              {!isPessoal && carResult.cta_fechado && !isNearDuplicateText(
                carResult.cta_fechado,
                (carResult.versao_principal && carActiveVersion === 'principal' && carResult.versao_principal.pergunta_final)
                  || (carResult.variacao_emocional && carActiveVersion === 'emocional' && carResult.variacao_emocional.pergunta_final)
                  || (carResult.variacao_provocativa && carActiveVersion === 'provocativa' && carResult.variacao_provocativa.pergunta_final)
                  || carResult.versao_principal?.pergunta_final
              ) && (
                <div className="relative overflow-hidden rounded-2xl bg-gray-900 px-4 py-3 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-white/50 uppercase flex items-center gap-1.5">
                      <ToggleLeft size={10} /> CTA Fechado
                    </span>
                    <button onClick={() => handleCarCopy(carResult.cta_fechado, 'car-cta')}
                      className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all">
                      {carCopied === 'car-cta' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                  <p className="text-sm font-bold leading-snug">{carResult.cta_fechado}</p>
                </div>
              )}

              {/* Legenda + Comentários agrupados */}
              {(() => {
                const cleanLegenda = getCleanLegenda(carResult.legenda, carResult.exercicio_pratico)
                return (cleanLegenda || (carResult.comentarios || []).length > 0) && (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {cleanLegenda && (
                    <div className="px-4 py-3 flex items-start justify-between gap-3 group">
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Legenda</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{cleanLegenda}</p>
                      </div>
                      <button onClick={() => handleCarCopy(cleanLegenda, 'car-legenda')}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0 mt-5">
                        {carCopied === 'car-legenda' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                  {(carResult.comentarios || []).length > 0 && (
                    <div className="px-4 py-3 space-y-2.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageCircle size={10} className="text-orange-400" /> Respostas sugeridas
                      </span>
                      {carResult.comentarios.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs text-gray-400 italic pl-1">"{item.comentario}"</p>
                          <div className="flex items-start gap-2 group/resp">
                            <div className="w-1 rounded-full bg-orange-200 self-stretch shrink-0 mt-0.5" />
                            <p className="flex-1 text-xs text-gray-700 leading-relaxed">{item.resposta}</p>
                            <button onClick={() => handleCarCopy(item.resposta, `comentario-${i}`)}
                              className="opacity-0 group-hover/resp:opacity-100 text-gray-300 hover:text-orange-500 transition-all shrink-0">
                              {carCopied === `comentario-${i}` ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )
              })()}

              {/* Validação — pills inline */}
              {carResult.validacao && (
                <div className="flex items-center gap-2 flex-wrap px-1">
                  <ShieldCheck size={11} className="text-gray-300 shrink-0" />
                  {[
                    { key: 'deixa_espaco',         label: 'Deixa espaço' },
                    { key: 'nao_parece_coach',      label: 'Não é coach' },
                    { key: 'so_karen_diria',        label: 'Só Karen diria' },
                    { key: 'perguntas_diferentes',  label: 'Perguntas distintas' },
                  ].map(({ key, label }) => {
                    const ok = carResult.validacao?.[key] === true
                    return (
                      <span key={key} className={clsx(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      )}>
                        {ok ? '✓' : '✗'} {label}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleCarSaveHub}
                  disabled={carSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    carSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                  )}
                >
                  {carSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {carSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-200 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateCarousel}
                  disabled={carLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={carLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulário de Stories ── */}
      {mode === 'stories' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
                <Film size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Protocolo de Stories</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isPessoal ? 'Observação real — a vida fora do trabalho, sem performar.' : 'Observação real — ponto de entrada da empreendedora, conexão com o corporativo.'}
                </p>
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                Tema <span className="text-red-400">*</span>
              </label>
              <input
                value={strTema}
                onChange={e => setStrTema(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateStories()}
                placeholder={isPessoal ? 'Ex: passeio com a Naomi, jogo de búzios, achado que virou queridinho...' : 'Ex: ansiedade de domingo, reunião que podia ser e-mail, medo de pedir aumento...'}
                className="input text-sm w-full"
                autoFocus
              />
            </div>

            {/* Estrutura */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Estrutura <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES).map(([key, s]) => (
                  <button
                    key={key}
                    onClick={() => setStrEstrutura(key)}
                    className={clsx(
                      'text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all',
                      strEstrutura === key
                        ? 'bg-teal-50 border-teal-400 text-teal-800'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <BannedWordsBox bannedWords={bannedWords} onAdd={addBannedWord} onRemove={removeBannedWord} />

            {strError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{strError}</div>
            )}

            <button onClick={generateStories} disabled={strLoading || !strTema.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-200 disabled:opacity-40 disabled:cursor-not-allowed">
              {strLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando roteiro...</> : <><Film size={15} /> Gerar Stories</>}
            </button>
          </div>

          {/* ── Output de Stories ── */}
          {strResult && (
            <div className="space-y-4 animate-fade-in">

              {/* Varredura anti-clichê */}
              {strSweepReport?.fixed > 0 && !strSweepReport.remaining.length && (
                <p className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> {strSweepReport.fixed} clichê{strSweepReport.fixed > 1 ? 's' : ''} corrigido{strSweepReport.fixed > 1 ? 's' : ''} na varredura
                </p>
              )}
              <SweepReportPanel report={strSweepReport} onBan={addBannedWord} bannedWords={bannedWords} />
              <CoherenceChecker text={strResult} posicionamento={posicionamento} />

              {/* Texto gerado */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">
                      Stories — {(isPessoal ? PERSONAL_STORIES_STRUCTURES : STORIES_STRUCTURES)[strEstrutura]?.label}
                    </span>
                  </div>
                  <button onClick={handleStrCopy}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-teal-600 transition-colors">
                    {strCopied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                  </button>
                </div>
                <div
                  className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed select-text"
                  onMouseUp={handleTextSelectionForBan}
                >
                  {strResult}
                </div>
              </div>

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleStrSaveHub}
                  disabled={strSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    strSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                  )}
                >
                  {strSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {strSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-teal-600 hover:border-teal-200 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateStories}
                  disabled={strLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={strLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulário: IA no Negócio ── */}
      {mode === 'ia_negocio' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-gray-800 flex items-center justify-center shrink-0">
                <Building2 size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Como eu aplicaria IA na minha empresa</p>
                <p className="text-xs text-gray-400 mt-0.5">Roteiro de Reels com aplicações reais de IA na operação de um negócio — não é lista de ferramentas</p>
              </div>
            </div>

            {/* Tipo de negócio */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                Tipo de negócio <span className="text-red-400">*</span>
              </label>
              <input
                value={ianTipoNegocio}
                onChange={e => setIanTipoNegocio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generateIANegocio()}
                placeholder="Ex: salão de beleza, clínica odontológica, floricultura, advogada..."
                className="input text-sm w-full"
                autoFocus
              />
            </div>

            {/* Campos opcionais — se vazios, a IA identifica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Tarefa repetitiva <span className="text-gray-300">(opcional — IA identifica)</span>
                </label>
                <textarea
                  value={ianTarefa}
                  onChange={e => setIanTarefa(e.target.value)}
                  rows={2}
                  placeholder="Ex: responder as mesmas perguntas no WhatsApp"
                  className="input text-sm w-full resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Perda operacional <span className="text-gray-300">(opcional — IA identifica)</span>
                </label>
                <textarea
                  value={ianPerda}
                  onChange={e => setIanPerda(e.target.value)}
                  rows={2}
                  placeholder="Ex: tempo da equipe, horário vago, cliente que some"
                  className="input text-sm w-full resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Ferramentas que já usa <span className="text-gray-300">(opcional — IA sugere)</span>
                </label>
                <input
                  value={ianFerramentas}
                  onChange={e => setIanFerramentas(e.target.value)}
                  placeholder="Ex: WhatsApp Business, Google Agenda"
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Objetivo da automação <span className="text-gray-300">(opcional — IA identifica)</span>
                </label>
                <input
                  value={ianObjetivo}
                  onChange={e => setIanObjetivo(e.target.value)}
                  placeholder="Ex: reduzir tempo de resposta"
                  className="input text-sm w-full"
                />
              </div>
            </div>

            <BannedWordsBox bannedWords={bannedWords} onAdd={addBannedWord} onRemove={removeBannedWord} />

            {ianError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{ianError}</div>
            )}

            <button
              onClick={generateIANegocio}
              disabled={ianLoading || !ianTipoNegocio.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-slate-700 to-gray-900 text-white rounded-xl hover:from-slate-800 hover:to-black transition-all shadow-lg shadow-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ianLoading ? <><Loader2 size={15} className="animate-spin" /> Gerando roteiro...</> : <><Building2 size={15} /> Gerar Roteiro</>}
            </button>
          </div>

          {/* ── Output: IA no Negócio ── */}
          {ianResult && (
            <div className="space-y-4 animate-fade-in">

              {ianSweepReport?.fixed > 0 && !ianSweepReport.remaining.length && (
                <p className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> {ianSweepReport.fixed} clichê{ianSweepReport.fixed > 1 ? 's' : ''} corrigido{ianSweepReport.fixed > 1 ? 's' : ''} na varredura
                </p>
              )}
              <SweepReportPanel report={ianSweepReport} onBan={addBannedWord} bannedWords={bannedWords} />

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">{ianResult.titulo || 'Roteiro'}</span>
                  </div>
                  <button onClick={handleIanCopy}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-slate-700 transition-colors">
                    {ianCopied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                  </button>
                </div>
                <div
                  className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed select-text"
                  onMouseUp={handleTextSelectionForBan}
                >
                  {ianResult.roteiro}
                </div>
                {(ianResult.ferramentas_mencionadas?.length > 0 || ianResult.duracao_estimada_segundos) && (
                  <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4">
                    {ianResult.duracao_estimada_segundos && (
                      <span className="chip border text-[9px] bg-gray-100 text-gray-600 border-gray-200">~{ianResult.duracao_estimada_segundos}s</span>
                    )}
                    {(ianResult.ferramentas_mencionadas || []).map((f) => (
                      <span key={f} className="chip border text-[9px] bg-slate-100 text-slate-700 border-slate-200">{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {ianResult.nota_privacidade && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{ianResult.nota_privacidade}</p>
                </div>
              )}

              {/* Salvar + Regenerar */}
              <div className="flex gap-2">
                <button
                  onClick={handleIanSaveHub}
                  disabled={ianSavedHub}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border transition-all',
                    ianSavedHub
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {ianSavedHub
                    ? <><Check size={13} /> Salvo no Hub</>
                    : <><Save size={13} /> Salvar no Hub de Ideias</>
                  }
                </button>
                {ianSavedHub && (
                  <button
                    onClick={() => navigate('/ideas')}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-500 hover:text-slate-700 hover:border-slate-300 rounded-xl transition-all"
                  >
                    <ExternalLink size={12} /> Abrir Hub
                  </button>
                )}
                <button
                  onClick={generateIANegocio}
                  disabled={ianLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={ianLoading ? 'animate-spin' : ''} /> Regenerar
                </button>
              </div>
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

Ex: 'POV do cliente pedindo só um ajustinho na sexta 18h'
Ex: 'O que dá pra resolver do negócio pelo celular antes das 9h'
Ex: 'Qual promessa de ferramenta de IA não se paga em negócio pequeno'"
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

        <BannedWordsBox bannedWords={bannedWords} onAdd={addBannedWord} onRemove={removeBannedWord} />

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
            {sweepReport && sweepReport.fixed > 0 && sweepReport.remaining.length === 0 && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                title="A varredura anti-clichê corrigiu o texto antes de mostrar"
              >
                <ShieldCheck size={10} /> {sweepReport.fixed} clichê{sweepReport.fixed > 1 ? 's' : ''} corrigido{sweepReport.fixed > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Varredura anti-clichê: o que sobrou depois das reescritas */}
          <SweepReportPanel report={sweepReport} onBan={addBannedWord} bannedWords={bannedWords} />
          <CoherenceChecker text={result.content} posicionamento={posicionamento} />

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
              onMouseUp={handleTextSelectionForBan}
            >
              {result.content}
            </div>
          </div>

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

      {/* Popup de banir palavra — compartilhado por todas as abas. Qualquer
          bloco de texto gerado com o handler de seleção abre este popup,
          independente do modo ativo (é position: fixed). */}
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

    </div>
  )
}
