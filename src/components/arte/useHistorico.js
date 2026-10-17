import { useCallback, useReducer, useRef } from 'react'

export const iniciarHistorico = (presente) => ({ passado: [], presente, futuro: [], grupo: null })

export function reduzirHistorico(estado, acao) {
  if (acao.tipo === 'reset') return iniciarHistorico(acao.valor)
  if (acao.tipo === 'desfazer') {
    if (!estado.passado.length) return estado
    return { passado: estado.passado.slice(0, -1), presente: estado.passado.at(-1), futuro: [estado.presente, ...estado.futuro], grupo: null }
  }
  if (acao.tipo === 'refazer') {
    if (!estado.futuro.length) return estado
    return { passado: [...estado.passado, estado.presente], presente: estado.futuro[0], futuro: estado.futuro.slice(1), grupo: null }
  }
  const presente = typeof acao.valor === 'function' ? acao.valor(estado.presente) : acao.valor
  if (presente === estado.presente) return estado
  // Navegar ou exportar slides não é uma edição.
  if (acao.tipo === 'navegar') return { ...estado, presente, grupo: null }
  const agrupar = acao.grupo != null && acao.grupo === estado.grupo
  return { passado: agrupar ? estado.passado : [...estado.passado, estado.presente].slice(-50), presente, futuro: [], grupo: acao.grupo ?? null }
}

export default function useHistorico(inicial) {
  const [estado, dispatch] = useReducer(reduzirHistorico, inicial, iniciarHistorico)
  const grupo = useRef(null)
  const sequencia = useRef(0)
  const iniciarGrupo = useCallback((tipo) => { grupo.current = { tipo, id: ++sequencia.current } }, [])
  const encerrarGrupo = useCallback((tipo) => { if (grupo.current?.tipo === tipo) grupo.current = null }, [])
  const setProjeto = useCallback((valor) => dispatch({ tipo: 'editar', valor, grupo: grupo.current?.id }), [])
  const navegar = useCallback((valor) => dispatch({ tipo: 'navegar', valor }), [])
  const reset = useCallback((valor) => { grupo.current = null; dispatch({ tipo: 'reset', valor }) }, [])
  const desfazer = useCallback(() => { grupo.current = null; dispatch({ tipo: 'desfazer' }) }, [])
  const refazer = useCallback(() => { grupo.current = null; dispatch({ tipo: 'refazer' }) }, [])
  return { projeto: estado.presente, setProjeto, navegar, reset, desfazer, refazer, podeDesfazer: estado.passado.length > 0, podeRefazer: estado.futuro.length > 0, iniciarGrupo, encerrarGrupo }
}
