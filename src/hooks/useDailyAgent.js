// src/hooks/useDailyAgent.js
// Roda o agente uma vez por dia. Verifica no mount se já executou hoje.
// Se não rodou e são 10h ou mais, dispara automaticamente.
// Expõe também `runNow` pra botão manual.

import { useState, useEffect, useCallback } from 'react'
import { runDailyIdeasAgent, getDailyAgentStatus } from '../utils/dailyAgent'
import useStore from '../store/useStore'

export default function useDailyAgent() {
  const addIdea = useStore((s) => s.addIdea)
  const posicionamento = useStore((s) => s.posicionamento)
  const [status, setStatus] = useState(() => getDailyAgentStatus())
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [newCount, setNewCount] = useState(0)

  const execute = useCallback(async () => {
    setRunning(true)
    setError(null)
    setNewCount(0)
    try {
      const ideas = await runDailyIdeasAgent(posicionamento)
      ideas.forEach((idea) => addIdea(idea))
      setNewCount(ideas.length)
      setStatus(getDailyAgentStatus())
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }, [addIdea, posicionamento])

  // Auto-disparo: roda no mount se não rodou hoje e são >= 10h
  useEffect(() => {
    const alreadyRan = getDailyAgentStatus()
    if (alreadyRan) return

    const hasApiKey = !!localStorage.getItem('cio-anthropic-key')
    if (!hasApiKey) return

    const hour = new Date().getHours()
    if (hour >= 10) {
      execute()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,       // { ranAt, count, pilares } | null
    running,      // boolean — está executando agora
    error,        // string | null
    newCount,     // quantas ideias foram adicionadas na última execução
    runNow: execute, // disparo manual
  }
}
