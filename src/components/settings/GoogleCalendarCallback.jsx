import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  consumeGoogleState, getGoogleCalendarRedirectUri, getGoogleClientId,
  getGoogleClientSecret, saveGoogleConnection,
} from '../../lib/googleCalendarAuth'

export default function GoogleCalendarCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code || !consumeGoogleState(params.get('state'))) {
      setError('Não foi possível validar a conexão com o Google.')
      return
    }
    fetch('/api/googleCalendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'exchange', code,
        clientId: getGoogleClientId(),
        clientSecret: getGoogleClientSecret(),
        redirectUri: getGoogleCalendarRedirectUri(),
      }),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Falha ao conectar.')
      saveGoogleConnection(data)
      navigate('/tasks?view=calendar&google=connected', { replace: true })
    }).catch((err) => setError(err.message))
  }, [navigate])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-8 text-center max-w-sm space-y-3">
        {error ? <AlertCircle className="mx-auto text-red-500" /> : <Loader2 className="mx-auto animate-spin text-blue-500" />}
        <p className="text-sm text-gray-700">{error || 'Conectando sua agenda do Google...'}</p>
        {error && <button onClick={() => navigate('/settings')} className="btn-secondary text-xs"><CheckCircle2 size={12} /> Voltar às configurações</button>}
      </div>
    </div>
  )
}
