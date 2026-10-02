// Serializa gravações: uma resposta antiga não pode chegar depois da nova.
export function createSaveQueue({ getState, save, onStatus, delay = 2500 }) {
  let timer = null
  let pending = false
  let running = false

  const flush = async () => {
    clearTimeout(timer)
    timer = null
    if (running || !pending) return
    running = true
    pending = false
    onStatus({ status: 'saving', error: '' })
    try {
      const saved = await save(getState())
      if (saved === false) {
        pending = true
        onStatus({ status: 'error', error: 'Banco não configurado. A gravação não foi enviada.' })
        return
      }
      onStatus({ status: pending ? 'pending' : 'saved', error: '', lastSavedAt: new Date().toISOString() })
    } catch {
      pending = true
      // Não mostrar mensagens do servidor que possam conter valores do registro.
      onStatus({ status: 'error', error: 'Não foi possível confirmar a gravação no banco. Confira a conexão e tente novamente.' })
      return
    } finally {
      running = false
    }
    if (pending) await flush()
  }

  return {
    schedule() {
      pending = true
      clearTimeout(timer)
      onStatus({ status: 'pending', error: '' })
      timer = setTimeout(flush, delay)
    },
    flush,
    retry() { pending = true; return flush() },
  }
}
