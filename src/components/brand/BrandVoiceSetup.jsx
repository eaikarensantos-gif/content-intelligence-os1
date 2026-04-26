import { useState } from 'react'
import { ChevronRight, ChevronLeft, Sparkles, Check, RotateCcw, Loader2, Eye, Copy, Zap } from 'lucide-react'
import useStore from '../../store/useStore'

const LS_KEY = 'cio-anthropic-key'

/* ── Questionário ──────────────────────────────────────────── */
const STEPS = [
  {
    id: 'identity',
    title: 'Quem é você?',
    subtitle: 'Como você se define profissionalmente',
    question: 'Como você se apresenta para alguém novo?',
    multi: false,
    options: [
      { id: 'mentor', label: 'Mentora / Consultora', desc: 'Ajudo pessoas a evoluírem na carreira' },
      { id: 'creator', label: 'Criadora de conteúdo', desc: 'Compartilho conhecimento nas redes' },
      { id: 'specialist', label: 'Especialista técnica', desc: 'Domino um tema e ensino com profundidade' },
      { id: 'entrepreneur', label: 'Empreendedora', desc: 'Construo negócios e compartilho a jornada' },
      { id: 'leader', label: 'Líder / Gestora', desc: 'Falo sobre liderança e gestão de pessoas' },
      { id: 'hybrid', label: 'Híbrida / Multipotencial', desc: 'Transito entre vários mundos' },
    ],
  },
  {
    id: 'pillars',
    title: 'Pilares de conteúdo',
    subtitle: 'Escolha de 3 a 5 temas que você sempre volta',
    question: 'Quais são seus pilares?',
    multi: true,
    min: 3,
    max: 5,
    options: [
      { id: 'career', label: 'Carreira & Transição', desc: 'Promoção, mudança, crescimento' },
      { id: 'productivity', label: 'Produtividade & Foco', desc: 'Gestão de tempo, energia, prioridades' },
      { id: 'personal_brand', label: 'Marca Pessoal', desc: 'Posicionamento, visibilidade, autoridade' },
      { id: 'leadership', label: 'Liderança & Gestão', desc: 'Liderar pessoas e projetos' },
      { id: 'tech_ai', label: 'Tecnologia & IA', desc: 'Ferramentas, automação, inovação' },
      { id: 'entrepreneurship', label: 'Empreendedorismo', desc: 'Negócios, monetização, estratégia' },
      { id: 'self_knowledge', label: 'Autoconhecimento', desc: 'Inteligência emocional, propósito' },
      { id: 'communication', label: 'Comunicação', desc: 'Escrita, oratória, storytelling' },
      { id: 'finance', label: 'Finanças Pessoais', desc: 'Dinheiro, investimentos, liberdade' },
      { id: 'wellbeing', label: 'Bem-estar & Equilíbrio', desc: 'Saúde mental, rotina, energia' },
      { id: 'education', label: 'Educação & Aprendizado', desc: 'Cursos, livros, mentorias' },
      { id: 'diversity', label: 'Diversidade & Inclusão', desc: 'Representatividade, equidade' },
    ],
  },
  {
    id: 'anti_voice',
    title: 'Como você NÃO quer soar?',
    subtitle: 'Marque tudo que te dá cringe',
    question: 'O que você evita no seu conteúdo?',
    multi: true,
    min: 1,
    max: 99,
    options: [
      { id: 'guru', label: 'Guru motivacional', desc: '"Acredite no seu potencial ilimitado!"' },
      { id: 'coach_generico', label: 'Coach genérico', desc: '"Saia da zona de conforto!"' },
      { id: 'academic', label: 'Acadêmico distante', desc: 'Linguagem rebuscada que ninguém entende' },
      { id: 'aggressive_sales', label: 'Vendedor agressivo', desc: '"Últimas vagas! Não perca!"' },
      { id: 'fake_humble', label: 'Falsa humildade', desc: '"Eu que não sou ninguém..."' },
      { id: 'corporate_robot', label: 'Corporativês', desc: '"Sinergia de stakeholders..."' },
      { id: 'influencer_vazio', label: 'Influencer vazio', desc: 'Conteúdo raso só pra engajamento' },
      { id: 'vitimismo', label: 'Vitimismo / reclamação', desc: 'Foco no problema, nunca na solução' },
    ],
  },
  {
    id: 'conversation',
    title: 'Se seu conteúdo fosse uma conversa...',
    subtitle: 'Escolha a que mais combina com você',
    question: 'Seria com quem?',
    multi: false,
    options: [
      { id: 'cafe_friend', label: 'Amiga no café', desc: 'Intimidade, leveza, vulnerabilidade' },
      { id: 'mentor_1on1', label: 'Mentora em 1:1', desc: 'Direcionamento, escuta, provocação' },
      { id: 'stage_speaker', label: 'Palestrante no palco', desc: 'Impacto, energia, inspiração' },
      { id: 'wise_colleague', label: 'Colega sábia no trabalho', desc: 'Prática, confiança, experiência real' },
      { id: 'journal', label: 'Diário aberto', desc: 'Reflexão pessoal compartilhada' },
      { id: 'provocateur', label: 'Provocadora intelectual', desc: 'Questiona o óbvio, incomoda com razão' },
    ],
  },
  {
    id: 'tone',
    title: 'Tom principal',
    subtitle: 'Escolha até 2 tons dominantes',
    question: 'Como você quer ser percebida?',
    multi: true,
    min: 1,
    max: 2,
    options: [
      { id: 'authoritative', label: 'Autoridade com empatia', desc: 'Sabe do que fala, mas acolhe' },
      { id: 'provocative', label: 'Provocativa com elegância', desc: 'Incomoda, mas com classe' },
      { id: 'inspiring', label: 'Inspiradora com substância', desc: 'Motiva com fatos, não com frases feitas' },
      { id: 'honest', label: 'Honesta e direta', desc: 'Fala a real sem rodeios' },
      { id: 'playful', label: 'Leve e espirituosa', desc: 'Humor inteligente, sem forçar' },
      { id: 'reflective', label: 'Reflexiva e introspectiva', desc: 'Convida à pausa e ao pensar' },
    ],
  },
  {
    id: 'opening',
    title: 'Como você abre conteúdos?',
    subtitle: 'Escolha até 3 aberturas que usa ou usaria',
    question: 'Seus estilos de abertura preferidos:',
    multi: true,
    min: 1,
    max: 3,
    options: [
      { id: 'provocation', label: 'Provocação', desc: '"Ninguém te contou isso sobre..."' },
      { id: 'story', label: 'Mini-história pessoal', desc: '"Semana passada aconteceu algo..."' },
      { id: 'question', label: 'Pergunta direta', desc: '"Você já parou pra pensar...?"' },
      { id: 'data', label: 'Dado ou estatística', desc: '"87% dos profissionais..."' },
      { id: 'statement', label: 'Afirmação forte', desc: '"Produtividade não é sobre fazer mais."' },
      { id: 'myth', label: 'Mito ou crença popular', desc: '"Todo mundo acha que... mas..."' },
      { id: 'metaphor', label: 'Metáfora / analogia', desc: '"Sua carreira é como um jardim..."' },
      { id: 'confession', label: 'Confissão / vulnerabilidade', desc: '"Eu errei feio nisso..."' },
    ],
  },
  {
    id: 'closing',
    title: 'Como você fecha conteúdos?',
    subtitle: 'Escolha até 2 fechamentos preferidos',
    question: 'Seus estilos de fechamento:',
    multi: true,
    min: 1,
    max: 2,
    options: [
      { id: 'impact_phrase', label: 'Frase de impacto', desc: 'Uma linha que fica na cabeça' },
      { id: 'open_reflection', label: 'Reflexão aberta', desc: 'Deixa a pergunta no ar' },
      { id: 'direct_cta', label: 'CTA direto', desc: '"Salva esse post / Comenta aqui"' },
      { id: 'summary', label: 'Resumo prático', desc: 'Recapitula os pontos principais' },
      { id: 'challenge', label: 'Desafio ao leitor', desc: '"Tenta isso essa semana e me conta"' },
      { id: 'personal_note', label: 'Nota pessoal', desc: 'Fecha com algo íntimo e verdadeiro' },
    ],
  },
  {
    id: 'structure',
    title: 'Estrutura preferida',
    subtitle: 'Como você organiza o conteúdo',
    question: 'Seu estilo de estrutura:',
    multi: false,
    options: [
      { id: 'short_direct', label: 'Curto e direto', desc: 'Frases curtas, parágrafos de 1-2 linhas' },
      { id: 'frameworks', label: 'Frameworks e listas', desc: 'Bullet points, passos numerados, métodos' },
      { id: 'narrative', label: 'Narrativo / storytelling', desc: 'Fluxo de história com começo, meio e fim' },
      { id: 'mixed', label: 'Misto', desc: 'Alterna entre narrativa e listas conforme o tema' },
    ],
  },
  {
    id: 'forbidden',
    title: 'Palavras proibidas',
    subtitle: 'Expressões que NUNCA devem aparecer no seu conteúdo',
    question: 'O que é proibido?',
    multi: true,
    min: 1,
    max: 99,
    options: [
      { id: 'escale', label: '"Escale seu negócio"', desc: 'Jargão de marketing digital' },
      { id: '6em7', label: '"6 em 7" / "7 dígitos"', desc: 'Promessas de faturamento' },
      { id: 'mindset', label: '"Mindset de abundância"', desc: 'Espiritualidade corporativa' },
      { id: 'hack', label: '"Hack" / "Segredo"', desc: 'Clickbait barato' },
      { id: 'saia_zona', label: '"Saia da zona de conforto"', desc: 'Clichê motivacional' },
      { id: 'monetize', label: '"Monetize sua paixão"', desc: 'Simplificação perigosa' },
      { id: 'boss_babe', label: '"Girl boss" / "Boss babe"', desc: 'Empoderamento superficial' },
      { id: 'desbloqueie', label: '"Desbloqueie seu potencial"', desc: 'Coaching genérico' },
      { id: 'sobre', label: '"Sobre"', desc: 'Palavra genérica e vaga como abertura' },
      { id: 'presenca', label: '"Presença"', desc: 'Termo abstrato e esvaziado' },
      { id: 'clareza', label: '"Clareza"', desc: 'Buzzword que não diz nada concreto' },
      { id: 'none', label: 'Nenhuma dessas me incomoda', desc: 'Tudo liberado' },
    ],
  },
  {
    id: 'references',
    title: 'Referências de estilo',
    subtitle: 'Criadores cujo estilo você admira (não precisa ser do mesmo nicho)',
    question: 'Quem te inspira?',
    multi: true,
    min: 1,
    max: 3,
    options: [
      { id: 'brene_brown', label: 'Brené Brown', desc: 'Vulnerabilidade + pesquisa' },
      { id: 'simon_sinek', label: 'Simon Sinek', desc: 'Propósito + clareza' },
      { id: 'mel_robbins', label: 'Mel Robbins', desc: 'Prática + energia' },
      { id: 'james_clear', label: 'James Clear', desc: 'Hábitos + objetividade' },
      { id: 'nath_arcuri', label: 'Nath Arcuri', desc: 'Didática + leveza' },
      { id: 'joel_jota', label: 'Joel Jota', desc: 'Alta performance + história pessoal' },
      { id: 'isa_meirelles', label: 'Isa Meirelles', desc: 'Carreira + autenticidade' },
      { id: 'leda_nagle', label: 'Leda Nagle', desc: 'Entrevista + profundidade' },
      { id: 'gary_vee', label: 'GaryVee', desc: 'Intensidade + ação' },
      { id: 'ali_abdaal', label: 'Ali Abdaal', desc: 'Produtividade + clareza visual' },
      { id: 'other', label: 'Outro (vou especificar depois)', desc: 'Tenho referências diferentes' },
    ],
  },
]

/* ── Gerar Master Prompt ──────────────────────────────────── */
function buildMasterPrompt(answers) {
  const identity = STEPS[0].options.find(o => o.id === answers.identity)
  const pillars = STEPS[1].options.filter(o => (answers.pillars || []).includes(o.id))
  const antiVoice = STEPS[2].options.filter(o => (answers.anti_voice || []).includes(o.id))
  const conversation = STEPS[3].options.find(o => o.id === answers.conversation)
  const tones = STEPS[4].options.filter(o => (answers.tone || []).includes(o.id))
  const openings = STEPS[5].options.filter(o => (answers.opening || []).includes(o.id))
  const closings = STEPS[6].options.filter(o => (answers.closing || []).includes(o.id))
  const structure = STEPS[7].options.find(o => o.id === answers.structure)
  const forbidden = STEPS[8].options.filter(o => (answers.forbidden || []).includes(o.id))
  const references = STEPS[9].options.filter(o => (answers.references || []).includes(o.id))

  return {
    answers,
    generatedAt: new Date().toISOString(),
    prompt: `
IDENTIDADE DO CRIADOR:
- Perfil: ${identity?.label || 'Não definido'} — ${identity?.desc || ''}
- Pilares de conteúdo: ${pillars.map(p => p.label).join(', ')}

TOM E VOZ:
- Tom principal: ${tones.map(t => t.label).join(' + ')}
- Conversa como: ${conversation?.label || ''} — ${conversation?.desc || ''}
- NUNCA soar como: ${antiVoice.map(a => a.label).join(', ')}

ESTRUTURA DE CONTEÚDO:
- Formato preferido: ${structure?.label || ''} — ${structure?.desc || ''}
- Aberturas que usa: ${openings.map(o => `${o.label} (${o.desc})`).join('; ')}
- Fechamentos que usa: ${closings.map(c => `${c.label} (${c.desc})`).join('; ')}

VOCABULÁRIO PROIBIDO:
${forbidden.filter(f => f.id !== 'none').map(f => `- NUNCA usar: ${f.label}`).join('\n')}

REFERÊNCIAS DE ESTILO:
${references.map(r => `- ${r.label}: ${r.desc}`).join('\n')}

REGRAS FUNDAMENTAIS:
1. Cada conteúdo deve ser 100% fiel ao TEMA pedido. NUNCA misturar temas dos pilares quando o tema é específico.
2. Variar SEMPRE as aberturas — nunca repetir o mesmo padrão em conteúdos consecutivos.
3. Informações devem ser REAIS e verificáveis. Se for sobre um livro, usar dados reais do livro.
4. O tom deve ser consistente mas as estruturas devem variar para manter o conteúdo fresco.
5. Priorizar profundidade sobre quantidade. Menos slides com mais valor > mais slides rasos.
6. Linguagem sempre em português brasileiro natural, sem tradução literal do inglês.
`.trim(),
  }
}

/* ── Calibrador de Voz com Exemplos Reais ── */
function VoiceCalibrator() {
  const setBrandVoice = useStore(s => s.setBrandVoice)
  const brandVoice = useStore(s => s.brandVoice)
  const [examples, setExamples] = useState(['', '', ''])
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(brandVoice?.calibration || null)
  const [error, setError] = useState(null)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  const handleAnalyze = async () => {
    const filled = examples.filter(e => e.trim().length > 20)
    if (filled.length < 2) { setError('Cole pelo menos 2 posts completos'); return }
    if (!apiKey) { setError('Configure sua API key em Analytics'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: `Analise estes posts reais de um criador de conteúdo e extraia padrões de voz:

POST 1:
"""${examples[0]}"""

POST 2:
"""${examples[1]}"""

${examples[2]?.trim() ? `POST 3:\n"""${examples[2]}"""` : ''}

Analise e retorne EXCLUSIVAMENTE JSON:
{
  "abertura_padrao": "como o criador tipicamente começa (padrão identificado)",
  "estrutura_narrativa": "como organiza o conteúdo (começo, meio, fim)",
  "tom_linguistico": "tom predominante e variações",
  "elementos_transversais": ["elemento 1", "elemento 2", "elemento 3"],
  "palavras_frequentes": ["palavra1", "palavra2", "palavra3"],
  "padrao_cta": "como tipicamente fecha/engaja",
  "ponto_forte": "o que mais se destaca no conteúdo",
  "sugestao_melhoria": "uma sugestão estratégica para evolução"
}` }],
        }),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)

      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida')

      const parsed = JSON.parse(jsonMatch[0])
      setAnalysis(parsed)

      // Salvar calibração no brandVoice
      if (brandVoice) {
        setBrandVoice({ ...brandVoice, calibration: parsed })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-orange-500" />
        <div>
          <h3 className="text-sm font-bold text-gray-900">Calibrar com Exemplos Reais</h3>
          <p className="text-xs text-gray-400">Cole seus melhores posts para a IA detectar seus padrões de voz</p>
        </div>
      </div>

      <div className="space-y-3">
        {examples.map((ex, i) => (
          <div key={i}>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Post {i + 1} {i < 2 ? '*' : '(opcional)'}
            </label>
            <textarea
              value={ex}
              onChange={e => { const n = [...examples]; n[i] = e.target.value; setExamples(n) }}
              rows={3}
              placeholder="Cole aqui um post real que representa bem sua voz..."
              className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:border-orange-300 resize-none placeholder:text-gray-300"
            />
          </div>
        ))}
      </div>

      <button onClick={handleAnalyze} disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-40">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Analisando...</> : <><Zap size={14} /> Analisar Padrões de Voz</>}
      </button>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 border border-red-200">{error}</p>}

      {analysis && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4 space-y-3">
          <p className="text-xs font-bold text-orange-700 uppercase">Padrões Detectados</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-orange-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Padrão de Abertura</p>
              <p className="text-xs text-gray-700">{analysis.abertura_padrao}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-orange-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Estrutura Narrativa</p>
              <p className="text-xs text-gray-700">{analysis.estrutura_narrativa}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-orange-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Tom Linguístico</p>
              <p className="text-xs text-gray-700">{analysis.tom_linguistico}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-orange-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">CTA / Fechamento</p>
              <p className="text-xs text-gray-700">{analysis.padrao_cta}</p>
            </div>
          </div>

          {analysis.elementos_transversais?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-gray-400 mr-1">Elementos:</span>
              {analysis.elementos_transversais.map((el, i) => (
                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200">{el}</span>
              ))}
            </div>
          )}

          {analysis.palavras_frequentes?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-gray-400 mr-1">Palavras-chave:</span>
              {analysis.palavras_frequentes.map((w, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white text-gray-600 border border-gray-200">{w}</span>
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg p-3 border border-orange-100">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">Ponto Forte</p>
            <p className="text-xs text-gray-700">{analysis.ponto_forte}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <p className="text-[10px] font-semibold text-amber-600 uppercase mb-1">Sugestão de Evolução</p>
            <p className="text-xs text-gray-700">{analysis.sugestao_melhoria}</p>
          </div>

          <p className="text-[10px] text-gray-400 italic">Estes padrões são usados automaticamente em todas as gerações de conteúdo.</p>
        </div>
      )}
    </div>
  )
}

/* ── Componente Principal ─────────────────────────────────── */
export default function BrandVoiceSetup() {
  const brandVoice = useStore(s => s.brandVoice)
  const setBrandVoice = useStore(s => s.setBrandVoice)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(brandVoice?.answers || {})
  const [done, setDone] = useState(!!brandVoice)
  const [showPrompt, setShowPrompt] = useState(false)

  const current = STEPS[step]
  const selected = current.multi
    ? (answers[current.id] || [])
    : answers[current.id]

  const canAdvance = current.multi
    ? (answers[current.id] || []).length >= (current.min || 1)
    : !!answers[current.id]

  function handleSelect(optionId) {
    if (current.multi) {
      const arr = answers[current.id] || []
      if (arr.includes(optionId)) {
        setAnswers({ ...answers, [current.id]: arr.filter(x => x !== optionId) })
      } else if (!current.max || arr.length < current.max) {
        setAnswers({ ...answers, [current.id]: [...arr, optionId] })
      }
    } else {
      setAnswers({ ...answers, [current.id]: optionId })
    }
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      const result = buildMasterPrompt(answers)
      setBrandVoice(result)
      setDone(true)
    }
  }

  function handleReset() {
    setAnswers({})
    setStep(0)
    setDone(false)
    setBrandVoice(null)
  }

  /* ── Tela de resultado ── */
  if (done && brandVoice) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-orange-500" size={24} />
                Master Prompt Ativo
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Alimentando todos os geradores de conteúdo
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors"
            >
              <RotateCcw size={14} />
              Refazer
            </button>
          </div>

          {/* Resumo visual */}
          <div className="space-y-4 mb-6">
            {STEPS.map(s => {
              const val = brandVoice.answers[s.id]
              if (!val) return null
              const labels = s.multi
                ? s.options.filter(o => val.includes(o.id)).map(o => o.label)
                : [s.options.find(o => o.id === val)?.label]
              return (
                <div key={s.id} className="flex items-start gap-3">
                  <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">{s.title}:</span>
                    <span className="text-sm text-gray-600 ml-2">{labels.filter(Boolean).join(', ')}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Toggle prompt */}
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium mb-3"
          >
            {showPrompt ? 'Esconder' : 'Ver'} Master Prompt completo
          </button>

          {showPrompt && (
            <pre className="bg-white rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap border border-orange-100 max-h-96 overflow-y-auto">
              {brandVoice.prompt}
            </pre>
          )}

          <div className="mt-6 p-4 bg-white/60 rounded-xl border border-orange-100">
            <p className="text-sm text-gray-600">
              <strong className="text-gray-800">Onde isso é usado:</strong> Carousel Studio, Thought Capture,
              Gerador de Ideias, Legendas com IA e CTAs. Todos os geradores agora seguem sua voz.
            </p>
          </div>
        </div>

        {/* ── Análise de Exemplos Reais ── */}
        <VoiceCalibrator />
      </div>
    )
  }

  /* ── Tela do questionário ── */
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            {step + 1} de {STEPS.length}
          </span>
          <span className="text-sm text-gray-400">
            {current.multi && current.max < 99
              ? `Escolha ${current.min}${current.max > current.min ? ` a ${current.max}` : ''}`
              : current.multi ? `Escolha pelo menos ${current.min || 1}` : 'Escolha uma'}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Pergunta */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{current.title}</h2>
        <p className="text-gray-500">{current.subtitle}</p>
      </div>

      {/* Opções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {current.options.map(opt => {
          const isSelected = current.multi
            ? (selected || []).includes(opt.id)
            : selected === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-orange-400 bg-orange-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-orange-400 bg-orange-400' : 'border-gray-300'
                }`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Voltar
        </button>

        <button
          onClick={handleNext}
          disabled={!canAdvance}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
            canAdvance
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {step === STEPS.length - 1 ? (
            <>
              <Sparkles size={16} />
              Gerar Master Prompt
            </>
          ) : (
            <>
              Próximo
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
