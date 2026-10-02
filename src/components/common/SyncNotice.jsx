import { Link } from 'react-router-dom'
import useStore from '../../store/useStore'

export default function SyncNotice() {
  const status = useStore(s => s.syncStatus)
  const error = useStore(s => s.syncError)
  const lastSavedAt = useStore(s => s.lastSavedAt)
  const retry = useStore(s => s.retrySave)
  if (status === 'idle') return null
  const failed = status === 'error'
  return <div role={failed ? 'alert' : 'status'} className={`px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1 border-b ${failed ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
    <span>{failed ? error : status === 'saving' ? 'Salvando alterações no banco…' : status === 'pending' ? 'Alterações aguardando gravação no banco…' : `Gravação no banco confirmada às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}.`}</span>
    {failed && <><button type="button" onClick={retry} className="underline font-semibold">Tentar salvar novamente</button><Link to="/settings" className="underline">Configurações e backup</Link></>}
  </div>
}
