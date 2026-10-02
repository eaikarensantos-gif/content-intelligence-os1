import { useEffect, useState } from 'react'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

export default function DmExecutionStatus() {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('idle')
  const [checkedAt, setCheckedAt] = useState(null)
  async function refresh() {
    if (!isSupabaseConfigured()) { setStatus('unconfigured'); return }
    setStatus('loading')
    try {
      const { data, error } = await getSupabase().from('ig_events').select('id,event_type,status,created_at,processed_at').order('created_at', { ascending: false }).limit(20)
      if (error) throw error
      setEvents(data || [])
      setCheckedAt(new Date().toISOString())
      setStatus('loaded')
    } catch { setStatus('error') }
  }
  useEffect(() => { refresh() }, [])
  const labels = { received: 'Recebido, aguardando processamento', sent: 'Processado com envio registrado', error: 'Falha no processamento', skipped: 'Ignorado pela regra' }
  return <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
    <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Execuções recentes</h3><button onClick={refresh} disabled={status === 'loading'} className="underline text-orange-700 disabled:opacity-50">{status === 'loading' ? 'Consultando...' : 'Atualizar registros'}</button></div>
    {status === 'unconfigured' && <p className="mt-2">Configure a conexão com o banco para consultar as execuções.</p>}
    {status === 'error' && <p role="alert" className="mt-2 text-red-700">Não foi possível consultar o histórico. Confira a conexão e a disponibilidade da tabela de eventos. O status das entregas não foi confirmado.</p>}
    {status === 'loaded' && <>
      <p className="mt-2">Consulta em {new Date(checkedAt).toLocaleString('pt-BR')}. {events.length ? 'Últimos 20 eventos, no máximo. Registro de envio não comprova leitura pelo destinatário.' : 'Nenhum evento disponível. Isso não confirma que as regras estão funcionando.'}</p>
      {!!events.length && <details className="mt-2"><summary>Ver eventos</summary><ul className="space-y-1 mt-2">{events.map(event => <li key={event.id}>{new Date(event.processed_at || event.created_at).toLocaleString('pt-BR')} · {event.event_type} · {labels[event.status] || event.status}</li>)}</ul></details>}
    </>}
  </section>
}
