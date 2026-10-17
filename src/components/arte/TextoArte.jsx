import { useRef } from 'react'

/** Enter e o botão inserem a mesma quebra, preservada no rascunho e na arte. */
export default function TextoArte({ value, onChange, ...props }) {
  const campo = useRef(null)
  const quebrar = () => {
    const el = campo.current
    const inicio = el.selectionStart
    const fim = el.selectionEnd
    onChange({ target: { value: value.slice(0, inicio) + '\n' + value.slice(fim) } })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(inicio + 1, inicio + 1)
    })
  }
  return (
    <span className="block">
      <textarea {...props} ref={campo} value={value} onChange={onChange} />
      <span className="flex flex-wrap items-center justify-between gap-2 mt-1 text-xs">
        <span className="text-gray-500">Enter para quebrar linha.</span>
        <button type="button" onClick={quebrar} className="text-orange-700 underline">Quebrar linha</button>
      </span>
    </span>
  )
}
