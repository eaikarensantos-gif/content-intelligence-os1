import { useState } from 'react'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw,
  BookOpen, Users, MessageCircle, ChevronDown, ChevronUp, AlertCircle, ExternalLink,
} from 'lucide-react'
import clsx from 'clsx'

const LS_KEY = 'cio-anthropic-key'

// ─── System prompt ────────────────────────────────────────────────────────────

const COMMUNITY_SYSTEM = `Você é especialista em gestão de comunidades profissionais e criação de conteúdo para comunidades fechadas no Brasil.

CONTEXTO DA COMUNIDADE:
- Nome: Contabilizei Mais
- Público: profissionais criativos (designers, redatores, diretores de arte, etc.) em transição de CLT para PJ
- Tamanho: 3.000 membros
- Temas centrais: precificação, contratos, propostas comerciais, gestão de clientes, refações, adaptação financeira como PJ
- Gestora: Karen Santos — designer sênior, 10+ anos, especialista em IA para negócios, mulher preta retinta, expressão séria, maturidade profissional real

TOM OBRIGATÓRIO:
- Técnico e direto. Sem linguagem de coach ou motivacional
- Proibido: "mindset", "propósito", "transformação", "jornada", "ecossistema" vago
- Sem travessões dramáticos. Sem frases curtas picotadas em sequência estilo coach
- Com vulnerabilidade real: admitir quando o raciocínio não está 100% fechado gera mais conexão do que texto perfeito
- Oralidade: escreva como quem manda um áudio para um par sênior
- Misture frases longas de explicação técnica com frases curtas de fechamento
- Não vende sonhos. Vende estrutura e tomada de decisão

REGRA DA FISSURA:
Se uma fissura (dúvida real, observação incompleta, raciocínio aberto) for fornecida, integre-a naturalmente no post. Não esconda. Não resolva artificialmente. O leitor precisa perceber que é um pensamento real, não conteúdo fabricado.

Responda EXCLUSIVAMENTE com JSON válido.`

// ─── Prompt builder ────────────────────────────────────────────────────────────

const SLOT_INSTRUCTIONS = {
  leitura: `TIPO DE POST: Conteúdo de leitura de alto valor.
O membro não precisa comentar ou reagir para se beneficiar. Quem salva, leu.
FORMATO: Observação técnica precisa + dado concreto ou sequência prática sobre o tema. 3 a 5 parágrafos. Linguagem direta.
SAVE HOOK: Uma frase de abertura do tipo "Salva esse post se você…" que justifica o save sem pedir comentário. Deve ser específica, não genérica.
CONCLUSÃO: Frase seca que resume o valor — não é CTA, é uma observação conclusiva.`,

  reacao: `TIPO DE POST: Engajamento de baixo atrito.
O membro participa sem escrever um texto livre — edita um template pronto.
FORMATO: Apresente uma situação profissional concreta com dois caminhos possíveis. Em seguida, ofereça um template editável com uma lacuna: "Use esse modelo: '[frase com espaço para adaptar]'". 2 a 3 parágrafos + template.
O template é o hook. Deve ser específico o suficiente para ter valor real, mas com uma lacuna clara que convida adaptação pessoal. Não use colchetes genéricos como [sua situação] — seja mais concreto.`,

  conversa: `TIPO DE POST: Conversa real.
Para membros que já participam. Convida relatos de experiência, não opiniões genéricas.
FORMATO: Karen relata em primeira pessoa uma situação que viveu ou observou no universo criativo CLT→PJ. Direto. No final, uma pergunta aberta específica que convida relatos similares — não "o que você acha?" mas algo como "Como você lidou com isso?" ou "O que você faria diferente?". 3 a 4 parágrafos.
A pergunta final é o hook. Deve ser concreta o suficiente para que a resposta exija uma experiência real, não uma opinião.`,
}

const buildPrompt = ({ slotId, weekTheme, fissura }) => `TEMA DA SEMANA: ${weekTheme?.trim() || 'profissional criativo em transição CLT→PJ'}
${fissura?.trim() ? `\nFISSURA (integre naturalmente no post): "${fissura.trim()}"` : ''}

${SLOT_INSTRUCTIONS[slotId]}

Responda com JSON:
{
  "hook": "o hook específico desse formato — save hook / template editável / pergunta final",
  "post": "texto completo do post em português, pronto para copiar e colar",
  "nota": "observação curta sobre por que esse post pode funcionar com essa audiência específica"
}`

// ─── Slots config ──────────────────────────────────────────────────────────────

const SLOTS = [
  {
    id: 'leitura',
    label: 'Leitura',
    sublabel: 'Alto valor, zero esforço de participação — para quem só observa',
    Icon: BookOpen,
    colors: {
      header: 'bg-slate-50 border-b border-slate-100',
      icon: 'text-slate-500',
      badge: 'bg-slate-800 text-white',
      hookBg: 'bg-slate-50 border-slate-200',
      btn: 'bg-slate-800 hover:bg-slate-900 text-white',
    },
  },
  {
    id: 'reacao',
    label: 'Reação',
    sublabel: 'Template editável — para quem participa esporadicamente',
    Icon: Users,
    colors: {
      header: 'bg-amber-50 border-b border-amber-100',
      icon: 'text-amber-500',
      badge: 'bg-amber-500 text-white',
      hookBg: 'bg-amber-50 border-amber-200',
      btn: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
  },
  {
    id: 'conversa',
    label: 'Conversa',
    sublabel: 'Caso real + pergunta — para quem já está presente',
    Icon: MessageCircle,
    colors: {
      header: 'bg-emerald-50 border-b border-emerald-100',
      icon: 'text-emerald-500',
      badge: 'bg-emerald-600 text-white',
      hookBg: 'bg-emerald-50 border-emerald-200',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CommunityStudio() {
  const [weekTheme, setWeekTheme] = useState('')
  const [fissuras, setFissuras] = useState({ leitura: '', reacao: '', conversa: '' })
  const [drafts, setDrafts]     = useState({ leitura: null, reacao: null, conversa: null })
  const [loading, setLoading]   = useState({ leitura: false, reacao: false, conversa: false })
  const [errors, setErrors]     = useState({ leitura: null, reacao: null, conversa: null })
  const [expanded, setExpanded] = useState({ leitura: true, reacao: true, conversa: true })
  const [copied, setCopied]     = useState(null)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const generate = async (slotId) => {
    if (!apiKey) {
      setErrors(e => ({ ...e, [slotId]: 'Configure sua API key em Configurações' }))
      return
    }
    setLoading(l => ({ ...l, [slotId]: true }))
    setErrors(e => ({ ...e, [slotId]: null }))
    setDrafts(d => ({ ...d, [slotId]: null }))

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
          max_tokens: 1500,
          system: COMMUNITY_SYSTEM,
          messages: [{ role: 'user', content: buildPrompt({ slotId, weekTheme, fissura: fissuras[slotId] }) }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const raw  = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da API')
      setDrafts(d => ({ ...d, [slotId]: JSON.parse(match[0]) }))
    } catch (err) {
      setErrors(e => ({ ...e, [slotId]: err.message }))
    } finally {
      setLoading(l => ({ ...l, [slotId]: false }))
    }
  }

  const generateAll = () => SLOTS.forEach(s => generate(s.id))

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0">
              🏘️
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Community Studio</h1>
              <p className="text-xs text-white/50">Contabilizei Mais · 3.000 membros</p>
            </div>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            3 posts por semana — um por camada de audiência. Define o tema, adiciona a fissura se quiser, gera e copia.
          </p>
          <a
            href="https://plataforma.contabilizeimais.com.br/m/community?tenantUuid=9e5df8c5-b632-4b5d-8787-5b8c9bcfebdd&channel=b7164b69-a785-44ab-aa01-f6371c6e8cfb"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg transition-all"
          >
            <ExternalLink size={11} />
            Abrir comunidade
          </a>
        </div>
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full translate-x-20 -translate-y-12 pointer-events-none" />
        <div className="absolute right-8 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 pointer-events-none" />
      </div>

      {/* Tema da semana */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Tema da semana
          </label>
          <input
            type="text"
            value={weekTheme}
            onChange={e => setWeekTheme(e.target.value)}
            placeholder="Ex: como precificar projetos de branding como PJ"
            className="input w-full text-sm"
          />
          <p className="text-[10px] text-gray-400 mt-1">Os 3 posts giram em torno desse tema, cada um calibrado para uma camada diferente da comunidade.</p>
        </div>

        <button
          onClick={generateAll}
          disabled={Object.values(loading).some(Boolean)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {Object.values(loading).some(Boolean)
            ? <><Loader2 size={14} className="animate-spin" /> Gerando os 3 posts...</>
            : <><Sparkles size={14} /> Gerar os 3 posts da semana</>
          }
        </button>
      </div>

      {/* Slots */}
      {SLOTS.map(({ id, label, sublabel, Icon, colors }) => {
        const draft     = drafts[id]
        const isLoading = loading[id]
        const error     = errors[id]
        const isOpen    = expanded[id]

        return (
          <div key={id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

            {/* Slot header */}
            <button
              onClick={() => setExpanded(e => ({ ...e, [id]: !e[id] }))}
              className={clsx('w-full flex items-center justify-between px-4 py-3 transition-colors hover:brightness-95', colors.header)}
            >
              <div className="flex items-center gap-3">
                <Icon size={15} className={colors.icon} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-[10px] text-gray-500">{sublabel}</p>
                </div>
              </div>
              {draft && (
                <span className={clsx('text-[9px] font-bold px-2 py-0.5 rounded-full mr-2', colors.badge)}>pronto</span>
              )}
              {isOpen
                ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
                : <ChevronDown size={15} className="text-gray-400 shrink-0" />
              }
            </button>

            {isOpen && (
              <div className="p-4 space-y-3">

                {/* Fissura */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <AlertCircle size={9} className="text-gray-400" />
                    Fissura
                    <span className="text-gray-300 normal-case font-normal">(opcional — a dúvida real ou raciocínio incompleto)</span>
                  </label>
                  <textarea
                    value={fissuras[id]}
                    onChange={e => setFissuras(f => ({ ...f, [id]: e.target.value }))}
                    rows={2}
                    placeholder="Ex: ainda não tenho certeza se isso funciona pra quem acabou de sair do CLT e ainda não tem cliente fixo..."
                    className="input w-full text-xs resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                {/* Gerar individualmente */}
                <button
                  onClick={() => generate(id)}
                  disabled={isLoading}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                    colors.btn
                  )}
                >
                  {isLoading
                    ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                    : <><Sparkles size={13} /> Gerar esse post</>
                  }
                </button>

                {/* Output */}
                {draft && (
                  <div className="space-y-3 animate-fade-in">

                    {/* Hook */}
                    {draft.hook && (
                      <div className={clsx('rounded-xl border p-3', colors.hookBg)}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Hook</p>
                          <button
                            onClick={() => handleCopy(draft.hook, `hook-${id}`)}
                            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            {copied === `hook-${id}` ? <><Check size={9} /> Copiado</> : <><Copy size={9} /> Copiar</>}
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{draft.hook}</p>
                      </div>
                    )}

                    {/* Post */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Post</p>
                        <button
                          onClick={() => handleCopy(draft.post, `post-${id}`)}
                          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {copied === `post-${id}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                        </button>
                      </div>
                      <div className="p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white">
                        {draft.post}
                      </div>
                    </div>

                    {/* Nota da IA */}
                    {draft.nota && (
                      <p className="text-[10px] text-gray-400 italic px-1 leading-relaxed">
                        {draft.nota}
                      </p>
                    )}

                    {/* Regenerar */}
                    <button
                      onClick={() => generate(id)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                      Regenerar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
