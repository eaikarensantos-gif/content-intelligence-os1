import { useEffect, useState } from 'react'
import { Loader2, Copy, Save, Sparkles } from 'lucide-react'
import useStore from '../../store/useStore'
import { withManualOperacional } from '../../lib/manualOperacional'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { buildVoiceContext } from '../../utils/voiceContext'
import { assertNotTruncated, extractJsonObject } from '../../utils/aiJson'
import { handleApiError } from '../../utils/apiError'
import { sweepAndFixPaths } from '../../lib/clicheSweep'
import { SocialFormatOutput } from './SocialFormatStudio'
import { buildSocialPrompt, validateSocialResult, socialTextPaths, reviewSocialResult, socialIdea, socialPublishText, formatSocialScript } from '../../utils/socialStudio'
import { PLAN_CHANNELS, DEFAULT_CHANNELS, validatePlan, buildPlanPrompt, reviewPlan, planContext, planSocialOptions, cardSignature, buildCompactScriptPrompt, validateCompactScript, compactScriptText } from '../../utils/multichannelPlan'

const initialBrief = () => ({ topic: '', audience: '', goal: 'Criar publicações complementares', material: '', channels: [...DEFAULT_CHANNELS] })
const cleanCard = card => ({ ...card, evidencias: card.evidencias.map(v => v.trim()).filter(Boolean), pendencias: card.pendencias.map(v => v.trim()).filter(Boolean) })
const editableFields = [['publico', 'Público'], ['objetivo', 'Objetivo'], ['pergunta', 'Pergunta central'], ['recorte', 'Recorte'], ['entrega', 'Entrega'], ['justificativa', 'Por que este canal'], ['ressalva', 'Limitação ou ressalva']]

function restore(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key))
    if (!stored || stored.version !== 1) return null
    const brief = stored.brief
    if (!brief || ['topic', 'audience', 'goal', 'material'].some(k => typeof brief[k] !== 'string') || !Array.isArray(brief.channels) || brief.channels.some(c => !PLAN_CHANNELS[c])) return null
    if (stored.plan) {
      const snapshot = stored.plan.brief
      if (!snapshot || ['topic', 'audience', 'goal', 'material'].some(k => typeof snapshot[k] !== 'string') || !Array.isArray(snapshot.channels) || snapshot.channels.some(c => !PLAN_CHANNELS[c])) return null
      validatePlan({ propostas: stored.plan.cards.map(card => ({ ...cleanCard(card), ...Object.fromEntries(editableFields.filter(([k]) => k !== 'ressalva').map(([k]) => [k, typeof card[k] === 'string' && !card[k].trim() ? '[Rascunho incompleto]' : card[k]])) })) }, snapshot.channels)
      if (stored.plan.cards.some(card => typeof card.material !== 'string' || typeof card.selected !== 'boolean')) return null
      if (typeof stored.plan.id !== 'string' || !stored.plan.brief.topic || !stored.plan.outputs || typeof stored.plan.outputs !== 'object') return null
      // Old or malformed generated responses must not break restoration of the plan.
      for (const [channel, output] of Object.entries(stored.plan.outputs)) {
        try {
          if (!Array.isArray(output.result?.revisao) || output.result.revisao.some(r => typeof r !== 'string')) throw new Error('Revisão inválida')
          if (output.options) validateSocialResult(output.result, output.options)
          else validateCompactScript(output.result, { canal: channel }, stored.plan.persona)
        } catch { delete stored.plan.outputs[channel] }
      }
    }
    return stored
  } catch { return null }
}

export default function MultichannelPlanner({ persona = 'trabalho' }) {
  const storageKey = `cio-multichannel-${persona}-v1`
  const [restored] = useState(() => restore(storageKey))
  const [brief, setBrief] = useState(() => restored?.brief || initialBrief())
  const [plan, setPlan] = useState(() => restored?.plan || null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [channelErrors, setChannelErrors] = useState({})
  const [copied, setCopied] = useState('')
  const addIdea = useStore(s => s.addIdea)
  const brandVoice = useStore(s => s.brandVoice)
  const dislikedContent = useStore(s => s.dislikedContent)
  const posicionamento = useStore(s => s.posicionamento)
  const bannedWords = posicionamento?.lista_negra || []

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, brief, plan }))
      setStorageError('')
    } catch { setStorageError('Não foi possível guardar o plano neste navegador. Salve os roteiros no Hub antes de sair.') }
  }, [brief, plan, storageKey])

  const request = async (prompt, context = '') => {
    const apiKey = localStorage.getItem('cio-openai-key')
    if (!apiKey) throw new Error('Configure sua API key nas configurações.')
    const voice = buildVoiceContext(persona === 'pessoal' ? null : brandVoice, dislikedContent, bannedWords, persona === 'pessoal' ? null : posicionamento)
    const response = await fetch('/api/ai?action=openai', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ model: 'gpt-5.6-terra', thinking: { type: 'adaptive' }, output_config: { effort: 'medium' }, max_tokens: 8500,
        system: withManualOperacional(withAntiAIFilter(`Responda em português brasileiro, somente JSON válido. Não invente fatos.\n${voice}\n${context}`)),
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) await handleApiError(response)
    const envelope = await response.json()
    assertNotTruncated(envelope)
    return extractJsonObject(envelope.content?.find(b => b.type === 'text')?.text || '')
  }

  const generatePlan = async () => {
    setError('')
    if (!brief.topic.trim() || !brief.channels.length) { setError('Informe um assunto e escolha ao menos um canal.'); return }
    setBusy('plan')
    try {
      const snapshot = { ...brief, channels: [...brief.channels] }
      const result = await request(buildPlanPrompt(snapshot, persona))
      validatePlan(result, snapshot.channels)
      setPlan({ id: crypto.randomUUID(), persona, brief: snapshot, cards: snapshot.channels.map(canal => ({ ...result.propostas.find(p => p.canal === canal), selected: true, material: '' })), outputs: {} })
      setChannelErrors({})
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }

  const editCard = (channel, field, value) => setPlan(previous => ({ ...previous, cards: previous.cards.map(card => card.canal === channel ? { ...card, [field]: value } : card) }))

  const generateScripts = async channels => {
    const snapshot = plan
    setBusy('scripts')
    setError('')
    for (const channel of channels) {
      setBusy(channel)
      setChannelErrors(previous => ({ ...previous, [channel]: '' }))
      try {
        const card = cleanCard(snapshot.cards.find(c => c.canal === channel))
        validatePlan({ propostas: [card] }, [channel])
        const native = ['reels', 'stories', 'linkedin'].includes(PLAN_CHANNELS[channel].format)
        const options = native ? planSocialOptions(snapshot.brief, card, persona) : null
        const result = await request(native ? buildSocialPrompt(options) : buildCompactScriptPrompt(snapshot.brief, card, persona), native ? planContext(snapshot.brief, card) : '')
        const validate = () => native ? validateSocialResult(result, options) : validateCompactScript(result, card, persona)
        validate()
        let sweep
        try {
          const paths = native ? socialTextPaths : r => [
            { path: ['titulo'], short: true, label: 'Título' },
            ...r.blocos.flatMap((b, i) => ['titulo', 'texto'].filter(k => b[k]).map(k => ({ path: ['blocos', i, k], short: true, isClosing: i === r.blocos.length - 1, label: `Bloco ${i + 1}` }))),
            { path: ['legenda'], short: false, label: 'Legenda' },
          ]
          sweep = await sweepAndFixPaths(localStorage.getItem('cio-openai-key'), result, paths, bannedWords)
        } catch { /* Preserve and flag an incomplete review. */ }
        validate()
        result.revisao = [...(native ? reviewSocialResult(result, options) : result.pendencias.map(p => `Conferir: ${p}`)), ...card.pendencias.map(p => `Pendência do plano: ${p}`)]
        if (!sweep || sweep.remaining.length) result.revisao.push('Revise a linguagem antes de publicar; a correção automática não foi concluída.')
        const output = { result, options, signature: cardSignature(snapshot.brief, card, persona), saved: false }
        setPlan(previous => previous.id === snapshot.id ? { ...previous, outputs: { ...previous.outputs, [channel]: output } } : previous)
      } catch (e) { setChannelErrors(previous => ({ ...previous, [channel]: e.message })) }
    }
    setBusy('')
  }

  const save = card => {
    const output = plan.outputs[card.canal]
    if (output.signature !== cardSignature(plan.brief, cleanCard(card), persona)) return
    const { result, options } = output
    const script = options ? formatSocialScript(result, options) : compactScriptText(result) + (result.revisao?.length ? `\n\nREVISÃO PENDENTE\n${result.revisao.join('\n')}` : '')
    const idea = options ? socialIdea(result, options) : {
      title: result.titulo, description: script, script, caption: result.legenda,
      format: card.canal === 'instagram_carousel' ? 'carrossel' : card.canal === 'x_thread' ? 'thread' : 'post',
      platform: card.canal.startsWith('x_') ? 'twitter' : 'instagram', platforms: [card.canal.startsWith('x_') ? 'twitter' : 'instagram'],
      priority: 'medium', status: 'draft', tags: ['multicanal', persona, card.canal],
    }
    addIdea({ ...idea, source: `Plano multicanal — ${PLAN_CHANNELS[card.canal].label}`, distribution_plan: { id: plan.id, persona, topic: plan.brief.topic, ...cleanCard(card) } })
    setPlan(previous => ({ ...previous, outputs: { ...previous.outputs, [card.canal]: { ...output, saved: true } } }))
  }
  const copy = async channel => {
    try {
      const { result, options } = plan.outputs[channel]
      await navigator.clipboard.writeText(options ? (options.format === 'linkedin' && options.presentation === 'texto' ? socialPublishText(result, options) : formatSocialScript(result, options, false)) : compactScriptText(result, false))
      setCopied(channel)
    } catch { setError('Não foi possível copiar. Selecione o texto e copie manualmente.') }
  }
  const warnings = plan ? reviewPlan(plan.cards.filter(c => c.selected).map(cleanCard)) : []
  const selected = plan?.cards.filter(c => c.selected).map(c => c.canal) || []

  return (
    <section className="max-w-5xl mx-auto p-4 sm:p-6 pb-28 space-y-5" aria-label="Planejamento multicanal">
      <div><h1 className="text-xl font-bold">Um assunto, entregas diferentes</h1><p className="text-sm text-gray-500">{persona === 'pessoal' ? 'Studio Pessoal' : 'Studio de Criação'} · Planeje os recortes antes de escrever. Escolha somente os canais que fazem sentido.</p></div>
      <fieldset disabled={!!busy} className="card p-4 space-y-3">
        <label className="block text-sm">Assunto<input aria-label="Assunto" className="input w-full mt-1" value={brief.topic} onChange={e => setBrief({ ...brief, topic: e.target.value })} placeholder={persona === 'pessoal' ? 'Uma descoberta, um interesse ou uma cena do cotidiano' : 'Ex: como usar dados para planejar conteúdo'} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Público de referência<input aria-label="Público de referência" className="input w-full mt-1" value={brief.audience} onChange={e => setBrief({ ...brief, audience: e.target.value })} /></label>
          <label className="text-sm">Objetivo geral<input aria-label="Objetivo geral" className="input w-full mt-1" value={brief.goal} onChange={e => setBrief({ ...brief, goal: e.target.value })} /></label>
        </div>
        <label className="block text-sm">Fatos e materiais disponíveis<textarea aria-label="Fatos e materiais disponíveis" rows={4} className="input w-full mt-1" value={brief.material} onChange={e => setBrief({ ...brief, material: e.target.value })} placeholder="Cole dados, relatos reais, trechos e fontes. Um link sozinho não permite verificar seu conteúdo." /></label>
        <div className="grid sm:grid-cols-2 gap-2">{Object.entries(PLAN_CHANNELS).map(([id, channel]) => <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={brief.channels.includes(id)} onChange={e => setBrief({ ...brief, channels: e.target.checked ? [...brief.channels, id] : brief.channels.filter(c => c !== id) })} />{channel.label}</label>)}</div>
        <button onClick={generatePlan} disabled={!brief.topic.trim() || !brief.channels.length || !!busy} className="btn-primary flex gap-2 items-center">{busy === 'plan' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{plan ? 'Criar novo plano' : 'Planejar distribuição'}</button>
        {plan && <p className="text-xs text-gray-500">Criar um novo plano substitui o plano e os roteiros locais abaixo. Os rascunhos já salvos no Hub permanecem.</p>}
      </fieldset>
      {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
      <p className="text-xs text-gray-500">{storageError || 'Plano guardado neste navegador. Salve os roteiros no Hub para incluí-los no seu fluxo de conteúdo.'}</p>
      {plan && <>
        <div><h2 className="font-semibold">Plano: {plan.brief.topic}</h2><p className="text-sm text-gray-500">Revise e edite as propostas. Gerar um roteiro não publica nada.</p></div>
        {warnings.length > 0 && <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm"><p className="font-medium">Recortes que merecem diferenciação</p><ul className="list-disc pl-5">{warnings.map(w => <li key={w}>{w}</li>)}</ul><p className="text-xs mt-2">Checagem aproximada de texto; revise também se as entregas são diferentes na prática.</p></div>}
        <button className="btn-primary" disabled={!!busy || !selected.length} onClick={() => generateScripts(selected)}>{busy && busy !== 'plan' ? `Gerando ${PLAN_CHANNELS[busy]?.label || 'roteiros'}...` : `Gerar roteiros selecionados (${selected.length})`}</button>
        {plan.cards.map(card => {
          const output = plan.outputs[card.canal]
          const stale = output && output.signature !== cardSignature(plan.brief, cleanCard(card), persona)
          return <article key={card.canal} className="card p-4 space-y-4" aria-label={PLAN_CHANNELS[card.canal].label}>
            <fieldset disabled={!!busy} className="space-y-3">
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={card.selected} onChange={e => editCard(card.canal, 'selected', e.target.checked)} />{PLAN_CHANNELS[card.canal].label}</label>
              <div className="grid sm:grid-cols-2 gap-3">{editableFields.map(([field, label]) => <label key={field} className="text-xs text-gray-600">{label}<textarea aria-label={label} className="input w-full mt-1" rows={2} value={card[field]} onChange={e => editCard(card.canal, field, e.target.value)} /></label>)}</div>
              <div className="grid sm:grid-cols-2 gap-3">{[['evidencias', 'Evidências necessárias'], ['pendencias', 'Informações que faltam']].map(([field, label]) => <label key={field} className="text-xs text-gray-600">{label}<textarea aria-label={label} className="input w-full mt-1" rows={2} value={card[field].join('\n')} onChange={e => editCard(card.canal, field, e.target.value.split('\n'))} /></label>)}</div>
              {card.pendencias.some(Boolean) && <p className="text-xs text-amber-800">Há informações pendentes. Complete o material ou mantenha a indicação de lacuna; o roteiro não deve inventar o que falta.</p>}
              <label className="block text-xs text-gray-600">Material adicional deste recorte<textarea aria-label="Material adicional deste recorte" className="input w-full mt-1" rows={2} value={card.material} onChange={e => editCard(card.canal, 'material', e.target.value)} /></label>
              <button className="btn-secondary" disabled={!!busy} onClick={() => generateScripts([card.canal])}>{output ? 'Regenerar este roteiro' : 'Gerar este roteiro'}</button>
            </fieldset>
            {channelErrors[card.canal] && <p role="alert" className="text-sm text-red-700">{channelErrors[card.canal]}</p>}
            {output && <>
              {stale && <p role="status" className="text-sm text-amber-800">O recorte mudou depois da geração. Gere novamente para salvar um roteiro alinhado ao plano atual.</p>}
              {output.options ? <SocialFormatOutput result={output.result} options={output.options} /> : <div className="space-y-3" data-testid="compact-script">
                <h3 className="font-semibold">{output.result.titulo}</h3>
                {output.result.blocos.map(b => <div key={b.numero} className="border rounded-xl p-3"><p className="text-xs text-gray-500">{card.canal === 'instagram_carousel' ? 'Slide' : 'Post'} {b.numero}</p>{b.titulo && <h4 className="font-semibold">{b.titulo}</h4>}<p className="whitespace-pre-wrap text-sm">{b.texto}</p>{b.visual && <p className="text-xs text-gray-500 mt-2">Visual: {b.visual}</p>}</div>)}
                {output.result.legenda && <p className="text-sm">Legenda: {output.result.legenda}</p>}
                {!!output.result.revisao?.length && <ul className="list-disc pl-5 text-xs text-amber-800">{output.result.revisao.map((r, i) => <li key={i}>{r}</li>)}</ul>}
              </div>}
              <div className="flex flex-wrap gap-2"><button className="btn-secondary flex gap-2 items-center" onClick={() => copy(card.canal)}><Copy size={14} />{copied === card.canal ? 'Copiado' : 'Copiar roteiro'}</button><button className="btn-secondary flex gap-2 items-center" disabled={!!busy || stale || output.saved} onClick={() => save(card)}><Save size={14} />{output.saved ? 'Salvo no Hub' : 'Salvar rascunho no Hub'}</button></div>
            </>}
          </article>
        })}
      </>}
    </section>
  )
}
