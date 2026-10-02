import { useState } from 'react'
import { Copy, Save, Loader2, RefreshCw } from 'lucide-react'
import useStore from '../../store/useStore'
import { withManualOperacional } from '../../lib/manualOperacional'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { sweepAndFixPaths } from '../../lib/clicheSweep'
import { assertNotTruncated, extractJsonObject } from '../../utils/aiJson'
import { buildVoiceContext } from '../../utils/voiceContext'
import {
  SOCIAL_LABELS, SOCIAL_STRUCTURES, SOCIAL_GOALS, SOCIAL_TONES, SOCIAL_PRODUCTION, SOCIAL_DURATIONS,
  defaultSocialOptions, getSocialStructure, validateSocialBrief, buildSocialPrompt, validateSocialResult,
  socialTextPaths, reviewSocialResult, formatSocialScript, socialIdea, socialPublishText,
} from '../../utils/socialStudio'

export function SocialFormatOutput({ result, options }) {
  return (
    <div className="space-y-3" data-testid={`social-output-${options.format}`}>
      <h3 className="font-semibold text-gray-900">{result.titulo}</h3>
      {options.format === 'reels' && <p className="text-xs text-gray-500">Duração estimada: {result.blocos.reduce((n, b) => n + b.segundos, 0)}s. Confira lendo em voz alta e incluindo as pausas.</p>}
      {result.blocos.map(b => (
        <div key={b.numero} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
          <p className="text-xs font-semibold text-violet-700">{options.format === 'reels' ? 'Cena' : options.format === 'stories' ? 'Frame' : options.presentation === 'documento' ? 'Página' : 'Bloco'} {b.numero} · {b.funcao}{b.segundos ? ` · ${b.segundos}s estimados` : ''}</p>
          {options.format === 'linkedin' ? <>
            {b.titulo && <h4 className="font-semibold text-sm">{b.titulo}</h4>}
            <p className="whitespace-pre-wrap text-sm text-gray-800">{b.texto}</p>
            {b.visual && <p className="text-xs text-gray-500"><strong>Visual:</strong> {b.visual}</p>}
          </> : <>
            <p className="text-xs text-gray-500"><strong>Mídia:</strong> {b.midia}</p>
            <p className="text-xs text-gray-600"><strong>O que gravar:</strong> {b.acao}</p>
            {b.fala && <p className="text-sm whitespace-pre-wrap"><strong>Fala:</strong> {b.fala}</p>}
            {b.texto_tela && <p className="text-sm"><strong>Texto na tela:</strong> {b.texto_tela}</p>}
            {b.interacao && <p className="text-xs text-teal-700"><strong>Interação:</strong> {b.interacao}</p>}
          </>}
        </div>
      ))}
      {result.legenda && <p className="text-sm whitespace-pre-wrap"><strong>Legenda:</strong> {result.legenda}</p>}
      {result.cta && <p className="text-sm"><strong>Convite opcional:</strong> {result.cta}</p>}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900" role="status">
        <p>Revisão editorial: confira fatos, progressão e entrega da abertura. As checagens de tempo e repetição não comprovam a veracidade.</p>
        {!!result.revisao?.length && <ul className="list-disc pl-4 mt-2 space-y-1">{result.revisao.map((item, i) => <li key={i}>{item}</li>)}</ul>}
      </div>
    </div>
  )
}

export default function SocialFormatStudio({ format, persona, topic, onTopicChange, context = '', onSelectText }) {
  const [draft, setDraft] = useState(() => defaultSocialOptions(format, persona))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const addIdea = useStore(s => s.addIdea)
  const brandVoice = useStore(s => s.brandVoice)
  const dislikedContent = useStore(s => s.dislikedContent)
  const posicionamento = useStore(s => s.posicionamento)
  const bannedWords = posicionamento?.lista_negra || []
  const options = { ...draft, format, persona, topic }
  const set = (key, value) => setDraft(previous => ({ ...previous, [key]: value }))
  const selected = getSocialStructure(options)

  const generate = async () => {
    setError('')
    const key = localStorage.getItem('cio-openai-key') || ''
    try {
      validateSocialBrief(options)
      if (!key) throw new Error('Configure sua API key nas configurações.')
      setLoading(true)
      const snapshot = { ...options }
      const voice = buildVoiceContext(persona === 'pessoal' ? null : brandVoice, dislikedContent, bannedWords, persona === 'pessoal' ? null : posicionamento)
      const response = await fetch('/api/ai?action=openai', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({ model: 'gpt-5.6-terra', thinking: { type: 'adaptive' }, output_config: { effort: 'medium' }, max_tokens: 6500,
          system: withManualOperacional(withAntiAIFilter(`Escreva em português brasileiro. Responda somente JSON válido.\n${voice}\n${context}`)),
          messages: [{ role: 'user', content: buildSocialPrompt(snapshot) }],
        }),
      })
      if (!response.ok) {
        const { handleApiError } = await import('../../utils/apiError')
        await handleApiError(response)
      }
      const envelope = await response.json()
      assertNotTruncated(envelope)
      const result = extractJsonObject(envelope.content?.find(b => b.type === 'text')?.text || '')
      validateSocialResult(result, snapshot)
      let sweep
      try { sweep = await sweepAndFixPaths(key, result, socialTextPaths, bannedWords) } catch { /* Preserve output and expose incomplete review below. */ }
      validateSocialResult(result, snapshot)
      result.revisao = reviewSocialResult(result, snapshot)
      if (!sweep) result.revisao.push('A revisão de linguagem não foi concluída. Confira o texto antes de publicar.')
      else if (sweep.remaining.length) result.revisao.push('Há expressões sinalizadas pela revisão de linguagem. Revise antes de publicar.')
      setGenerated({ result, options: snapshot })
      setSaved(false)
      setCopied(false)
    } catch (e) { setError(e.message || 'Não foi possível gerar. Tente novamente.') }
    finally { setLoading(false) }
  }

  const copy = async () => {
    try {
      const { result, options: snapshot } = generated
      const text = snapshot.format === 'linkedin' && snapshot.presentation === 'texto' ? socialPublishText(result, snapshot) : formatSocialScript(result, snapshot, false)
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch { setError('Não foi possível copiar. Selecione o texto e copie manualmente.') }
  }
  const save = () => {
    addIdea(socialIdea(generated.result, generated.options))
    setSaved(true)
  }

  return (
    <section className="space-y-4 pb-24" aria-label={`${SOCIAL_LABELS[format]} — ${persona === 'pessoal' ? 'Studio Pessoal' : 'Studio de Criação'}`}>
      <fieldset disabled={loading} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 disabled:opacity-70">
        <h2 className="font-semibold">{SOCIAL_LABELS[format]} · {persona === 'pessoal' ? 'Vida fora do trabalho' : 'Conteúdo profissional'}</h2>
        <label className="block text-xs text-gray-600">Tema
          <input aria-label={`Tema de ${SOCIAL_LABELS[format]}`} className="input w-full mt-1" value={topic} onChange={e => onTopicChange(e.target.value)} placeholder={persona === 'pessoal' ? 'Uma cena, um interesse ou uma descoberta do dia' : 'Um problema, uma decisão ou um assunto específico'} />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">Estrutura
            <select aria-label="Estrutura" className="input mt-1 w-full" value={draft.structure} onChange={e => set('structure', e.target.value)}>
              {Object.entries(SOCIAL_STRUCTURES[persona][format]).map(([id, entry]) => <option key={id} value={id}>{entry.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-600">Objetivo
            <select aria-label="Objetivo" className="input mt-1 w-full" value={draft.goal} onChange={e => set('goal', e.target.value)}>{SOCIAL_GOALS[persona][format].map(goal => <option key={goal}>{goal}</option>)}</select>
          </label>
          <label className="text-xs text-gray-600">Tom
            <select aria-label="Tom" className="input mt-1 w-full" value={draft.tone} onChange={e => set('tone', e.target.value)}>{SOCIAL_TONES[persona].map(tone => <option key={tone}>{tone}</option>)}</select>
          </label>
          <label className="text-xs text-gray-600">Público (opcional)
            <input aria-label="Público" className="input mt-1 w-full" value={draft.audience} onChange={e => set('audience', e.target.value)} />
          </label>
          {format !== 'linkedin' ? <label className="text-xs text-gray-600">Como gravar
            <select aria-label="Como gravar" className="input mt-1 w-full" value={draft.production} onChange={e => set('production', e.target.value)}>{SOCIAL_PRODUCTION.map(value => <option key={value}>{value}</option>)}</select>
          </label> : <label className="text-xs text-gray-600">Apresentação
            <select aria-label="Apresentação" className="input mt-1 w-full" value={draft.presentation} onChange={e => set('presentation', e.target.value)}><option value="texto">Post em texto</option><option value="documento">Roteiro de documento</option></select>
          </label>}
          {format === 'reels' && <label className="text-xs text-gray-600">Duração alvo
            <select aria-label="Duração alvo" className="input mt-1 w-full" value={draft.duration} onChange={e => set('duration', Number(e.target.value))}>{SOCIAL_DURATIONS.map(value => <option key={value} value={value}>{value} segundos</option>)}</select>
          </label>}
        </div>
        <p className="text-xs text-gray-500">{selected.roles.join(' → ')}</p>
        <label className="block text-xs text-gray-600">Material de apoio {selected.needsFacts ? '(obrigatório para esta estrutura)' : '(opcional)'}
          <textarea aria-label="Material de apoio" className="input w-full mt-1" rows={4} value={draft.material} onChange={e => set('material', e.target.value)} placeholder="Fatos reais, detalhes da cena, fonte ou texto base. Não inclua dados privados de clientes." />
        </label>
        <button onClick={generate} disabled={loading || !topic.trim()} className="w-full rounded-xl bg-violet-600 text-white p-3 text-sm font-semibold flex justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}{loading ? 'Gerando...' : `Gerar ${SOCIAL_LABELS[format]}`}</button>
      </fieldset>
      {error && <p role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</p>}
      {generated && <div className="space-y-3" onMouseUp={onSelectText}>
        <p className="text-xs text-gray-500">Gerado para: {generated.options.topic} · {getSocialStructure(generated.options).label} · {generated.options.tone}</p>
        <SocialFormatOutput result={generated.result} options={generated.options} />
        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="btn-secondary flex items-center gap-2 text-xs"><Copy size={14} />{copied ? 'Copiado' : format === 'linkedin' && generated.options.presentation === 'texto' ? 'Copiar post' : 'Copiar roteiro'}</button>
          <button onClick={save} disabled={saved} className="btn-secondary flex items-center gap-2 text-xs"><Save size={14} />{saved ? 'Salvo no Hub' : 'Salvar rascunho no Hub'}</button>
        </div>
      </div>}
    </section>
  )
}
