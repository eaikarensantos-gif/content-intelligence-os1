import { useState, useEffect } from 'react'
import { Shield, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Monitor, Globe, Clock, Mail, RefreshCw } from 'lucide-react'
import { getAccessAttempts, clearAccessAttempts } from './LoginGate'

export default function AccessLog() {
  const [attempts, setAttempts] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setAttempts(getAccessAttempts().reverse()) // mais recentes primeiro
  }, [])

  const refresh = () => setAttempts(getAccessAttempts().reverse())

  const handleClear = () => {
    if (confirm('Limpar todo o registro de tentativas de acesso?')) {
      clearAccessAttempts()
      setAttempts([])
    }
  }

  const failed = attempts.filter(a => !a.success)
  const displayed = showAll ? attempts : attempts.slice(0, 20)

  if (attempts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-orange-600" />
          <h3 className="font-semibold text-gray-900">Registro de Acessos</h3>
        </div>
        <p className="text-sm text-gray-400">Nenhuma tentativa de acesso registrada.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-orange-600" />
          <h3 className="font-semibold text-gray-900">Registro de Acessos</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {attempts.length} total
          </span>
          {failed.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {failed.length} falhas
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={refresh}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Atualizar">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            title="Limpar registro">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {failed.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
            <XCircle size={14} />
            {failed.length} tentativa{failed.length > 1 ? 's' : ''} de acesso não autorizado
          </div>
          <div className="flex flex-wrap gap-2">
            {[...new Set(failed.map(a => a.email))].map(email => (
              <span key={email} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg flex items-center gap-1">
                <Mail size={10} /> {email}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {displayed.map((a, i) => {
          const isExpanded = expanded === i
          const dt = new Date(a.timestamp)
          const timeStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={i}
              className={`rounded-xl border transition-all ${
                a.success
                  ? 'border-gray-100 bg-gray-50/50'
                  : 'border-red-100 bg-red-50/50'
              }`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                {a.success ? (
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                ) : (
                  <XCircle size={14} className="text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-800 truncate">{a.email || '—'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      a.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {a.type === 'setup' ? 'Cadastro' : a.success ? 'Login OK' : 'Falha'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{timeStr}</span>
                </div>
                {isExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0.5 border-t border-gray-100 text-[11px] space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Monitor size={10} className="text-gray-400" />
                      <span className="truncate">{a.platform || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Globe size={10} className="text-gray-400" />
                      <span className="truncate">{a.timezone || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Clock size={10} className="text-gray-400" />
                      <span>{a.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="text-gray-400">Tela:</span>
                      <span>{a.screenSize || '—'}</span>
                    </div>
                  </div>
                  {a.userAgent && (
                    <div className="text-gray-400 bg-gray-100 rounded-lg px-2 py-1.5 break-all">
                      {a.userAgent}
                    </div>
                  )}
                  {a.referrer && a.referrer !== 'direct' && (
                    <div className="text-gray-500">
                      <span className="text-gray-400">Referrer: </span>{a.referrer}
                    </div>
                  )}
                  {a.reason && (
                    <div className="text-red-600">
                      <span className="text-red-400">Motivo: </span>
                      {a.reason === 'wrong_email' ? 'Email incorreto' :
                       a.reason === 'wrong_password' ? 'Senha incorreta' : a.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {attempts.length > 20 && !showAll && (
        <button onClick={() => setShowAll(true)}
          className="mt-3 w-full text-xs text-orange-600 hover:text-orange-700 font-medium py-2 bg-orange-50 rounded-lg transition-colors">
          Ver todos ({attempts.length} registros)
        </button>
      )}
    </div>
  )
}
