import { useState } from 'react'
import {
  Wand2, Flame, Type, Hash, MessageSquare, Sparkles,
  Loader2, Copy, Check, ShieldCheck, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { TITULO_CATEGORIES, LANGUAGE_STYLES } from '../../data/promptGenTemplates'
import {
  generatePersonalityHooks, generateDisruptiveCopy, generateLanguageVariants,
  generateHashtagRanking, generateSalesCaption, generateComplementaryCaption,
  generatePowerfulTitles,
} from '../../lib/promptGenService'

const LS_KEY = 'cio-openai-key'

const MODES = [
  { id: 'personalidade', label: 'Personalidade', desc: '30 ganchos provocativos pro reels', icon: Sparkles },
  { id: 'disruptivo', label: 'Disruptivo', desc: 'Reformula pra gerar discussão', icon: Flame },
  { id: 'linguagem', label: 'Linguagem', desc: '5 versões num estilo específico', icon: Type },
  { id: 'ranqueamento', label: 'Ranqueamento', desc: 'Hashtags por volume de busca', icon: Hash },
  { id: 'legenda', label: 'Legenda', desc: 'Legenda de venda + complementar', icon: MessageSquare },
  { id: 'titulos', label: 'Títulos Poderosos', desc: '100 fórmulas, tom sênior', icon: Wand2 },
]

const PERSONAL_MODE_COPY = {
  personalidade: { label: 'Aberturas pessoais', desc: '30 começos humanos para reels' },
  disruptivo: { label: 'Dar personalidade', desc: 'Tira o genérico sem forçar polêmica' },
  linguagem: { label: 'Variações de voz', desc: '5 versões naturais do mesmo relato' },
  ranqueamento: { label: 'Hashtags pessoais', desc: 'Hashtags coerentes com o tema' },
  legenda: { label: 'Legendas pessoais', desc: 'Conexão, contexto e complemento' },
  titulos: { label: 'Títulos naturais', desc: 'Curiosidade sem clickbait' },
}

const PERSONAL_TITLE_CATEGORY_COPY = {
  curiosidade: 'Curiosidade cotidiana',
  beneficios: 'Pequena descoberta',
  transformacao: 'O que mudou na prática',
  dor: 'Contradição pessoal',
  solucao: 'O que funcionou para mim',
  acao: 'Convite à identificação',
  objecoes: 'Eu também achava',
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300'
const textareaCls = `${inputCls} resize-none`

function GenerateButton({ onClick, loading, disabled, children = 'Gerar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
      {loading ? 'Gerando...' : children}
    </button>
  )
}

function CopyableLine({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-start gap-2 group px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 bg-white">
      <p className="flex-1 text-[13px] text-gray-800 leading-relaxed">{text}</p>
      <button type="button" onClick={handleCopy} className="shrink-0 text-gray-300 hover:text-violet-500 transition-colors" title="Copiar">
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </button>
    </div>
  )
}

/** Selo de resultado da varredura anti-clichê — mostra o que foi corrigido
    automaticamente e o que sobrou (raro: a reescrita também é probabilística). */
function SweepBadge({ sweep }) {
  if (!sweep) return null
  if (!sweep.fixed && !sweep.remaining?.length) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
        <ShieldCheck size={12} /> Sem clichês detectados.
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {sweep.fixed > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-violet-600">
          <ShieldCheck size={12} /> {sweep.fixed} trecho{sweep.fixed === 1 ? '' : 's'} reescrito{sweep.fixed === 1 ? '' : 's'} pelo filtro anti-clichê.
        </div>
      )}
      {sweep.remaining?.length > 0 && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-600">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span>{sweep.remaining.length} trecho{sweep.remaining.length === 1 ? '' : 's'} ainda com padrão suspeito — revise antes de publicar: {sweep.remaining.map((f) => `"${f.blocks[0]?.match}"`).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

function GroupResult({ title, items }) {
  if (!items?.length) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="space-y-1">
        {items.map((t, i) => <CopyableLine key={i} text={t} />)}
      </div>
    </div>
  )
}

export default function PromptGenerator({ persona = 'trabalho' }) {
  const isPessoal = persona === 'pessoal'
  const [mode, setMode] = useState('personalidade')
  const apiKey = typeof window !== 'undefined' ? (localStorage.getItem(LS_KEY) || '') : ''
  const bannedWords = useStore((s) => s.posicionamento.lista_negra) || []
  const brandVoice = useStore((s) => s.brandVoice)
  const dislikedContent = useStore((s) => s.dislikedContent)
  const posicionamento = useStore((s) => s.posicionamento)
  const voiceOpts = { bannedWords, brandVoice, dislikedContent, posicionamento, persona }
  const modes = isPessoal ? MODES.map((mode) => ({ ...mode, ...PERSONAL_MODE_COPY[mode.id] })) : MODES

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{isPessoal ? 'Gerador de Prompt · Do lado de cá' : 'Gerador de Prompt'}</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">{isPessoal ? 'Aberturas, legendas e títulos para mostrar sua vida real sem transformar intimidade em conteúdo.' : 'Templates prontos de gancho, copy e título — sempre passando pelo filtro anti-clichê antes de aparecer aqui.'}</p>
      </div>

      {!apiKey && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
          <AlertTriangle size={13} className="shrink-0" /> Configure sua API key em Analytics {'>'} Configurações antes de gerar.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {modes.map((m) => {
          const Icon = m.icon
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                'flex items-start gap-2 text-left p-2.5 rounded-xl border transition-all shrink-0 min-w-[152px]',
                active ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <Icon size={15} className={clsx('shrink-0 mt-0.5', active ? 'text-violet-500' : 'text-gray-400')} />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{m.label}</div>
                <div className="text-[10px] text-gray-400 truncate">{m.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="border border-gray-200 rounded-xl p-4">
        {mode === 'personalidade' && <PersonalidadeMode apiKey={apiKey} voiceOpts={voiceOpts} isPessoal={isPessoal} />}
        {mode === 'disruptivo' && <DisruptivoMode apiKey={apiKey} voiceOpts={voiceOpts} isPessoal={isPessoal} />}
        {mode === 'linguagem' && <LinguagemMode apiKey={apiKey} voiceOpts={voiceOpts} isPessoal={isPessoal} />}
        {mode === 'ranqueamento' && <RanqueamentoMode apiKey={apiKey} voiceOpts={voiceOpts} isPessoal={isPessoal} />}
        {mode === 'legenda' && <LegendaMode apiKey={apiKey} voiceOpts={voiceOpts} isPessoal={isPessoal} />}
        {mode === 'titulos' && <TitulosMode apiKey={apiKey} voiceOpts={voiceOpts} isPessoal={isPessoal} />}
      </div>
    </div>
  )
}

function PersonalidadeMode({ apiKey, voiceOpts, isPessoal }) {
  const [ideia, setIdeia] = useState('')
  const [publicoAlvo, setPublicoAlvo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const run = async () => {
    if (!ideia.trim() || (!isPessoal && !publicoAlvo.trim())) return
    setLoading(true); setError(null); setData(null)
    try {
      const { result, sweep } = await generatePersonalityHooks(apiKey, { ideia, publicoAlvo }, voiceOpts)
      setData({ result, sweep })
    } catch (e) {
      setError(e.message || 'Erro ao gerar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label={isPessoal ? 'Tema ou cena pessoal' : 'Ideia do vídeo'}>
        <textarea rows={2} value={ideia} onChange={(e) => setIdeia(e.target.value)} placeholder={isPessoal ? 'Ex.: o jeito que a Naomi avisa que já trabalhei demais' : 'Ex.: como eu organizo minha semana de trabalho remoto'} className={textareaCls} />
      </Field>
      <Field label={isPessoal ? 'Quem pode se identificar (opcional)' : 'Público-alvo'}>
        <input value={publicoAlvo} onChange={(e) => setPublicoAlvo(e.target.value)} placeholder={isPessoal ? 'Ex.: quem também vive sob a supervisão de um animal' : 'Ex.: pessoas que querem trabalhar de casa com mais foco'} className={inputCls} />
      </Field>
      <GenerateButton onClick={run} loading={loading} disabled={!ideia.trim() || (!isPessoal && !publicoAlvo.trim())} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {data && (
        <div className="space-y-4 pt-1">
          <SweepBadge sweep={data.sweep} />
          <GroupResult title="Ganchos diretos" items={data.result.diretos} />
          <GroupResult title="Storytelling / reflexão" items={data.result.storytelling} />
          <GroupResult title="Frase impactante" items={data.result.impactante} />
        </div>
      )}
    </div>
  )
}

function DisruptivoMode({ apiKey, voiceOpts, isPessoal }) {
  const [textoOriginal, setTextoOriginal] = useState('')
  const [publicoAlvo, setPublicoAlvo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const run = async () => {
    if (!textoOriginal.trim() || !publicoAlvo.trim()) return
    setLoading(true); setError(null); setData(null)
    try {
      const { result, sweep } = await generateDisruptiveCopy(apiKey, { textoOriginal, publicoAlvo }, voiceOpts)
      setData({ result, sweep })
    } catch (e) {
      setError(e.message || 'Erro ao gerar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label={isPessoal ? 'Texto que está genérico' : 'Copy original do reels'}>
        <textarea rows={4} value={textoOriginal} onChange={(e) => setTextoOriginal(e.target.value)} placeholder="Cole o texto que quer reformular" className={textareaCls} />
      </Field>
      <Field label={isPessoal ? 'Quem pode se identificar' : 'Público-alvo que vamos atingir'}>
        <input value={publicoAlvo} onChange={(e) => setPublicoAlvo(e.target.value)} placeholder={isPessoal ? 'Ex.: mulheres que tentam deixar a rotina menos pesada' : 'Ex.: mulheres 25+ que romantizam a rotina'} className={inputCls} />
      </Field>
      <GenerateButton onClick={run} loading={loading} disabled={!textoOriginal.trim() || !publicoAlvo.trim()} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {data && (
        <div className="space-y-2 pt-1">
          <SweepBadge sweep={data.sweep} />
          <CopyableLine text={data.result.versao} />
        </div>
      )}
    </div>
  )
}

function LinguagemMode({ apiKey, voiceOpts, isPessoal }) {
  const [textoBase, setTextoBase] = useState('')
  const [estiloId, setEstiloId] = useState(LANGUAGE_STYLES[0].id)
  const [objetivo, setObjetivo] = useState('')
  const [publicoAlvo, setPublicoAlvo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const run = async () => {
    if (!textoBase.trim() || !objetivo.trim()) return
    setLoading(true); setError(null); setData(null)
    try {
      const { result, sweep } = await generateLanguageVariants(apiKey, { textoBase, estiloId, objetivo, publicoAlvo }, voiceOpts)
      setData({ result, sweep })
    } catch (e) {
      setError(e.message || 'Erro ao gerar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Legenda base">
        <textarea rows={3} value={textoBase} onChange={(e) => setTextoBase(e.target.value)} placeholder={isPessoal ? 'Conte a cena ou escreva o rascunho com suas palavras' : 'Legenda que serve de ponto de partida'} className={textareaCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estilo de linguagem">
          <select value={estiloId} onChange={(e) => setEstiloId(e.target.value)} className={inputCls}>
            {LANGUAGE_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Objetivo">
          <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: gerar conexão" className={inputCls} />
        </Field>
      </div>
      <Field label="Público-alvo">
        <input value={publicoAlvo} onChange={(e) => setPublicoAlvo(e.target.value)} placeholder="Ex.: mulheres 25 anos que amam romantizar a rotina" className={inputCls} />
      </Field>
      <GenerateButton onClick={run} loading={loading} disabled={!textoBase.trim() || !objetivo.trim()} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {data && (
        <div className="space-y-2 pt-1">
          <SweepBadge sweep={data.sweep} />
          <div className="space-y-1.5">
            {data.result.versoes.map((v, i) => <CopyableLine key={i} text={v} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function RanqueamentoMode({ apiKey, voiceOpts, isPessoal }) {
  const [palavrasChave, setPalavrasChave] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const run = async () => {
    if (!palavrasChave.trim()) return
    setLoading(true); setError(null); setData(null)
    try {
      const { result } = await generateHashtagRanking(apiKey, { palavrasChave }, voiceOpts)
      setData(result)
    } catch (e) {
      setError(e.message || 'Erro ao gerar.')
    } finally {
      setLoading(false)
    }
  }

  const allTags = data ? [...(data.baixo || []), ...(data.medio || []), ...(data.viral || [])] : []

  return (
    <div className="space-y-4">
      <Field label="Palavras-chave do perfil (uma por linha)">
        <textarea rows={4} value={palavrasChave} onChange={(e) => setPalavrasChave(e.target.value)} placeholder={isPessoal ? 'vida com bulldog\nrotina real\nachados pessoais\nfé no cotidiano' : 'vídeos de rotina\nrotina cozy\ndona do lar\ncasal/marido'} className={textareaCls} />
      </Field>
      <GenerateButton onClick={run} loading={loading} disabled={!palavrasChave.trim()} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {data && (
        <div className="space-y-3 pt-1">
          <GroupResult title="Volume baixo (~10 mil)" items={data.baixo} />
          <GroupResult title="Volume médio (100–500 mil)" items={data.medio} />
          <GroupResult title="Viral (1 mi+)" items={data.viral} />
          <GroupResult title="Gringas virais (1 mi+)" items={data.gringas} />
          {allTags.length > 0 && (
            <CopyableLine text={allTags.join(' ')} />
          )}
        </div>
      )}
    </div>
  )
}

function LegendaMode({ apiKey, voiceOpts, isPessoal }) {
  const [publicoAlvo, setPublicoAlvo] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [produto, setProduto] = useState('')
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState(null)
  const [salesData, setSalesData] = useState(null)

  const [textoBase, setTextoBase] = useState('')
  const [estiloId, setEstiloId] = useState(LANGUAGE_STYLES[0].id)
  const [palavraChave, setPalavraChave] = useState('')
  const [compLoading, setCompLoading] = useState(false)
  const [compError, setCompError] = useState(null)
  const [compData, setCompData] = useState(null)

  const runSales = async () => {
    if (!publicoAlvo.trim() || !objetivo.trim()) return
    setSalesLoading(true); setSalesError(null); setSalesData(null)
    try {
      const { result, sweep } = await generateSalesCaption(apiKey, { publicoAlvo, objetivo, produto }, voiceOpts)
      setSalesData({ result, sweep })
      if (!textoBase.trim()) setTextoBase(result.legenda)
    } catch (e) {
      setSalesError(e.message || 'Erro ao gerar.')
    } finally {
      setSalesLoading(false)
    }
  }

  const runComplementary = async () => {
    if (!textoBase.trim() || !palavraChave.trim()) return
    setCompLoading(true); setCompError(null); setCompData(null)
    try {
      const { result, sweep } = await generateComplementaryCaption(apiKey, { textoBase, estiloId, palavraChave }, voiceOpts)
      setCompData({ result, sweep })
    } catch (e) {
      setCompError(e.message || 'Erro ao gerar.')
    } finally {
      setCompLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{isPessoal ? 'Legenda a partir de uma vivência' : 'Legenda de venda'}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={isPessoal ? 'Quem pode se identificar' : 'Público-alvo'}>
            <input value={publicoAlvo} onChange={(e) => setPublicoAlvo(e.target.value)} placeholder={isPessoal ? 'Ex.: quem também demora a perceber que precisa descansar' : 'Mesmo público do perfil'} className={inputCls} />
          </Field>
          <Field label={isPessoal ? 'O que você quer dividir' : 'Objetivo principal'}>
            <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder={isPessoal ? 'Ex.: contar o que mudou para deixar a rotina mais leve' : 'Ex.: ensinar e gerar consciência sobre o produto'} className={inputCls} />
          </Field>
        </div>
        <Field label={isPessoal ? 'Detalhe real que precisa aparecer (opcional)' : 'Produto/serviço (opcional)'}>
          <input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder={isPessoal ? 'Ex.: caminhar com a Naomi antes de abrir o notebook' : 'O que está sendo vendido, se houver'} className={inputCls} />
        </Field>
        <GenerateButton onClick={runSales} loading={salesLoading} disabled={!publicoAlvo.trim() || !objetivo.trim()} />
        {salesError && <p className="text-[11px] text-red-500">{salesError}</p>}
        {salesData && (
          <div className="space-y-2">
            <SweepBadge sweep={salesData.sweep} />
            <CopyableLine text={salesData.result.legenda} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 space-y-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Legenda complementar (5 variações)</p>
        <Field label="Texto base">
          <textarea rows={3} value={textoBase} onChange={(e) => setTextoBase(e.target.value)} placeholder="Cole o texto — ou gere a legenda de venda acima primeiro" className={textareaCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estilo de linguagem">
            <select value={estiloId} onChange={(e) => setEstiloId(e.target.value)} className={inputCls}>
              {LANGUAGE_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Palavra-chave a favorecer">
            <input value={palavraChave} onChange={(e) => setPalavraChave(e.target.value)} placeholder="Ex.: rotina, aconchego" className={inputCls} />
          </Field>
        </div>
        <GenerateButton onClick={runComplementary} loading={compLoading} disabled={!textoBase.trim() || !palavraChave.trim()} />
        {compError && <p className="text-[11px] text-red-500">{compError}</p>}
        {compData && (
          <div className="space-y-2">
            <SweepBadge sweep={compData.sweep} />
            <div className="space-y-1.5">
              {compData.result.versoes.map((v, i) => <CopyableLine key={i} text={v} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TitulosMode({ apiKey, voiceOpts, isPessoal }) {
  const [tema, setTema] = useState('')
  const [categoriaId, setCategoriaId] = useState(TITULO_CATEGORIES[0].id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const titleCategories = isPessoal
    ? TITULO_CATEGORIES.filter((category) => PERSONAL_TITLE_CATEGORY_COPY[category.id])
    : TITULO_CATEGORIES

  const run = async () => {
    if (!tema.trim()) return
    setLoading(true); setError(null); setData(null)
    try {
      const { result, sweep } = await generatePowerfulTitles(apiKey, { tema, categoriaId, count: 10 }, voiceOpts)
      setData({ result, sweep })
    } catch (e) {
      setError(e.message || 'Erro ao gerar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-400 leading-relaxed">{isPessoal ? 'As fórmulas servem apenas como ponto de partida. A saída preserva naturalidade, detalhe pessoal e curiosidade sem clickbait.' : 'Baseado nas 100 fórmulas de título de referência — usadas só como estrutura. O texto final sempre sai reescrito no tom sênior e sem clickbait exigido pelo filtro anti-clichê.'}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={isPessoal ? 'Tema ou microtema' : 'Tema / nicho / produto'}>
          <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder={isPessoal ? 'Ex.: manias muito específicas da Naomi' : 'Ex.: carreira em tecnologia'} className={inputCls} />
        </Field>
        <Field label="Categoria de gancho">
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
            {titleCategories.map((c) => <option key={c.id} value={c.id}>{isPessoal ? PERSONAL_TITLE_CATEGORY_COPY[c.id] : c.label}</option>)}
          </select>
        </Field>
      </div>
      <GenerateButton onClick={run} loading={loading} disabled={!tema.trim()} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {data && (
        <div className="space-y-2 pt-1">
          <SweepBadge sweep={data.sweep} />
          <div className="space-y-1.5">
            {data.result.titulos.map((t, i) => <CopyableLine key={i} text={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}
