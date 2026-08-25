import { useEffect, useState } from 'react'
import { Workflow, Plus, Save, Trash2, Play, Loader2, AlertCircle, Check, X } from 'lucide-react'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

// Fluxo novo, em branco — serve de ponto de partida pro editor JSON. O
// formato (start_node + nodes, tipos message/quick_reply/collect_input/
// condition/delay/action/end) é o mesmo que api/instagramWebhook.js e
// src/lib/dmFlowEngine.js já executam em produção.
const EMPTY_DEFINITION = JSON.stringify(
  {
    start_node: 'n1',
    nodes: {
      n1: { type: 'message', text: 'Escreva sua mensagem aqui', next: 'n2' },
      n2: { type: 'end' },
    },
  },
  null,
  2
)

const STATUS_LABEL = { draft: 'Rascunho', active: 'Ativo', archived: 'Arquivado' }
const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-400',
}

export default function DmFlows() {
  const db = getSupabase()

  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('draft')
  const [definitionText, setDefinitionText] = useState(EMPTY_DEFINITION)
  const [jsonError, setJsonError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const [replies, setReplies] = useState([])
  const [replyInput, setReplyInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testError, setTestError] = useState(null)

  const loadFlows = async () => {
    if (!db) return
    setLoading(true)
    const { data, error } = await db.from('ig_flows').select('*').order('created_at', { ascending: false })
    if (error) setLoadError(error.message)
    else { setFlows(data || []); setLoadError(null) }
    setLoading(false)
  }

  useEffect(() => { loadFlows() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectFlow = (flow) => {
    setSelectedId(flow?.id || null)
    setName(flow?.name || '')
    setStatus(flow?.status || 'draft')
    setDefinitionText(flow ? JSON.stringify(flow.definition, null, 2) : EMPTY_DEFINITION)
    setJsonError(null)
    setSaveMsg(null)
    setTestResult(null)
    setTestError(null)
    setReplies([])
    setReplyInput('')
  }

  const handleSave = async () => {
    if (!db) return
    let definition
    try {
      definition = JSON.parse(definitionText)
    } catch (e) {
      setJsonError(`JSON inválido: ${e.message}`)
      return
    }
    if (!definition.start_node || !definition.nodes) {
      setJsonError('O fluxo precisa de "start_node" e "nodes".')
      return
    }
    setJsonError(null)
    setSaving(true)
    setSaveMsg(null)

    const payload = { name: name.trim() || 'Sem nome', status, definition }
    const { data, error } = selectedId
      ? await db.from('ig_flows').update(payload).eq('id', selectedId).select().maybeSingle()
      : await db.from('ig_flows').insert(payload).select().maybeSingle()

    setSaving(false)
    if (error) { setSaveMsg({ type: 'error', text: error.message }); return }
    setSaveMsg({ type: 'success', text: 'Salvo!' })
    setSelectedId(data.id)
    await loadFlows()
  }

  const handleDelete = async () => {
    if (!db || !selectedId) return
    if (!window.confirm(`Apagar o fluxo "${name}"? Isso não apaga conversas já em andamento com ele.`)) return
    const { error } = await db.from('ig_flows').delete().eq('id', selectedId)
    if (error) { setSaveMsg({ type: 'error', text: error.message }); return }
    selectFlow(null)
    await loadFlows()
  }

  const handleAddReply = () => {
    if (!replyInput.trim()) return
    setReplies((r) => [...r, replyInput.trim()])
    setReplyInput('')
  }

  const handleTest = async () => {
    if (!selectedId) { setTestError('Salva o fluxo antes de testar.'); return }
    setTesting(true)
    setTestError(null)
    setTestResult(null)
    try {
      const res = await fetch('/api/previewFlow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: selectedId, replies }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao testar o fluxo.')
      setTestResult(data)
    } catch (e) {
      setTestError(e.message)
    } finally {
      setTesting(false)
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="card p-6 flex items-center gap-3 text-sm text-gray-600">
          <AlertCircle size={18} className="text-orange-500 shrink-0" />
          Configure o Supabase em Configurações antes de gerenciar fluxos de DM.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2"><Workflow size={20} className="text-orange-500" /> Fluxos de DM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Estrutura em JSON — os mesmos tipos de nó que o webhook já executa em produção (message, quick_reply, collect_input, condition, delay, action, end).
          </p>
        </div>
        <button className="btn-primary" onClick={() => selectFlow(null)}>
          <Plus size={16} /> Novo fluxo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Lista */}
        <div className="card p-3 space-y-1 h-fit">
          {loading && <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 size={18} className="animate-spin" /></div>}
          {loadError && <div className="text-xs text-red-600 p-2">{loadError}</div>}
          {!loading && flows.length === 0 && <div className="text-xs text-gray-400 p-2">Nenhum fluxo ainda.</div>}
          {flows.map((flow) => (
            <button
              key={flow.id}
              onClick={() => selectFlow(flow)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selectedId === flow.id ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'hover:bg-gray-50 text-gray-700 border border-transparent'
              }`}
            >
              <div className="font-medium truncate">{flow.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[flow.status]}`}>{STATUS_LABEL[flow.status] || flow.status}</span>
                <span className="text-[10px] text-gray-400">v{flow.version}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Qualificação de lead" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Rascunho</option>
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Definição (JSON)</label>
              <textarea
                className="input font-mono text-xs"
                rows={16}
                spellCheck={false}
                value={definitionText}
                onChange={(e) => { setDefinitionText(e.target.value); setJsonError(null) }}
              />
              {jsonError && <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5"><AlertCircle size={12} /> {jsonError}</div>}
            </div>

            <div className="flex items-center gap-2">
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

          {/* Testar */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Testar (sem enviar mensagem real)</h2>
              <button className="btn-secondary" onClick={handleTest} disabled={testing || !selectedId}>
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Rodar
              </button>
            </div>
            {!selectedId && <p className="text-xs text-gray-400">Salva o fluxo primeiro pra poder testar.</p>}

            <div>
              <label className="label">Respostas simuladas do contato (na ordem que o fluxo for perguntando)</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddReply() } }}
                  placeholder="Ex: sim"
                />
                <button className="btn-secondary shrink-0" onClick={handleAddReply}>Adicionar</button>
              </div>
              {replies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {replies.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {r}
                      <button onClick={() => setReplies((list) => list.filter((_, idx) => idx !== i))}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {testError && <div className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={12} /> {testError}</div>}

            {testResult && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="text-xs text-gray-500">
                  Status final: <span className="font-medium text-gray-700">{testResult.status}</span>
                  {testResult.status === 'waiting_input' && ' (esperando mais uma resposta)'}
                </div>
                {testResult.transcript.map((item, i) => (
                  <div key={i} className="text-sm">
                    {item.type === 'send_message' && (
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-md">
                        {item.text}
                        {item.options?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.options.map((o, j) => (
                              <span key={j} className="text-[11px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">{o.label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {item.type === 'apply_tag' && <div className="text-xs text-gray-500 italic">→ tag aplicada: {item.tag}</div>}
                    {item.type === 'set_field' && <div className="text-xs text-gray-500 italic">→ campo salvo: {item.key} = {item.value}</div>}
                    {item.type === 'call_webhook' && <div className="text-xs text-gray-500 italic">→ webhook chamado: {item.url}</div>}
                    {item.type === 'error' && <div className="text-xs text-red-600 italic">→ erro: {item.message}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
