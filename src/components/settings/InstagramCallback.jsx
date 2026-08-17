import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, XCircle } from 'lucide-react'
import { instagramOAuthConnect } from '../../lib/aiService'
import { getAppId, getAppSecret, getRedirectUri, consumeState, saveConnection } from '../../lib/instagramAuth'

export default function InstagramCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error_description') || params.get('error')

    if (oauthError) { setError(oauthError); return }
    if (!code || !consumeState(state)) {
      setError('Falha na verificação de segurança (state inválido). Tente conectar novamente.')
      return
    }

    const appId     = getAppId()
    const appSecret = getAppSecret()
    if (!appId || !appSecret) {
      setError('App ID / App Secret do Meta não encontrados. Configure-os em Configurações antes de conectar.')
      return
    }

    instagramOAuthConnect(appId, appSecret, code, getRedirectUri())
      .then((data) => {
        if (!data.accounts?.length) {
          setError('Login feito, mas nenhuma conta Instagram Business/Creator foi encontrada nas Páginas do Facebook autorizadas.')
          return
        }
        saveConnection(data)
        navigate('/settings?instagram=connected', { replace: true })
      })
      .catch((e) => setError(e.message))
  }, [navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <XCircle className="text-red-500" size={32} />
        <p className="text-sm text-gray-600 max-w-md">{error}</p>
        <button onClick={() => navigate('/settings')} className="btn-secondary text-xs">Voltar para Configurações</button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="animate-spin text-violet-500" size={28} />
    </div>
  )
}
