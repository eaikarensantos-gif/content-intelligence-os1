import { useEffect, useState } from 'react'
import { Zap, Plus, Save, Trash2, Loader2, AlertCircle, Check } from 'lucide-react'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

const EVENT_TYPE_LABEL = { comment: 'Comentário', message: 'Mensagem direta', story_reply: 'Resposta de story', mention: 'Menção' }
const MATCH_MODE_LABEL = {
  any_comment_on_post: 'Qualquer comentário num post específico',
  keyword_exact: 'Palavra-chave exata',
  keyword_partial: 'Palavra-chave parcial (contém)',
  first_message: 'Primeira mensagem do contato',
}
const MATCH_MODE_HELP = {
  any_comment_on_post: 'Precisa do ID do post/reel — pega esse ID nos detalhes do post (via api/contacts ou no painel do Instagram).',
  keyword_exact: 'O texto do comentário/mensagem precisa ser exatamente essa palavra/frase (sem diferenciar maiúsculas).',
  keyword_partial: 'Dispara se essa palavra aparecer em qualquer parte do texto.',
  first_message: 'Dispara só na primeira vez que esse contato manda mensagem — ignorado se ele já existe na base.',
}

const EMPTY_RULE = {
  name: '',
  active: true,
  event_type: 'comment',
  match_mode: 'keyword_partial',
  match_value: '',
  post_id: '',
  response_text: '',
  tag_to_apply: '',
  flow_id: '',
}

export default function DmTriggerRules() {
  const db = getSupabase()

  const [rules, setRules] = useState([])
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_RULE)
  const [responseType, setResponseType] = useState('message') // 'message' | 'flow'
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [formError, setFormError] = useState(null)

  const load = async () => {
    if (!db) return
    setLoading(true)
    const [rulesRes, flowsRes] = await Promise.all([
      db.from('ig_trigger_rules').select('*').order('created_at', { ascending: false }),
      db.from('ig_flows').select('id, name, status').order('created_at', { ascending: false }),
    ])
    if (rulesRes.error) setLoadError(rulesRes.error.message)
    else { setRules(rulesRes.data || []); setLoadError(null) }
    if (!flowsRes.error) setFlows(flowsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [] ) // eslint-disable-line react-hooks/exhaustive-deps

  const selectRule = (rule) => {
    setSelectedId(rule?.id || null)
    setForm(
      rule
        ? {
            name: rule.name || '',
            active: rule.active,
            event_type: rule.event_type,
            match_mode: rule.match_mode,
            match_value: rule.match_value || '',
            post_id: rule.post_id || '',
            response_text: rule.response_text || '',
            tag_to_apply: rule.tag_to_apply || '',
            flow_id: rule.flow_id || '',
          }
        : EMPTY_RULE
    )
    setResponseType(rule?.flow_id ? 'flow' : 'message')
    setFormError(null)
    setSaveMsg(null)
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!db) return
    if (!form.name.trim()) { setFormError('Dá um nome pra regra.'); return }
    if (responseType === 'message' && !form.response_text.trim()) { setFormError('Escreve a mensagem de resposta ou troca pra "Fluxo completo".'); return }
    if (responseType === 'flow' && !form.flow_id) { setFormError('Escolhe um fluxo ou troca pra "Mensagem simples".'); return }
    if (form.match_mode === 'any_comment_on_post' && !form.post_id.trim()) { setFormError('Esse modo precisa do ID do post.'); return }
    if ((form.match_mode === 'keyword_exact' || form.match_mode === 'keyword_partial') && !form.match_value.trim()) { setFormError('Escreve a palavra-chave.'); return }

    setFormError(null)
    setSaving(true)
    setSaveMsg(null)

    const payload = {
      name: form.name.trim(),
      active: form.active,
      event_type: form.event_type,
      match_mode: form.match_mode,
      match_value: form.match_value.trim() || null,
      post_id: form.post_id.trim() || null,
      response_text: responseType === 'message' ? form.response_text.trim() : '',
      tag_to_apply: form.tag_to_apply.trim() || null,
      flow_id: responseType === 'flow' ? form.flow_id : null,
    }

    const { data, error } = selectedId
      ? await db.from('ig_trigger_rules').update(payload).eq('id', selectedId).select().maybeSingle()
      : await db.from('ig_trigger_rules').insert(payload).select().maybeSingle()

    setSaving(false)
    if (error) { setSaveMsg({ type: 'error', text: error.message }); return }
    setSaveMsg({ type: 'success', text: 'Salvo!' })
    setSelectedId(data.id)
    await load()
  }

  const handleDelete = async () => {
    if (!db || !selectedId) return
    if (!window.confirm(`Apagar a regra "${form.name}"?`)) return
    const { error } = await db.from('ig_trigger_rules').delete().eq('id', selectedId)
    if (error) { setSaveMsg({ type: 'error', text: error.message }); return }
    selectRule(null)
    await load()
  }

  const toggleActive = async (rule) => {
    if (!db) return
    const { error } = await db.from('ig_trigger_rules').update({ active: !rule.active }).eq('id', rule.id)
    if (!error) await load()
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="card p-6 flex items-center gap-3 text-sm text-gray-600">
          <AlertCircle size={18} className="text-orange-500 shrink-0" />
          Configure o Supabase em Configurações antes de gerenciar regras de gatilho.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2"><Zap size={20} className="text-orange-500" /> Regras de Gatilho</h1>
          <p className="text-sm text-gray-500 mt-1">O que dispara uma resposta automática — comentário, DM, palavra-chave.</p>
        </div>
        <button className="btn-primary" onClick={() => selectRule(null)}>
          <Plus size={16} /> Nova regra
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Lista */}
        <div className="card p-3 space-y-1 h-fit">
          {loading && <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 size={18} className="animate-spin" /></div>}
          {loadError && <div className="text-xs text-red-600 p-2">{loadError}</div>}
          {!loading && rules.length === 0 && <div className="text-xs text-gray-400 p-2">Nenhuma regra ainda.</div>}
          {rules.map((rule) => (
            <div key={rule.id} className={`rounded-lg border ${selectedId === rule.id ? 'bg-orange-100 border-orange-200' : 'border-transparent hover:bg-gray-50'}`}>
              <button onClick={() => selectRule(rule)} className="w-full text-left px-3 py-2.5">
                <div className={`font-medium text-sm truncate ${selectedId === rule.id ? 'text-orange-800' : 'text-gray-700'}`}>{rule.name}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{EVENT_TYPE_LABEL[rule.event_type] || rule.event_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    {rule.active ? 'Ativa' : 'Desativada'}
                  </span>
                  {rule.flow_id && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">Fluxo</span>}
                </div>
              </button>
              <div className="px-3 pb-2">
                <button onClick={() => toggleActive(rule)} className="text-[11px] text-gray-500 hover:text-orange-700">
                  {rule.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ex: Reels lançamento — link do material" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pb-2 whitespace-nowrap">
              <input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
              Ativa
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de evento</label>
              <select className="select" value={form.event_type} onChange={(e) => setField('event_type', e.target.value)}>
                {Object.entries(EVENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Como casar</label>
              <select className="select" value={form.match_mode} onChange={(e) => setField('match_mode', e.target.value)}>
                {Object.entries(MATCH_MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">{MATCH_MODE_HELP[form.match_mode]}</p>

          {form.match_mode === 'any_comment_on_post' && (
            <div>
              <label className="label">ID do post/reel</label>
              <input className="input" value={form.post_id} onChange={(e) => setField('post_id', e.target.value)} placeholder="Ex: 17895..." />
            </div>
          )}
          {(form.match_mode === 'keyword_exact' || form.match_mode === 'keyword_partial') && (
            <div>
              <label className="label">Palavra-chave</label>
              <input className="input" value={form.match_value} onChange={(e) => setField('match_value', e.target.value)} placeholder="Ex: quero o material" />
            </div>
          )}

          <div>
            <label className="label">Tag aplicada ao contato (opcional)</label>
            <input className="input" value={form.tag_to_apply} onChange={(e) => setField('tag_to_apply', e.target.value)} placeholder="Ex: lead-lancamento" />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="label">O que fazer quando bater</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setResponseType('message')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${responseType === 'message' ? 'bg-orange-100 border-orange-200 text-orange-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                Mensagem simples
              </button>
              <button
                onClick={() => setResponseType('flow')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${responseType === 'flow' ? 'bg-violet-100 border-violet-200 text-violet-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                Fluxo completo
              </button>
            </div>

            {responseType === 'message' ? (
              <textarea
                className="input"
                rows={4}
                value={form.response_text}
                onChange={(e) => setField('response_text', e.target.value)}
                placeholder="Texto que vai ser enviado por DM"
              />
            ) : (
              <select className="select" value={form.flow_id} onChange={(e) => setField('flow_id', e.target.value)}>
                <option value="">Escolhe um fluxo...</option>
                {flows.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.status})</option>)}
              </select>
            )}
          </div>

          {formError && <div className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={12} /> {formError}</div>}

          <div className="flex items-center gap-2 pt-2">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
            </button>
            {selectedId && (
              <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={handleDelete}>
                <Trash2 size={14} /> Apagar
              </button>
            )}
            {saveMsg && (
              <span className={`flex items-center gap-1.5 text-xs ${saveMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {saveMsg.type === 'error' ? <AlertCircle size={12} /> : <Check size={12} />} {saveMsg.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
