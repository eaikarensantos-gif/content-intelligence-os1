import { useState } from 'react'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw,
  BookOpen, Users, MessageCircle, ChevronDown, ChevronUp, AlertCircle, ExternalLink, BarChart2,
} from 'lucide-react'
import clsx from 'clsx'
import CommunityEngager from './CommunityEngager'
import CommunityResources from './CommunityResources'

const LS_KEY = 'cio-openai-key'

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
CONCLUSÃO: Frase seca que resume o valor — não é CTA, é uma observação conclusiva.
LIMITE OBRIGATÓRIO: o campo "post" deve ter no máximo 15 linhas no total.`,

  reacao: `TIPO DE POST: Engajamento de baixo atrito.
O membro participa sem escrever um texto livre — edita um template pronto.
FORMATO: Apresente uma situação profissional concreta com dois caminhos possíveis. Em seguida, ofereça um template editável com uma lacuna: "Use esse modelo: '[frase com espaço para adaptar]'". 2 a 3 parágrafos + template.
O template é o hook. Deve ser específico o suficiente para ter valor real, mas com uma lacuna clara que convida adaptação pessoal. Não use colchetes genéricos como [sua situação] — seja mais concreto.
LIMITE OBRIGATÓRIO: o campo "post" deve ter no máximo 15 linhas no total.`,

  conversa: `TIPO DE POST: Conversa real.
Para membros que já participam. Convida relatos de experiência, não opiniões genéricas.
FORMATO: Karen relata em primeira pessoa uma situação que viveu ou observou no universo criativo CLT→PJ. Direto. No final, uma pergunta aberta específica que convida relatos similares — não "o que você acha?" mas algo como "Como você lidou com isso?" ou "O que você faria diferente?". 3 a 4 parágrafos.
A pergunta final é o hook. Deve ser concreta o suficiente para que a resposta exija uma experiência real, não uma opinião.
LIMITE OBRIGATÓRIO: o campo "post" deve ter no máximo 15 linhas no total.`,

  enquete: `TIPO DE POST: Enquete de comunidade.
Diagnóstico rápido do momento do membro. Máximo engajamento, mínimo esforço.
FORMATO: Uma pergunta de enquete direta sobre o tema, com 2 a 4 opções de resposta curtas e mutuamente exclusivas. Antes da enquete, 1 parágrafo curto contextualizando por que essa pergunta importa agora para quem está em transição CLT→PJ. Após as opções, uma frase de fechamento que diz o que será feito com o resultado (ex: "Dependendo da maioria, trago um conteúdo específico sobre isso essa semana.").
As opções devem ser situações reais reconhecíveis, não abstrações. Nada de "Sim / Não" genérico.
LIMITE OBRIGATÓRIO: o campo "post" deve ter no máximo 15 linhas no total.`,
}

const buildPrompt = ({ slotId, weekTheme, fissura }) => {
  const base = `TEMA: ${weekTheme?.trim() || 'profissional criativo em transição CLT→PJ'}
${fissura?.trim() ? `\nFISSURA (integre naturalmente): "${fissura.trim()}"` : ''}

${SLOT_INSTRUCTIONS[slotId]}`

  if (slotId === 'enquete') {
    return `${base}

Responda com JSON:
{
  "pergunta": "a pergunta da enquete, direta e específica",
  "opcoes": ["opção 1", "opção 2", "opção 3", "opção 4"],
  "contexto": "parágrafo curto de contextualização antes da enquete",
  "fechamento": "frase de fechamento após as opções",
  "post": "texto completo formatado para colar na plataforma: contexto + pergunta + opções numeradas + fechamento",
  "nota": "observação sobre por que essa enquete funciona com essa audiência"
}`
  }

  return `${base}

Responda com JSON:
{
  "hook": "o hook específico desse formato — save hook / template editável / pergunta final",
  "post": "texto completo do post em português, pronto para copiar e colar",
  "nota": "observação curta sobre por que esse post pode funcionar com essa audiência específica"
}`
}

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
  const [tab, setTab] = useState('posts')
  const [weekTheme, setWeekTheme] = useState('')
  const [fissuras, setFissuras] = useState({ leitura: '', reacao: '', conversa: '' })
  const [drafts, setDrafts]     = useState({ leitura: null, reacao: null, conversa: null })
  const [loading, setLoading]   = useState({ leitura: false, reacao: false, conversa: false })
  const [errors, setErrors]     = useState({ leitura: null, reacao: null, conversa: null })
  const [expanded, setExpanded] = useState({ leitura: true, reacao: true, conversa: true })
  const [copied, setCopied]     = useState(null)
  const [reducing, setReducing] = useState({})
  const [reducePicker, setReducePicker] = useState({}) // { [slotId]: { type: 'paragrafos'|'linhas', qty: number } | null }
  // Enquete state (independente dos 3 slots semanais)
  const [enqueteTema, setEnqueteTema]       = useState('')
  const [enqueteFissura, setEnqueteFissura] = useState('')
  const [enqueteDraft, setEnqueteDraft]     = useState(null)
  const [enqueteLoading, setEnqueteLoading] = useState(false)
  const [enqueteError, setEnqueteError]     = useState(null)
  const [enqueteOpen, setEnqueteOpen]       = useState(true)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const reduceText = async (slotId, currentPost, setter, target = null) => {
    if (!apiKey) return
    setReducing(r => ({ ...r, [slotId]: true }))
    setReducePicker(p => ({ ...p, [slotId]: null }))
    const instruction = target
      ? target.type === 'paragrafos'
        ? `Reescreva o texto abaixo em exatamente ${target.qty} parágrafo${target.qty > 1 ? 's' : ''}, mantendo o tom, voz e as ideias principais. Retorne apenas o texto, sem explicações.`
        : `Reescreva o texto abaixo em no máximo ${target.qty} linha${target.qty > 1 ? 's' : ''}, mantendo o tom e voz originais. Retorne apenas o texto, sem explicações.`
      : `Reescreva o texto abaixo em no máximo 15 linhas, mantendo o tom, voz, hook e conclusão originais. Corte explicações redundantes, não corte ideias. Retorne apenas o texto reescrito, sem explicações.`
    try {
      const res = await fetch('/api/ai?action=openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,

        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 800,
          messages: [{ role: 'user', content: `${instruction}\n\n${currentPost}` }],
        }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      setter(data.content?.find(b => b.type === 'text')?.text?.trim() || currentPost)
    } catch { /* mantém texto original se falhar */ }
    finally { setReducing(r => ({ ...r, [slotId]: false })) }
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
      const res = await fetch('/api/ai?action=openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,

        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
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
      const raw  = data.content?.find(b => b.type === 'text')?.text || ''
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

  const generateEnquete = async () => {
    if (!apiKey) { setEnqueteError('Configure sua API key em Configurações'); return }
    setEnqueteLoading(true)
    setEnqueteError(null)
    setEnqueteDraft(null)
    try {
      const res = await fetch('/api/ai?action=openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,

        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          max_tokens: 1000,
          system: COMMUNITY_SYSTEM,
          messages: [{ role: 'user', content: buildPrompt({ slotId: 'enquete', weekTheme: enqueteTema, fissura: enqueteFissura }) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      const raw  = data.content?.find(b => b.type === 'text')?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da API')
      setEnqueteDraft(JSON.parse(match[0]))
    } catch (err) {
      setEnqueteError(err.message)
    } finally {
      setEnqueteLoading(false)
    }
  }

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
          <div className="flex items-center gap-2 mt-3">
            <a
              href="https://plataforma.contabilizeimais.com.br/m/community?tenantUuid=9e5df8c5-b632-4b5d-8787-5b8c9bcfebdd&channel=b7164b69-a785-44ab-aa01-f6371c6e8cfb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg transition-all"
            >
              <ExternalLink size={11} />
              Abrir comunidade
            </a>
            <a
              href="https://docs.google.com/spreadsheets/d/13PHIq1UFKRBtC6_i5h1EjcYDN9EqTc6dFvEVRjnTDzQ/edit?gid=1495768093#gid=1495768093"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg transition-all"
            >
              <ExternalLink size={11} />
              Cronograma
            </a>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full translate-x-20 -translate-y-12 pointer-events-none" />
        <div className="absolute right-8 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 pointer-events-none" />
      </div>

      {/* Abas */}
      <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
        {[
          { id: 'posts', label: 'Posts da semana' },
          { id: 'comentarios', label: 'Comentar posts' },
          { id: 'recursos', label: 'Indicações' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'comentarios' && <CommunityEngager />}

      {tab === 'recursos' && <CommunityResources />}

      {tab === 'posts' && (<>
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

      {/* Enquete */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setEnqueteOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:brightness-95 bg-violet-50 border-b border-violet-100"
        >
          <div className="flex items-center gap-3">
            <BarChart2 size={15} className="text-violet-500" />
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Enquete</p>
              <p className="text-[10px] text-gray-500">Diagnóstico rápido — máximo engajamento, mínimo esforço</p>
            </div>
          </div>
          {enqueteDraft && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mr-2 bg-violet-600 text-white">pronto</span>
          )}
          {enqueteOpen
            ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
            : <ChevronDown size={15} className="text-gray-400 shrink-0" />
          }
        </button>

        {enqueteOpen && (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Tema da enquete
              </label>
              <input
                type="text"
                value={enqueteTema}
                onChange={e => setEnqueteTema(e.target.value)}
                placeholder="Ex: principal obstáculo na hora de precificar como PJ"
                className="input w-full text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <AlertCircle size={9} className="text-gray-400" />
                Fissura
                <span className="text-gray-300 normal-case font-normal">(opcional)</span>
              </label>
              <textarea
                value={enqueteFissura}
                onChange={e => setEnqueteFissura(e.target.value)}
                rows={2}
                placeholder="Ex: não sei se o problema é a precificação em si ou o medo de perder o cliente..."
                className="input w-full text-xs resize-none"
              />
            </div>

            {enqueteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                {enqueteError}
              </div>
            )}

            <button
              onClick={generateEnquete}
              disabled={enqueteLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 text-white"
            >
              {enqueteLoading
                ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={13} /> Gerar enquete</>
              }
            </button>

            {enqueteDraft && (
              <div className="space-y-3 animate-fade-in">

                {/* Opções */}
                {enqueteDraft.opcoes?.length > 0 && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Opções</p>
                    <ul className="space-y-1">
                      {enqueteDraft.opcoes.map((op, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-violet-200 text-violet-700 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          {op}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Post completo */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Post completo</p>
                    <button
                      onClick={() => handleCopy(enqueteDraft.post, 'enquete-post')}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {copied === 'enquete-post' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                    </button>
                  </div>
                  <div className="p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white">
                    {enqueteDraft.post}
                  </div>
                </div>

                {enqueteDraft.nota && (
                  <p className="text-[10px] text-gray-400 italic px-1 leading-relaxed">{enqueteDraft.nota}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={generateEnquete}
                      disabled={enqueteLoading}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={11} className={enqueteLoading ? 'animate-spin' : ''} />
                      Regenerar
                    </button>
                    <button
                      onClick={() => setReducePicker(p => ({ ...p, enquete: p.enquete ? null : { type: 'paragrafos', qty: 2 } }))}
                      disabled={reducing['enquete']}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-40"
                    >
                      {reducing['enquete'] ? <Loader2 size={11} className="animate-spin" /> : <span className="text-[10px]">↙</span>}
                      Reduzir texto
                    </button>
                  </div>
                  {reducePicker['enquete'] && (
                    <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                      <select
                        value={reducePicker['enquete'].type}
                        onChange={e => setReducePicker(p => ({ ...p, enquete: { ...p.enquete, type: e.target.value } }))}
                        className="text-[11px] bg-transparent border-none outline-none text-violet-700 font-semibold cursor-pointer"
                      >
                        <option value="paragrafos">Parágrafos</option>
                        <option value="linhas">Linhas</option>
                      </select>
                      <input
                        type="number" min={1} max={20}
                        value={reducePicker['enquete'].qty}
                        onChange={e => setReducePicker(p => ({ ...p, enquete: { ...p.enquete, qty: Math.max(1, Number(e.target.value)) } }))}
                        className="w-10 text-center text-[11px] bg-white border border-violet-200 rounded px-1 py-0.5 text-violet-700 font-bold"
                      />
                      <button
                        onClick={() => reduceText('enquete', enqueteDraft.post, (reduced) => setEnqueteDraft(d => ({ ...d, post: reduced })), reducePicker['enquete'])}
                        className="text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1 rounded-lg transition-all"
                      >
                        Confirmar
                      </button>
                      <button onClick={() => setReducePicker(p => ({ ...p, enquete: null }))} className="text-gray-400 hover:text-gray-600 text-[10px]">✕</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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

                    {/* Regenerar + Reduzir */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => generate(id)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                        >
                          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                          Regenerar
                        </button>
                        <button
                          onClick={() => setReducePicker(p => ({ ...p, [id]: p[id] ? null : { type: 'paragrafos', qty: 2 } }))}
                          disabled={reducing[id]}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-40"
                        >
                          {reducing[id] ? <Loader2 size={11} className="animate-spin" /> : <span className="text-[10px]">↙</span>}
                          Reduzir texto
                        </button>
                      </div>
                      {reducePicker[id] && (
                        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                          <select
                            value={reducePicker[id].type}
                            onChange={e => setReducePicker(p => ({ ...p, [id]: { ...p[id], type: e.target.value } }))}
                            className="text-[11px] bg-transparent border-none outline-none text-violet-700 font-semibold cursor-pointer"
                          >
                            <option value="paragrafos">Parágrafos</option>
                            <option value="linhas">Linhas</option>
                          </select>
                          <input
                            type="number"
                            min={1} max={20}
                            value={reducePicker[id].qty}
                            onChange={e => setReducePicker(p => ({ ...p, [id]: { ...p[id], qty: Math.max(1, Number(e.target.value)) } }))}
                            className="w-10 text-center text-[11px] bg-white border border-violet-200 rounded px-1 py-0.5 text-violet-700 font-bold"
                          />
                          <button
                            onClick={() => reduceText(id, draft.post, (reduced) => setDrafts(d => ({ ...d, [id]: { ...d[id], post: reduced } })), reducePicker[id])}
                            className="text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Confirmar
                          </button>
                          <button onClick={() => setReducePicker(p => ({ ...p, [id]: null }))} className="text-gray-400 hover:text-gray-600 text-[10px]">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      </>)}
    </div>
  )
}
