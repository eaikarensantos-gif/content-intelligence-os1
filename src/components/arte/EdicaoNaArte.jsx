import { useLayoutEffect, useRef, useState } from 'react'

/** Editor sobre o bloco selecionado. O valor só entra no histórico ao concluir a edição. */
export default function EdicaoNaArte({ campo, onConcluir, onCancelar }) {
  const [valor, setValor] = useState(campo.valor)
  const input = useRef(null)
  const cancelado = useRef(false)
  useLayoutEffect(() => { input.current.focus(); input.current.setSelectionRange(campo.valor.length, campo.valor.length) }, [campo])
  return <textarea ref={input} aria-label="Editar texto na arte" value={valor}
    onChange={e => setValor(e.target.value)}
    onBlur={() => { if (!cancelado.current) onConcluir(valor) }}
    onKeyDown={e => {
      e.stopPropagation()
      if (e.key === 'Escape') { e.preventDefault(); cancelado.current = true; onCancelar() }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); input.current.blur() }
    }}
    style={{ position: 'absolute', zIndex: 30, left: campo.x, top: campo.y, width: campo.largura, height: campo.altura, fontSize: campo.fonte, lineHeight: 1.25, resize: 'vertical', maxWidth: '100%' }}
    className="rounded-md border-2 border-orange-500 bg-white text-gray-900 p-2 shadow-lg focus:outline-none" />
}
